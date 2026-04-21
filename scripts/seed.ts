import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

// TODO: generate Supabase types via `supabase gen types typescript` and replace `any` casts with a typed client.

type SeedDebt = {
  label: string;
  lender: string | null;
  debt_type: "CARD" | "LOAN" | "BNPL" | "OVERDRAFT" | "OTHER";
  balance: number; // pence
  apr: number; // decimal
  min_payment: number; // pence
};

type SeedHousehold = {
  email: string;
  password: string;
  display_name: string;
  monthly_income: number; // pence/cents
  income_volatility: number; // pence/cents
  fixed_obligations: number; // pence/cents (excludes min payments)
  buffer_balance: number; // pence/cents
  plan_commitment_score: number; // 0-1
  tenant_id: string;
  region: string;
  currency: string;
  debts: SeedDebt[];
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const households: SeedHousehold[] = [
  {
    // Household 1 — canonical spec example
    email: "sarah.james+synthetic@rail-prototype.local",
    password: "RailPrototype!234",
    display_name: "Sarah & James",
    monthly_income: 280_000,
    income_volatility: 0,
    fixed_obligations: 225_500,
    buffer_balance: 90_000,
    plan_commitment_score: 0.5,
    tenant_id: "00000000-0000-0000-0000-000000001001",
    region: "GB",
    currency: "GBP",
    debts: [
      {
        label: "Credit Card A (Barclaycard)",
        lender: "Barclaycard",
        debt_type: "CARD",
        balance: 210_000,
        apr: 0.3490,
        min_payment: 4_200,
      },
      {
        label: "Credit Card B (HSBC)",
        lender: "HSBC",
        debt_type: "CARD",
        balance: 190_000,
        apr: 0.2250,
        min_payment: 3_800,
      },
      {
        label: "Personal Loan (Nationwide)",
        lender: "Nationwide",
        debt_type: "LOAN",
        balance: 120_000,
        apr: 0.1280,
        min_payment: 2_500,
      },
    ],
  },
  {
    // Household 2 — aspirational Stage 3 demo
    email: "mark.lisa+synthetic@rail-prototype.local",
    password: "RailPrototype!234",
    display_name: "Mark & Lisa",
    monthly_income: 320_000,
    income_volatility: 0,
    fixed_obligations: 250_000,
    buffer_balance: 346_000,
    plan_commitment_score: 0.85,
    tenant_id: "00000000-0000-0000-0000-000000001001",
    region: "GB",
    currency: "GBP",
    debts: [
      {
        label: "Car Loan (Lloyds)",
        lender: "Lloyds",
        debt_type: "LOAN",
        balance: 420_000,
        apr: 0.0590,
        min_payment: 9_500,
      },
    ],
  },
  {
    // Household 3 — US region validation household (Stage B)
    email: "alex.morgan+synthetic@rail-prototype.local",
    password: "RailPrototype!234",
    display_name: "Alex & Morgan",
    monthly_income: 520_000, // $5,200/mo in cents
    income_volatility: 0,
    fixed_obligations: 380_000, // $3,800/mo in cents
    buffer_balance: 120_000, // $1,200 in cents
    plan_commitment_score: 0.65,
    tenant_id: "00000000-0000-0000-0000-000000001001",
    region: "US",
    currency: "USD",
    debts: [
      {
        label: "Credit Card (Chase)",
        lender: "Chase",
        debt_type: "CARD" as const,
        balance: 340_000, // $3,400
        apr: 0.2299,
        min_payment: 6_800, // $68/mo minimum
      },
    ],
  },
];

async function findUserIdByEmail(
  supabase: SupabaseClient,
  email: string,
) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user?.id ?? null;
}

async function ensureAuthUser(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  const existingId = await findUserIdByEmail(supabase, email);
  if (existingId) return existingId;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error(`Failed to create user for ${email}`);
  return data.user.id;
}

async function ensureHouseholdProfile(
  supabase: SupabaseClient,
  input: Omit<SeedHousehold, "debts" | "email" | "password"> & { user_id: string },
) {
  const { data: existing, error: existingError } = await (supabase as any)
    .from("household_profiles")
    .select("id")
    .eq("user_id", input.user_id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await (supabase as any)
    .from("household_profiles")
    .insert({
      user_id: input.user_id,
      tenant_id: input.tenant_id,
      display_name: input.display_name,
      is_synthetic: true,
      monthly_income: input.monthly_income,
      income_volatility: input.income_volatility,
      fixed_obligations: input.fixed_obligations,
      buffer_balance: input.buffer_balance,
      plan_commitment_score: input.plan_commitment_score,
      region: input.region,
      currency: input.currency,
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as any).id as string;
}

async function ensureDebtInstruments(
  supabase: SupabaseClient,
  householdId: string,
  debts: SeedDebt[],
) {
  for (const d of debts) {
    const { data: existing, error: existingError } = await (supabase as any)
      .from("debt_instruments")
      .select("id")
      .eq("household_id", householdId)
      .eq("label", d.label)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.id) continue;

    const { error } = await (supabase as any).from("debt_instruments").insert({
      household_id: householdId,
      label: d.label,
      lender: d.lender,
      debt_type: d.debt_type,
      balance: d.balance,
      apr: d.apr,
      min_payment: d.min_payment,
      is_active: true,
    });
    if (error) throw error;
  }
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const h of households) {
    const userId = await ensureAuthUser(supabase, h.email, h.password);
    const householdId = await ensureHouseholdProfile(supabase, {
      user_id: userId,
      display_name: h.display_name,
      monthly_income: h.monthly_income,
      income_volatility: h.income_volatility,
      fixed_obligations: h.fixed_obligations,
      buffer_balance: h.buffer_balance,
      plan_commitment_score: h.plan_commitment_score,
      tenant_id: h.tenant_id,
      region: h.region,
      currency: h.currency,
    });
    await ensureDebtInstruments(supabase, householdId, h.debts);
    console.log(`Seeded: ${h.display_name} (${h.email})`);
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

