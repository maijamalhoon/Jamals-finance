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

export type DashboardModalKey =
  | "transaction"
  | "transfer"
  | "account"
  | "goal"
  | "investment"
  | "payable";

const MODAL_LOADERS: Record<DashboardModalKey, () => Promise<unknown>> = {
  transaction: loadTransactionModal,
  transfer: loadTransferModal,
  account: loadAccountModal,
  goal: loadGoalModal,
  investment: loadInvestmentModal,
  payable: loadPayableModal,
};

const modalPreloads = new Map<DashboardModalKey, Promise<unknown>>();

export function preloadDashboardModal(key: DashboardModalKey) {
  const cached = modalPreloads.get(key);
  if (cached) return cached;

  const preload = MODAL_LOADERS[key]().catch((error) => {
    // Allow a later user intent to retry a transient chunk/network failure.
    modalPreloads.delete(key);
    throw error;
  });

  modalPreloads.set(key, preload);
  return preload;
}

export async function preloadDashboardModals(
  keys: readonly DashboardModalKey[] = Object.keys(
    MODAL_LOADERS,
  ) as DashboardModalKey[],
) {
  await Promise.allSettled(keys.map((key) => preloadDashboardModal(key)));
}
