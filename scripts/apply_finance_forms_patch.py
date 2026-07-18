from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write_file(relative_path: str, content: str) -> None:
    path = ROOT / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def replace_once(relative_path: str, old: str, new: str) -> None:
    path = ROOT / relative_path
    content = path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise RuntimeError(
            f"Expected exactly one match in {relative_path}, found {count}: {old[:120]!r}"
        )
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


PAYABLE_MODAL = r'''"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import AccountSelect from "@/components/accounts/AccountSelect";
import DatePicker from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeErrorClass,
  financeModalContentClass,
  financePrimaryButtonClass,
} from "@/components/ui/finance-modal";
import { BASE_CURRENCY } from "@/lib/currency";
import { getAppDateKey } from "@/lib/dates";
import { getUserMutationError } from "@/lib/user-errors";

const PAYABLE_ACTION_COLOR = "#9B6A13";

interface PayableAccount {
  id: string;
  name: string;
  type: string;
  balance: number | string | null;
  icon_key?: string | null;
}

export interface ExistingPayable {
  id: string;
  person_name: string;
  item_name: string | null;
  reason: string;
  original_value: number;
  due_date: string | null;
  notes: string | null;
  account_id?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  payable?: ExistingPayable;
}

export default function PayableModal({ open, onClose, payable }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const isEditing = !!payable;

  const [personName, setPersonName] = useState("");
  const [itemName, setItemName] = useState("");
  const [reason, setReason] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dueDate, setDueDate] = useState(getAppDateKey());
  const [notes, setNotes] = useState("");
  const [accounts, setAccounts] = useState<PayableAccount[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPersonName(payable?.person_name ?? "");
    setItemName(payable?.item_name ?? "");
    setReason(payable?.reason ?? "");
    setOriginalValue(payable ? String(payable.original_value) : "");
    setAccountId(payable?.account_id ?? "");
    setDueDate(payable?.due_date ?? getAppDateKey());
    setNotes(payable?.notes ?? "");
    setError("");
  }, [open, payable]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadAccounts() {
      setLoadingOptions(true);
      const { data, error: accountsError } = await supabase
        .from("accounts")
        .select("id, name, type, balance, icon_key")
        .eq("status", "active")
        .order("name");

      if (cancelled) return;
      setLoadingOptions(false);

      if (accountsError) {
        setAccounts([]);
        setAccountId("");
        setError("Accounts could not be loaded. Check your connection and try again.");
        return;
      }

      const nextAccounts = (data ?? []) as PayableAccount[];
      setAccounts(nextAccounts);
      setAccountId((current) => {
        const preferred = payable?.account_id || current;
        return nextAccounts.some((account) => account.id === preferred)
          ? preferred
          : nextAccounts[0]?.id ?? "";
      });
    }

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [open, payable?.account_id, supabase]);

  async function handleSave() {
    if (loading) return;

    if (loadingOptions) {
      setError("Please wait while accounts load.");
      return;
    }

    const value = Number(originalValue);
    if (
      !personName.trim() ||
      !reason.trim() ||
      !accountId ||
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setError("Amount, name, purpose, and account are required.");
      return;
    }

    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Please sign in again.");
      return;
    }

    const payload = {
      user_id: user.id,
      person_name: personName.trim(),
      item_name: itemName.trim() || null,
      reason: reason.trim(),
      original_value: value,
      account_id: accountId,
      due_date: dueDate || null,
      notes: notes.trim() || null,
    };

    const { error: saveError } = isEditing
      ? await supabase.from("liabilities").update(payload).eq("id", payable.id)
      : await supabase.from("liabilities").insert(payload);

    setLoading(false);

    if (saveError) {
      setError(
        getUserMutationError(saveError, "Payable could not be saved. Try again."),
      );
      toast.error("Failed to save payable");
      return;
    }

    toast.success(isEditing ? "Payable updated" : "Payable added");
    router.refresh();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={financeModalContentClass}
        style={
          {
            "--finance-action": PAYABLE_ACTION_COLOR,
          } as CSSProperties
        }
      >
        <FinanceModalHeader title={isEditing ? "Edit Payable" : "Add Payable"} />

        <FinanceModalBody>
          <FinanceFormField
            label={`Amount (${BASE_CURRENCY})`}
            htmlFor="payable-original-value"
          >
            <Input
              id="payable-original-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={originalValue}
              onChange={(event) => setOriginalValue(event.target.value)}
              placeholder="0"
              className="font-semibold tabular-nums"
            />
          </FinanceFormField>

          <FinanceFormField label="Name" htmlFor="payable-person-name">
            <Input
              id="payable-person-name"
              value={personName}
              onChange={(event) => setPersonName(event.target.value)}
              placeholder="Who do you need to pay?"
              autoComplete="off"
            />
          </FinanceFormField>

          <FinanceFormField label="Purpose" htmlFor="payable-reason">
            <Input
              id="payable-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="What is this payable for?"
            />
          </FinanceFormField>

          <FinanceFormField label="Account" htmlFor="payable-account">
            <AccountSelect
              id="payable-account"
              value={accountId}
              onValueChange={setAccountId}
              accounts={accounts}
              loading={loadingOptions}
              placeholder="Select account"
              emptyText="No accounts found"
              ariaLabel="Payable account"
              scrollPicker
            />
          </FinanceFormField>

          <FinanceFormField label="Due Date" htmlFor="payable-due-date">
            <DatePicker
              id="payable-due-date"
              value={dueDate}
              onChange={setDueDate}
              placeholder="DD/MM/YYYY"
              ariaLabel="Payable due date"
            />
          </FinanceFormField>

          {error ? <p className={financeErrorClass}>{error}</p> : null}
        </FinanceModalBody>

        <FinanceModalFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || loadingOptions}
            loading={loading}
            loadingLabel="Saving payable…"
            className={financePrimaryButtonClass}
            style={{ background: PAYABLE_ACTION_COLOR }}
          >
            {isEditing ? "Update Payable" : "Save Payable"}
          </Button>
        </FinanceModalFooter>
      </DialogContent>
    </Dialog>
  );
}
'''

