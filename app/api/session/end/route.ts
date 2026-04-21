import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/server/tenant-context";
import type { DebtRow, HouseholdRow } from "@/lib/server/row-types";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: household } = await supabase
      .from("household_profiles")
      .select(
        "id, display_name, monthly_income, fixed_obligations, buffer_balance, plan_commitment_score",
      )
      .eq("user_id", user.id)
      .maybeSingle<HouseholdRow>();

    if (!household) {
      return NextResponse.json({ ok: true });
    }

    const { data: debts } = await supabase
      .from("debt_instruments")
      .select("id, label, debt_type, balance, apr, min_payment, is_active")
      .eq("household_id", household.id)
      .returns<DebtRow[]>();

    const { count: raeExecutionCount } = await supabase
      .from("rae_executions")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.id);

    const { error: auditInsertError } = await supabase.from("session_audit_log").insert({
      user_id: user.id,
      tenant_id: getCurrentTenantId(),
      email: user.email ?? null,
      session_end_at: new Date().toISOString(),
      household_snapshot: household,
      debts_snapshot: debts ?? [],
      rae_execution_count: raeExecutionCount ?? 0,
    });

    if (auditInsertError) {
      console.error("Failed to insert session audit log", auditInsertError);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
