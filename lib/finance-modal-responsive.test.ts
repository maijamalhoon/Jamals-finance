import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const financeModalSource = readFileSync(
  new URL("../components/ui/finance-modal.tsx", import.meta.url),
  "utf8",
);
const auditAuthoritySource = readFileSync(
  new URL("../components/forms/GlobalFormAuditAuthority.tsx", import.meta.url),
  "utf8",
);
const fieldAuthoritySource = readFileSync(
  new URL("../components/forms/GlobalFormFieldAuthority.tsx", import.meta.url),
  "utf8",
);

const sharedFinanceModalSources = [
  "../components/dashboard/TransactionModal.tsx",
  "../components/accounts/AccountModal.tsx",
  "../components/accounts/TransferModal.tsx",
  "../components/goals/GoalModal.tsx",
  "../components/goals/GoalContributionModal.tsx",
  "../components/investments/InvestmentModalLocal.tsx",
  "../components/investments/InvestmentCashOutModal.tsx",
  "../components/payables/PayableModal.tsx",
  "../components/payables/PaymentModal.tsx",
  "../components/transactions/RefundModal.tsx",
].map((path) => ({
  path,
  source: readFileSync(new URL(path, import.meta.url), "utf8"),
}));

describe("global finance form responsive contract", () => {
  it("centers every finance dialog on mobile and tablet with safe viewport bounds", () => {
    expect(auditAuthoritySource).toContain("@media (max-width: 1023px)");
    expect(auditAuthoritySource).toContain("top: 50svh !important");
    expect(auditAuthoritySource).toContain("left: 50vw !important");
    expect(auditAuthoritySource).toContain(
      "transform: translate3d(-50%, -50%, 0) !important",
    );
    expect(auditAuthoritySource).toContain("env(safe-area-inset-bottom)");
    expect(auditAuthoritySource).toContain("max-height: calc(");
  });

  it("keeps long forms internally scrollable with a fixed one-column footer", () => {
    expect(financeModalSource).toContain(
      "max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)]",
    );
    expect(financeModalSource).toContain("overflow-y-auto overscroll-contain");
    expect(financeModalSource).toContain("env(safe-area-inset-bottom)");
    expect(financeModalSource).toContain("grid-cols-1");
  });

  it("routes every core finance modal through the shared shell, body and footer", () => {
    sharedFinanceModalSources.forEach(({ path, source }) => {
      expect(source, path).toContain("financeModalContentClass");
      expect(source, path).toContain("FinanceModalBody");
      expect(source, path).toContain("FinanceModalFooter");
    });
  });

  it("enforces one real rendered field footprint instead of relying on CSS modules", () => {
    expect(fieldAuthoritySource).toContain("MANAGED_CONTROL_SELECTOR");
    expect(fieldAuthoritySource).toContain('"width", "100%", "important"');
    expect(fieldAuthoritySource).toContain(
      '"height", GLOBAL_FIELD_HEIGHT, "important"',
    );
    expect(fieldAuthoritySource).toContain("MutationObserver");
    expect(fieldAuthoritySource).toContain("window.requestAnimationFrame");
    expect(fieldAuthoritySource).toContain("collectManagedRoots");
  });
});