FINANCE_FORM_CSS = r'''.finance-modal-content[style*="--finance-action"] {
  --finance-control-height: clamp(3rem, 6.7dvh, 3.35rem);
  --finance-action-height: clamp(3rem, 6.7dvh, 3.35rem);
  width: min(calc(100vw - 0.75rem), 32rem) !important;
  max-width: 32rem !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: calc(100dvh - 0.5rem) !important;
  overflow: hidden !important;
  border: 0 !important;
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif !important;
}

.finance-modal-content[style*="--finance-action"] .finance-modal-header {
  position: relative;
  min-height: clamp(3.1rem, 7dvh, 3.65rem);
  flex: 0 0 auto;
  justify-content: center;
  gap: 0 !important;
  border-bottom: 1px solid var(--border) !important;
  padding: clamp(0.62rem, 1.45dvh, 0.84rem) 3.75rem
    clamp(0.58rem, 1.35dvh, 0.78rem) 1rem !important;
}

.finance-modal-content[style*="--finance-action"] .finance-modal-header::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  border-radius: 0 999px 999px 0;
  background: var(--finance-action);
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-header
  .finance-icon-container,
.finance-modal-content[style*="--finance-action"]
  .finance-modal-header
  [data-slot="dialog-description"] {
  display: none !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-header
  [data-slot="dialog-title"] {
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif !important;
  font-size: clamp(1rem, 1.9vw, 1.08rem) !important;
  font-weight: 700 !important;
  line-height: 1.25rem !important;
  letter-spacing: -0.018em !important;
}

.finance-modal-content[style*="--finance-action"] .finance-dialog-close {
  top: 0.68rem !important;
  right: 0.68rem !important;
  width: 2.25rem !important;
  height: 2.25rem !important;
  color: var(--finance-action) !important;
}

.finance-modal-content[style*="--finance-action"] .finance-dialog-close svg {
  width: 1.25rem !important;
  height: 1.25rem !important;
  stroke-width: 1.9 !important;
}

.finance-modal-content[style*="--finance-action"] .lucide {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.finance-modal-content[style*="--finance-action"] .finance-modal-body {
  display: grid !important;
  min-height: 0 !important;
  flex: 0 1 auto !important;
  align-content: start;
  gap: clamp(0.46rem, 1.05dvh, 0.68rem) !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  overscroll-behavior: contain !important;
  padding: clamp(0.58rem, 1.3dvh, 0.82rem) 1rem !important;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.finance-modal-content[style*="--finance-action"] .finance-modal-body > * {
  min-width: 0;
  width: 100%;
  margin-block: 0 !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  > .grid {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: clamp(0.46rem, 1.05dvh, 0.68rem) !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  .field-label {
  margin-bottom: clamp(0.2rem, 0.45dvh, 0.3rem) !important;
  color: var(--text-secondary);
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif !important;
  font-size: clamp(0.68rem, 1.28dvh, 0.74rem) !important;
  font-weight: 600 !important;
  line-height: 0.95rem !important;
  letter-spacing: 0.015em;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  .field-input,
.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  [data-slot="select-trigger"],
.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  select.finance-control {
  box-sizing: border-box;
  width: 100% !important;
  height: var(--finance-control-height) !important;
  min-height: var(--finance-control-height) !important;
  max-height: var(--finance-control-height) !important;
  border-radius: 0.9rem !important;
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif !important;
  font-size: clamp(0.86rem, 1.75dvh, 0.96rem) !important;
  font-weight: 500 !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  textarea.field-input {
  height: var(--finance-control-height) !important;
  min-height: var(--finance-control-height) !important;
  max-height: var(--finance-control-height) !important;
  resize: none !important;
  padding-top: 0.72rem !important;
  padding-bottom: 0.72rem !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  input[type="number"] {
  font-variant-numeric: tabular-nums;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-body
  > div:has(button[aria-label="Swap source and destination accounts"]) {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  padding: 0 !important;
}

.finance-modal-content[style*="--finance-action"]
  button[aria-label="Swap source and destination accounts"] {
  justify-self: center !important;
  margin-inline: auto !important;
}

.finance-modal-content[style*="--finance-action"] .finance-modal-footer {
  flex: 0 0 auto;
  gap: 0.5rem !important;
  border-top: 1px solid var(--border) !important;
  background: var(--card) !important;
  padding: clamp(0.52rem, 1.18dvh, 0.74rem) 1rem
    calc(clamp(0.52rem, 1.18dvh, 0.74rem) + env(safe-area-inset-bottom)) !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-footer:has(> button:nth-child(2)) {
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr) !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-footer
  > button {
  width: 100%;
  height: var(--finance-action-height) !important;
  min-height: var(--finance-action-height) !important;
  max-height: var(--finance-action-height) !important;
  border-radius: 0.9rem !important;
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif !important;
  font-size: clamp(0.88rem, 1.8dvh, 0.98rem) !important;
  font-weight: 650 !important;
  transition:
    filter var(--motion-duration-fast),
    transform var(--motion-duration-fast),
    box-shadow var(--motion-duration-fast) !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-footer
  > button:not([style*="background"]) {
  background: var(--surface-secondary) !important;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12) !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-footer
  > button[style*="background"] {
  border: 0 !important;
  box-shadow:
    0 9px 20px color-mix(in srgb, var(--finance-action), transparent 78%),
    inset 0 1px 0 rgb(255 255 255 / 0.2) !important;
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-footer
  > button[style*="background"]:hover {
  filter: brightness(1.055);
  transform: translateY(-1px);
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-footer
  > button[style*="background"]:active {
  filter: brightness(0.98);
  transform: translateY(0) scale(0.985);
}

.finance-modal-content[style*="--finance-action"]
  .finance-modal-footer
  > button:disabled {
  box-shadow: none !important;
  transform: none !important;
}

@media (min-width: 640px) {
  .finance-modal-content[style*="--finance-action"] {
    width: min(calc(100vw - 2rem), 32rem) !important;
    max-width: 32rem !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-header,
  .finance-modal-content[style*="--finance-action"] .finance-modal-body,
  .finance-modal-content[style*="--finance-action"] .finance-modal-footer {
    padding-inline: 1.2rem !important;
  }
}

@media (max-width: 430px) {
  .finance-modal-content[style*="--finance-action"] {
    width: min(calc(100vw - 0.75rem), 32rem) !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-body,
  .finance-modal-content[style*="--finance-action"] .finance-modal-footer {
    padding-inline: 0.82rem !important;
  }
}

@media (max-height: 760px) {
  .finance-modal-content[style*="--finance-action"] {
    --finance-control-height: 2.85rem;
    --finance-action-height: 2.95rem;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-header {
    min-height: 2.9rem;
    padding-top: 0.48rem !important;
    padding-bottom: 0.44rem !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-body {
    gap: 0.38rem !important;
    padding-top: 0.44rem !important;
    padding-bottom: 0.44rem !important;
  }

  .finance-modal-content[style*="--finance-action"]
    .finance-modal-body
    > .grid {
    gap: 0.38rem !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-footer {
    padding-top: 0.42rem !important;
    padding-bottom: calc(0.42rem + env(safe-area-inset-bottom)) !important;
  }
}

@media (max-height: 620px) {
  .finance-modal-content[style*="--finance-action"] {
    --finance-control-height: 2.58rem;
    --finance-action-height: 2.7rem;
    max-height: calc(100dvh - 0.25rem) !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-header {
    min-height: 2.68rem;
    padding-top: 0.36rem !important;
    padding-bottom: 0.32rem !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-body {
    gap: 0.28rem !important;
    padding-top: 0.32rem !important;
    padding-bottom: 0.32rem !important;
  }

  .finance-modal-content[style*="--finance-action"]
    .finance-modal-body
    > .grid {
    gap: 0.28rem !important;
  }

  .finance-modal-content[style*="--finance-action"]
    .finance-modal-body
    .field-label {
    margin-bottom: 0.08rem !important;
    font-size: 0.62rem !important;
    line-height: 0.75rem !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-footer {
    padding-top: 0.32rem !important;
    padding-bottom: calc(0.32rem + env(safe-area-inset-bottom)) !important;
  }
}

@media (max-height: 520px) {
  .finance-modal-content[style*="--finance-action"] {
    --finance-control-height: 2.3rem;
    --finance-action-height: 2.42rem;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-header {
    min-height: 2.42rem;
    padding-top: 0.25rem !important;
    padding-bottom: 0.22rem !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-body {
    gap: 0.2rem !important;
    padding-top: 0.22rem !important;
    padding-bottom: 0.22rem !important;
  }

  .finance-modal-content[style*="--finance-action"]
    .finance-modal-body
    > .grid {
    gap: 0.2rem !important;
  }

  .finance-modal-content[style*="--finance-action"]
    .finance-modal-body
    .field-label {
    margin-bottom: 0.04rem !important;
    font-size: 0.56rem !important;
    line-height: 0.66rem !important;
  }

  .finance-modal-content[style*="--finance-action"] .finance-modal-footer {
    padding-top: 0.22rem !important;
    padding-bottom: calc(0.22rem + env(safe-area-inset-bottom)) !important;
  }
}
'''

