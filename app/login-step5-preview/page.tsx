import SpendingBreakdown from "@/components/dashboard/SpendingBreakdown";

const spending = [
  {
    name: "Groceries and Household Essentials",
    value: 48500,
    percentage: 34,
    color: "#16a34a",
  },
  {
    name: "Transport",
    value: 30200,
    percentage: 21,
    color: "#2563eb",
  },
  {
    name: "Electricity and Internet Bills",
    value: 21100,
    percentage: 15,
    color: "#f59e0b",
  },
  {
    name: "Health and Pharmacy",
    value: 17400,
    percentage: 12,
    color: "#dc2626",
  },
  {
    name: "Education",
    value: 12600,
    percentage: 9,
    color: "",
  },
  {
    name: "Very Long Miscellaneous Category Name That Should Truncate Cleanly",
    value: 9300,
    percentage: 7,
    color: "#7c3aed",
  },
];

export default function Step5PreviewPage() {
  return (
    <main className="min-h-screen bg-background p-4 text-text-primary sm:p-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
        <SpendingBreakdown data={spending} total={139100} />
        <SpendingBreakdown data={[]} total={0} />
        <div className="dark rounded-[28px] bg-background p-1">
          <SpendingBreakdown data={spending} total={139100} />
        </div>
      </div>
    </main>
  );
}
