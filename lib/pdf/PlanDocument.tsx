import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { RaeApiPayload } from "@/lib/server/rae-recommendation";

type PlanDocumentProps = {
  payload: RaeApiPayload;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  header: { marginBottom: 14 },
  title: { fontSize: 20, marginBottom: 4 },
  subtitle: { color: "#52525b" },
  section: { marginTop: 10, paddingTop: 10, borderTop: "1 solid #e4e4e7" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  label: { color: "#52525b" },
});

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function PlanDocument({ payload }: PlanDocumentProps) {
  const debtTotal = payload.result.finalAllocation.debtAllocations.reduce(
    (sum, allocation) => sum + allocation.amount,
    0,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Rail Plan Summary</Text>
          <Text style={styles.subtitle}>
            {payload.context.householdName} - {new Date().toLocaleDateString("en-GB")}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Stage</Text>
            <Text>{payload.result.stage}</Text>
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
        </View>
      </Page>
    </Document>
  );
}