MIGRATION = r'''alter table public.liabilities
  add column if not exists account_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'liabilities_account_id_fkey'
      and conrelid = 'public.liabilities'::regclass
  ) then
    alter table public.liabilities
      add constraint liabilities_account_id_fkey
      foreign key (account_id)
      references public.accounts(id)
      on delete set null;
  end if;
end
$$;

create index if not exists liabilities_user_account_idx
  on public.liabilities(user_id, account_id)
  where account_id is not null;

drop policy if exists liabilities_owner_insert on public.liabilities;
create policy liabilities_owner_insert
  on public.liabilities for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = account_id
          and account.user_id = auth.uid()
      )
    )
  );

drop policy if exists liabilities_owner_update on public.liabilities;
create policy liabilities_owner_update
  on public.liabilities for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts account
        where account.id = account_id
          and account.user_id = auth.uid()
      )
    )
  );
'''

write_file("components/payables/PayableModal.tsx", PAYABLE_MODAL)
write_file("app/finance-form-unification.css", FINANCE_FORM_CSS)
write_file(
    "supabase/migrations/20260719025500_add_linked_account_to_liabilities.sql",
    MIGRATION,
)

replace_once(
    "components/goals/GoalModal.tsx",
    'import { Input } from "@/components/ui/input";\n',
    'import { Input } from "@/components/ui/input";\nimport AccountSelect from "@/components/accounts/AccountSelect";\n',
)
replace_once(
    "components/goals/GoalModal.tsx",
    '''export interface GoalAccount {\n  id: string;\n  name: string;\n  type: string;\n}\n''',
    '''export interface GoalAccount {\n  id: string;\n  name: string;\n  type: string;\n  balance?: number | string | null;\n  icon_key?: string | null;\n}\n''',
)
replace_once(
    "components/goals/GoalModal.tsx",
    'const NO_GOAL_ACCOUNTS: GoalAccount[] = [];\nconst GOAL_ACTION_COLOR = "#157462";\n',
    'const NO_GOAL_ACCOUNTS: GoalAccount[] = [];\nconst NO_LINKED_ACCOUNT_ID = "__no_linked_goal_account__";\nconst GOAL_ACTION_COLOR = "#157462";\n',
)
replace_once(
    "components/goals/GoalModal.tsx",
    '.select("id, name, type")',
    '.select("id, name, type, balance, icon_key")',
)
replace_once(
    "components/goals/GoalModal.tsx",
    '''            <FinanceFormField label="Account" htmlFor="goal-account">\n              <select\n                id="goal-account"\n                value={accountId}\n                onChange={(event) => setAccountId(event.target.value)}\n                className="finance-control finance-focus h-11 w-full px-3 text-sm text-text-primary outline-none"\n              >\n                <option value="">No linked account</option>\n                {availableAccounts.map((availableAccount) => (\n                  <option key={availableAccount.id} value={availableAccount.id}>\n                    {availableAccount.name}\n                  </option>\n                ))}\n              </select>\n            </FinanceFormField>\n''',
    '''            <FinanceFormField label="Account" htmlFor="goal-account">\n              <AccountSelect\n                id="goal-account"\n                value={accountId || NO_LINKED_ACCOUNT_ID}\n                onValueChange={(nextAccountId) =>\n                  setAccountId(\n                    nextAccountId === NO_LINKED_ACCOUNT_ID ? "" : nextAccountId,\n                  )\n                }\n                accounts={[\n                  {\n                    id: NO_LINKED_ACCOUNT_ID,\n                    name: "No linked account",\n                    type: "optional",\n                    balance: null,\n                  },\n                  ...availableAccounts,\n                ]}\n                placeholder="No linked account"\n                ariaLabel="Goal account"\n                scrollPicker\n              />\n            </FinanceFormField>\n''',
)

