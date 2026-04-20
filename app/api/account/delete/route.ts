import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getCurrentTenantId } from "@/lib/server/tenant-context";

export const dynamic = "force-dynamic";

type DeleteRequestBody = {
  password?: string;
};

export async function POST(request: Request) {
  // Step 0 — verify the active session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 1 — verify the user's password before proceeding
  // This prevents account deletion from an unattended active session.
  const body = (await request.json()) as DeleteRequestBody;
  if (!body.password) {
    return NextResponse.json(
      { error: "Password is required to delete your account." },
      { status: 400 },
    );
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: body.password,
  });

  if (passwordError) {
    return NextResponse.json(
      { error: "Incorrect password. Account was not deleted." },
      { status: 403 },
    );
  }

  // Step 2 — confirm service role key is present before starting any destructive work
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not configured. Account deletion is unavailable.");
    return NextResponse.json(
      { error: "Account deletion is not available on this server. Contact support." },
      { status: 503 },
    );
  }

  try {
    // Step 3 — load household and debt data for the audit snapshot
    const { data: household, error: householdError } = await supabase
      .from("household_profiles")
      .select(
        "id, display_name, monthly_income, fixed_obligations, buffer_balance, plan_commitment_score",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (householdError) {
      console.error("Failed to load household for audit snapshot:", householdError.message);
      return NextResponse.json(
        { error: "Failed to load account data. Deletion aborted." },
        { status: 500 },
      );
    }

    const { data: debts, error: debtsError } = household
      ? await supabase
          .from("debt_instruments")
          .select("id, label, debt_type, balance, apr, min_payment, is_active")
          .eq("household_id", household.id)
      : { data: [], error: null };

    if (debtsError) {
      console.error("Failed to load debts for audit snapshot:", debtsError.message);
      return NextResponse.json(
        { error: "Failed to load debt data. Deletion aborted." },
        { status: 500 },
      );
    }

    const { count: raeExecutionCount, error: raeCountError } = await supabase
      .from("rae_executions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household?.id ?? "");

    if (raeCountError) {
      console.error("Failed to load execution count for audit snapshot:", raeCountError.message);
      return NextResponse.json(
        { error: "Failed to load execution history. Deletion aborted." },
        { status: 500 },
      );
    }

    // Step 4 — write the final audit snapshot before any deletes
    const { error: auditError } = await supabase.from("session_audit_log").insert({
      user_id: user.id,
      tenant_id: getCurrentTenantId(),
      email: user.email ?? null,
      session_end_at: new Date().toISOString(),
      household_snapshot: household ?? {},
      debts_snapshot: debts ?? [],
      rae_execution_count: raeExecutionCount ?? 0,
    });

    if (auditError) {
      console.error("Failed to write audit snapshot:", auditError.message);
      return NextResponse.json(
        { error: "Failed to write audit record. Deletion aborted." },
        { status: 500 },
      );
    }

    // Step 5 — delete working data rows in dependency order
    if (household) {
      const { error: raeDeleteError } = await supabase
        .from("rae_executions")
        .delete()
        .eq("household_id", household.id);
      if (raeDeleteError) {
        console.error("Failed to delete rae_executions:", raeDeleteError.message);
        return NextResponse.json(
          { error: "Failed to delete execution history. Deletion aborted." },
          { status: 500 },
        );
      }

      const { error: debtDeleteError } = await supabase
        .from("debt_instruments")
        .delete()
        .eq("household_id", household.id);
      if (debtDeleteError) {
        console.error("Failed to delete debt_instruments:", debtDeleteError.message);
        return NextResponse.json(
          { error: "Failed to delete debt data. Deletion aborted." },
          { status: 500 },
        );
      }

      const { error: householdDeleteError } = await supabase
        .from("household_profiles")
        .delete()
        .eq("user_id", user.id);
      if (householdDeleteError) {
        console.error("Failed to delete household_profiles:", householdDeleteError.message);
        return NextResponse.json(
          { error: "Failed to delete household profile. Deletion aborted." },
          { status: 500 },
        );
      }
    }

    // Step 6 — delete the auth user via service role client
    // IMPORTANT: This is the only authorised use of the service role key in runtime code.
    // The admin client is instantiated here only, with session persistence disabled,
    // and is not reused or exported.
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (authDeleteError) {
      console.error("Failed to delete auth user:", authDeleteError.message);
      return NextResponse.json(
        { error: "Profile data was deleted but your login could not be removed. Contact support." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Account deletion failed unexpectedly:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
