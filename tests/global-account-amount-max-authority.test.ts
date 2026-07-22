import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const authority = read(
  "../components/forms/GlobalAccountAmountMaxAuthority.tsx",
);
const pwaRegister = read("../app/pwa-register.tsx");
const transferModal = read("../components/accounts/TransferModal.tsx");

const accountAmountForms = [
  "../components/dashboard/TransactionModal.tsx",
  "../components/payables/PaymentModal.tsx",
  "../components/payables/PayableModal.tsx",
  "../components/goals/GoalContributionModal.tsx",
  "../components/goals/GoalModal.tsx",
  "../components/investments/InvestmentCashOutModal.tsx",
].map((path) => ({ path, source: read(path) }));

describe("global account amount Max authority", () => {
  it("is mounted once for every route", () => {
    expect(pwaRegister).toContain("GlobalAccountAmountMaxAuthority");
    expect(pwaRegister).toContain("<GlobalAccountAmountMaxAuthority />");
  });

  it("targets only forms containing an account selector and amount-like fields", () => {
    expect(authority).toContain('const ACCOUNT_SELECTOR = ".finance-account-select"');
    expect(authority).toContain("AMOUNT_LABEL_PATTERN");
    expect(authority).toContain("amount|contribution|payment");
    expect(authority).toContain('input[type="number"], input[inputmode="decimal"]');
  });

  it("uses the form accent and the same in-field Max presentation", () => {
    expect(authority).toContain('style.getPropertyValue("--finance-action")');
    expect(authority).toContain('style.getPropertyValue("--transaction-accent")');
    expect(authority).toContain('button.textContent = "Max"');
    expect(authority).toContain('input.style.setProperty("padding-right", "3.5rem"');
    expect(authority).toContain('button.style.setProperty("top"');
    expect(authority).toContain('button.style.setProperty("right"');
  });

  it("fills controlled React inputs and respects available caps", () => {
    expect(authority).toContain("getSelectedBalance");
    expect(authority).toContain("getFieldCap");
    expect(authority).toContain("Math.min(selectedBalance, cap)");
    expect(authority).toContain('new Event("input", { bubbles: true })');
    expect(authority).toContain('new Event("change", { bubbles: true })');
  });

  it("does not duplicate Transfer and reuses existing contextual Max actions", () => {
    expect(transferModal).toContain("handleUseMaximum");
    expect(transferModal).toContain(">\n                      Max\n");
    expect(authority).toContain("inlineExisting");
    expect(authority).toContain("proxiedSource.click()");
  });

  it("covers every current account plus amount form family", () => {
    accountAmountForms.forEach(({ path, source }) => {
      expect(source, path).toContain("AccountSelect");
      expect(source, path).toMatch(/Amount|Contribution|Payment/);
    });
  });
});