replace_once(
    "components/investments/InvestmentModal.tsx",
    'import { Input } from "@/components/ui/input";\n',
    'import { Input } from "@/components/ui/input";\nimport AccountSelect from "@/components/accounts/AccountSelect";\n',
)
replace_once(
    "components/investments/InvestmentModal.tsx",
    '''type Account = {\n  id: string;\n  name: string;\n  type: string;\n  balance: number | string | null;\n};\n''',
    '''type Account = {\n  id: string;\n  name: string;\n  type: string;\n  balance: number | string | null;\n  icon_key?: string | null;\n};\n''',
)
replace_once(
    "components/investments/InvestmentModal.tsx",
    '  const [, setAccounts] = useState<Account[]>([]);\n',
    '  const [accounts, setAccounts] = useState<Account[]>([]);\n',
)
replace_once(
    "components/investments/InvestmentModal.tsx",
    '.select("id, name, type, balance")',
    '.select("id, name, type, balance, icon_key")',
)
replace_once(
    "components/investments/InvestmentModal.tsx",
    '''          <FinanceFormField label="Date" htmlFor="investment-purchased-at">\n            <DatePicker\n              id="investment-purchased-at"\n              value={purchasedAt}\n              onChange={setPurchasedAt}\n              placeholder="DD/MM/YYYY"\n              ariaLabel="Investment purchase date"\n            />\n          </FinanceFormField>\n''',
    '''          <FinanceFormField label="Account" htmlFor="investment-account">\n            <AccountSelect\n              id="investment-account"\n              value={accountId}\n              onValueChange={setAccountId}\n              accounts={accounts}\n              loading={loadingOptions}\n              placeholder="Select account"\n              emptyText="No accounts found"\n              ariaLabel="Investment account"\n              scrollPicker\n            />\n          </FinanceFormField>\n\n          <FinanceFormField label="Date" htmlFor="investment-purchased-at">\n            <DatePicker\n              id="investment-purchased-at"\n              value={purchasedAt}\n              onChange={setPurchasedAt}\n              placeholder="DD/MM/YYYY"\n              ariaLabel="Investment purchase date"\n            />\n          </FinanceFormField>\n''',
)

