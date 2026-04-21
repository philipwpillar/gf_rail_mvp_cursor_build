import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { RaeApiPayload } from "@/lib/server/rae-recommendation";
import { PipelineStage } from "@/lib/rae/types";
import { formatPounds } from "@/lib/utils";
import { formatMoney } from "@/lib/display/money";

type PlanDocumentProps = {
  payload: RaeApiPayload;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1 solid #d4d4d8",
  },
  brand: { fontSize: 10, color: "#0D3560", marginBottom: 4 },
  title: { fontSize: 20, marginBottom: 4 },
  subtitle: { color: "#52525b", marginBottom: 2 },
  section: { marginTop: 10, paddingTop: 10, borderTop: "1 solid #e4e4e7" },
  sectionTitle: { fontSize: 13, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  label: { color: "#52525b" },
  debtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    borderBottom: "1 solid #f4f4f5",
    paddingBottom: 3,
  },
  disclaimer: {
    marginTop: 14,
    fontSize: 9,
    color: "#71717a",
    lineHeight: 1.4,
  },
});

function stageLabel(stage: PipelineStage): string {
  if (stage === PipelineStage.STAGE_1_RESILIENCE) return "Stage 1 - Building Safety Net";
  if (stage === PipelineStage.STAGE_2_DEBT) return "Stage 2 - Eliminating Debt";
  return "Stage 3 - Building Ownership";
}

function projectedInvestmentValue(
  monthlyContributionPence: number,
  existingInvestmentPence: number,
  months: number,
  annualRateNominal = 0.07,
): number {
  const r = annualRateNominal / 12;
  if (r === 0) return existingInvestmentPence + monthlyContributionPence * months;
  const fvContributions = monthlyContributionPence * ((Math.pow(1 + r, months) - 1) / r);
  const fvExisting = existingInvestmentPence * Math.pow(1 + r, months);
  return Math.round(fvContributions + fvExisting);
}

export function PlanDocument({ payload }: PlanDocumentProps) {
  const now = new Date();
  const activeDebts = payload.context.debts.filter((debt) => debt.isActive);
  const debtTotal = payload.result.finalAllocation.debtAllocations.reduce(
    (sum, allocation) => sum + allocation.amount,
    0,
  );
  const debtFreeMonthText =
    payload.projections.debtFreeMonth === null
      ? "Not debt-free inside 60 months"
      : `${payload.projections.debtFreeMonth} months`;
  const MONTHLY_GROWTH_RATE_PDF = 0.07 / 12;
  const snap60 = payload.projections.monthlySnapshots[59];
  const snap59 = payload.projections.monthlySnapshots[58];

  // Use the 5-year accumulated investment value as the starting point
  const existingInvestmentValue = snap60?.investmentValue ?? 0;

  // Derive the stabilised monthly contribution from the last two snapshots
  const monthlyInvestmentContribution =
    snap60 && snap59
      ? Math.max(
          0,
          Math.round(
            snap60.investmentValue -
              snap59.investmentValue * (1 + MONTHLY_GROWTH_RATE_PDF)
          )
        )
      : payload.result.finalAllocation.investmentContribution;
  const value10yr = projectedInvestmentValue(
    monthlyInvestmentContribution,
    existingInvestmentValue,
    60,
  );
  const value20yr = projectedInvestmentValue(
    monthlyInvestmentContribution,
    existingInvestmentValue,
    180,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>RAIL</Text>
          <Text style={styles.title}>Rail Plan Summary</Text>
          <Text style={styles.subtitle}>
            Household: {payload.context.householdName}
          </Text>
          <Text style={styles.subtitle}>
            Generated: {now.toLocaleDateString("en-GB")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Position</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Stage</Text>
            <Text>{stageLabel(payload.result.stage)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly surplus</Text>
            <Text>{formatPounds(payload.result.surplus)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Buffer / Debt / Investment</Text>
            <Text>
              {formatPounds(payload.result.finalAllocation.bufferContribution)} /{" "}
              {formatPounds(debtTotal)} /{" "}
              {formatPounds(payload.result.finalAllocation.investmentContribution)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Buffer floor / target</Text>
            <Text>
              {formatPounds(payload.result.bMin)} / {formatPounds(payload.result.bTarget)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debt Stack</Text>
          {activeDebts.length === 0 ? (
            <Text>No active debts recorded.</Text>
          ) : (
            activeDebts.map((debt) => {
              const monthlyAllocation =
                payload.result.finalAllocation.debtAllocations.find(
                  (allocation) => allocation.debtId === debt.id,
                )?.amount ?? 0;
              return (
                <View key={debt.id} style={styles.debtRow}>
                  <Text>
                    {debt.label} ({(debt.apr * 100).toFixed(1)}%)
                  </Text>
                  <Text>
                    {formatPounds(debt.balance)} | +{formatPounds(monthlyAllocation)}/mo
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ownership Projection</Text>
          <Text style={{ ...styles.label, fontSize: 9 }}>
            Assumes 7% nominal annual growth. For illustration only.
          </Text>
          {payload.result.finalAllocation.investmentContribution === 0 ? (
            <Text style={{ ...styles.label, fontSize: 9, marginTop: 2 }}>
              {/* TODO: pass currency from payload when multi-currency goes live */}
              Based on projected contribution of{" "}
              {formatMoney(monthlyInvestmentContribution, "GBP", { decimals: 0 })}
              /month after debt clearance.
            </Text>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>Debt-free timeline</Text>
            <Text>{debtFreeMonthText}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Interest saved vs minimum-only</Text>
            <Text>{formatPounds(payload.projections.totalInterestSavedVsMinimum)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Projected investment value (10 yrs)</Text>
            <Text>{formatPounds(value10yr)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Projected investment value (20 yrs)</Text>
            <Text>{formatPounds(value20yr)}</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          This plan is for educational guidance and does not constitute regulated
          financial advice. Outputs depend on the accuracy of household inputs, model assumptions,
          and market conditions. Review before acting.
        </Text>
        <Text style={styles.disclaimer}>Rail - Household CFO Platform</Text>
      </Page>
    </Document>
  );
}
