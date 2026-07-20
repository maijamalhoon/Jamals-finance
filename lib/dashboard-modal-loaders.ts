export const loadTransferModal = () =>
  import("@/components/accounts/TransferModal");

export const loadAccountModal = () =>
  import("@/components/accounts/AccountModal");

export const loadTransactionModal = () =>
  import("@/components/dashboard/TransactionModal");

export const loadGoalModal = () => import("@/components/goals/GoalModal");

export const loadInvestmentModal = () =>
  import("@/components/investments/InvestmentModal");

export const loadPayableModal = () =>
  import("@/components/payables/PayableModal");

let dashboardModalPreload: Promise<void> | null = null;

export function preloadDashboardModals() {
  if (!dashboardModalPreload) {
    dashboardModalPreload = Promise.allSettled([
      loadTransferModal(),
      loadAccountModal(),
      loadTransactionModal(),
      loadGoalModal(),
      loadInvestmentModal(),
      loadPayableModal(),
    ]).then(() => undefined);
  }

  return dashboardModalPreload;
}