replace_once(
    "components/accounts/TransferModal.tsx",
    'import { ArrowDownUp } from "lucide-react";\n',
    'import { ArrowUpDown } from "lucide-react";\n',
)
replace_once(
    "components/accounts/TransferModal.tsx",
    '''                    placeholder="Select source account"\n                    ariaLabel="From account"\n                  />\n''',
    '''                    placeholder="Select source account"\n                    ariaLabel="From account"\n                    scrollPicker\n                  />\n''',
)
replace_once(
    "components/accounts/TransferModal.tsx",
    '''                    placeholder="Select destination account"\n                    ariaLabel="To account"\n                  />\n''',
    '''                    placeholder="Select destination account"\n                    ariaLabel="To account"\n                    scrollPicker\n                  />\n''',
)
replace_once(
    "components/accounts/TransferModal.tsx",
    '                <div className="flex items-center gap-3 py-1.5">\n',
    '                <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 py-1.5">\n',
)
replace_once(
    "components/accounts/TransferModal.tsx",
    'className="finance-focus group grid size-9 shrink-0 place-items-center border-0 bg-transparent p-0 transition-[opacity,transform] hover:opacity-65 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"',
    'className="finance-focus group grid size-9 shrink-0 justify-self-center place-items-center border-0 bg-transparent p-0 transition-[opacity,transform] hover:opacity-65 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"',
)
replace_once(
    "components/accounts/TransferModal.tsx",
    '<ArrowDownUp\n',
    '<ArrowUpDown\n',
)

