import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_CHAIN = [
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "anthropic/claude-haiku-4-5",
  "meta-llama/llama-3.3-70b-instruct:free",
] as const;

type OpenRouterSuccess = { ok: true; response: Response; model: string };
type OpenRouterFailure = { ok: false; status: number; userMessage: string; details: string };

function isOpenRouterFailure(result: OpenRouterSuccess | OpenRouterFailure): result is OpenRouterFailure {
  return result.ok === false;
}

type AdvisorMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AdvisorRequestBody = {
  messages?: AdvisorMessage[];
  householdId?: string;
};

type LatestExecutionRow = {
  surplus: number | null;
  stage: string | null;
  b_target: number | null;
  input_snapshot: unknown;
};

function toPounds(pence: number | null | undefined): string {
  const amount = typeof pence === "number" ? pence : 0;
  return `£${(amount / 100).toFixed(2)}`;
}

function buildSystemPrompt(householdName: string, execution: LatestExecutionRow): string {
  const snapshot =
    execution.input_snapshot && typeof execution.input_snapshot === "object"
      ? (execution.input_snapshot as Record<string, unknown>)
      : {};
  const monthlyIncomePence = Number(snapshot.monthlyIncome ?? 0);
  const bufferBalancePence = Number(snapshot.bufferBalance ?? 0);
  const debts = Array.isArray(snapshot.debts) ? (snapshot.debts as unknown[]) : [];

  const debtLines = debts
    .map((debt, idx: number) => {
      const debtItem = debt && typeof debt === "object" ? (debt as Record<string, unknown>) : {};
      const label = String(debtItem.label ?? debtItem.id ?? `Debt ${idx + 1}`);
      const balancePence = Number(debtItem.balance ?? 0);
      const apr = Number(debtItem.apr ?? 0);
      const minPaymentPence = Number(debtItem.minPayment ?? 0);
      return `- ${label}: balance ${toPounds(balancePence)}, APR ${(apr * 100).toFixed(1)}%, minimum ${toPounds(minPaymentPence)}`;
    })
    .join("\n");

  return [
    "You are Rail Advisor, an informational assistant for a UK personal-finance prototype.",
    "Provide plain-English explanations only. Be concise, practical, and clear.",
    "Do not provide regulated financial advice, legal advice, or promises of outcomes.",
    "If user asks for actions outside provided data, say what is unknown.",
    "",
    `Household: ${householdName}`,
    `RAE stage: ${execution.stage ?? "Unknown"}`,
    `Monthly income: ${toPounds(monthlyIncomePence)}`,
    `Monthly surplus: ${toPounds(execution.surplus)}`,
    `Current buffer balance: ${toPounds(bufferBalancePence)}`,
    `Buffer target: ${toPounds(execution.b_target)}`,
    "Debts:",
    debtLines || "- None listed",
    "",
    "Always remind briefly: information only, not regulated financial advice.",
  ].join("\n");
}

async function callOpenRouterWithFallback({
  apiKey,
  messages,
}: {
  apiKey: string;
  messages: AdvisorMessage[];
}): Promise<OpenRouterSuccess | OpenRouterFailure> {
  const errors: Array<{ model: string; status: number; details: string }> = [];

  for (const model of MODEL_CHAIN) {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages,
      }),
    });

    if (response.ok && response.body) {
      return { ok: true, response, model };
    }

    const details = await response.text();
    errors.push({
      model,
      status: response.status,
      details: details || "Unknown upstream error",
    });
  }

  const last = errors[errors.length - 1];
  const hasRateLimit = errors.some((entry) => entry.status === 429);
  const hasAuthError = errors.some((entry) => entry.status === 401 || entry.status === 403);
  const userMessage = hasAuthError
    ? "Rail Advisor is misconfigured: OpenRouter authentication failed. Please check OPENROUTER_API_KEY."
    : hasRateLimit
      ? "Rail Advisor is temporarily busy due to model rate limits. Please retry in a moment."
      : "Rail Advisor could not reach an AI model right now. Please try again.";

  return {
    ok: false,
    status: hasAuthError ? 502 : hasRateLimit ? 503 : 502,
    userMessage,
    details: last ? `${last.model}: ${last.details}` : "No model responses received",
  };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.json({ error: "Failed to verify authenticated user." }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as AdvisorRequestBody;
  const householdId = body.householdId;
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!householdId) {
    return NextResponse.json({ error: "householdId is required" }, { status: 400 });
  }
  const {
    data: household,
    error: householdError,
  } = await supabase
    .from("household_profiles")
    .select("id, display_name")
    .eq("id", householdId)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; display_name: string | null }>();

  if (householdError) {
    return NextResponse.json({ error: "Failed to load household context." }, { status: 500 });
  }

  if (!household) {
    return NextResponse.json({ error: "Household not found" }, { status: 404 });
  }

  const {
    data: latestExecution,
    error: latestExecutionError,
  } = await supabase
    .from("rae_executions")
    .select("surplus, stage, b_target, input_snapshot")
    .eq("household_id", householdId)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestExecutionRow>();

  if (latestExecutionError) {
    return NextResponse.json({ error: "Failed to load latest RAE execution." }, { status: 500 });
  }

  if (!latestExecution) {
    return NextResponse.json({ error: "No RAE execution found for this household" }, { status: 404 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
  }

  const requestMessages: AdvisorMessage[] = [
    { role: "system", content: buildSystemPrompt(household.display_name ?? "Household", latestExecution) },
    ...messages,
  ];
  const upstream = await callOpenRouterWithFallback({
    apiKey,
    messages: requestMessages,
  });

  if (isOpenRouterFailure(upstream)) {
    return NextResponse.json(
      {
        error: upstream.userMessage,
        details: upstream.details,
      },
      { status: upstream.status },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.response.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffered = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffered += decoder.decode(value, { stream: true });
          const lines = buffered.split("\n");
          buffered = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // Ignore malformed stream chunks.
            }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "x-rail-advisor-model": upstream.model,
    },
  });
}