replace_once(
    "components/dashboard/TransactionModal.tsx",
    '''        style={{\n          "--transaction-accent": isIncome ? "var(--income)" : "var(--expense)",\n        } as React.CSSProperties}\n''',
    '''        style={{\n          "--transaction-accent": isIncome ? "var(--income)" : "var(--expense)",\n          "--finance-action": isIncome ? "var(--income)" : "var(--expense)",\n        } as React.CSSProperties}\n''',
)

replace_once(
    "components/dashboard/TransactionModal.module.css",
    '  width: 3px;\n  background: var(--transaction-accent);\n',
    '  width: 4px;\n  border-radius: 0 999px 999px 0;\n  background: var(--transaction-accent);\n',
)
replace_once(
    "components/dashboard/TransactionModal.module.css",
    '  font-weight: 750;\n',
    '  font-weight: 700;\n',
)
replace_once(
    "components/dashboard/TransactionModal.module.css",
    '  font-weight: 700;\n  line-height: 0.9rem;\n  letter-spacing: 0.045em;\n',
    '  font-weight: 600;\n  line-height: 0.9rem;\n  letter-spacing: 0.015em;\n',
)
replace_once(
    "components/dashboard/TransactionModal.module.css",
    '    --finance-modal-max-width: clamp(34rem, 62vw, 38rem);\n',
    '    --finance-modal-max-width: 32rem;\n',
)

print("Finance forms patch applied successfully.")
