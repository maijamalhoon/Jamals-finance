import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
  PackageSearch,
  RotateCcw,
  Scale,
  ShieldCheck,
  Undo2,
  Warehouse as WarehouseIcon,
} from "lucide-react";

import InventoryCatalogForms from "@/components/business/InventoryCatalogForms";
import InventoryOperationsForms from "@/components/business/InventoryOperationsForms";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Inventory",
  robots: { index: false, follow: false },
};

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  base_currency: string;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  unit_of_measure: string;
  sales_price: number | string;
  purchase_cost_hint: number | string;
  reorder_level: number | string;
  status: string;
};

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
  status: string;
};

type BalanceRow = {
  product_id: string;
  warehouse_id: string;
  quantity_on_hand: number | string;
  inventory_value_base: number | string;
  average_cost_base: number | string;
};

type MovementRow = {
  id: string;
  movement_number: number | string;
  movement_type:
    | "receipt"
    | "issue"
    | "transfer_out"
    | "transfer_in"
    | "adjustment_in"
    | "adjustment_out"
    | "sales_return"
    | "purchase_return";
  movement_date: string;
  product_id: string;
  warehouse_id: string;
  quantity: number | string;
  unit_cost_base: number | string;
  total_value_base: number | string;
  source_type:
    | "supplier_bill"
    | "sales_invoice"
    | "warehouse_transfer"
    | "stock_adjustment"
    | "sales_return"
    | "purchase_return";
  status: "draft" | "posted";
};

type TransferRow = {
  id: string;
  transfer_code: string;
  transfer_date: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: string;
};

type AdjustmentRow = {
  id: string;
  adjustment_code: string;
  adjustment_date: string;
  reason: string;
  status: string;
};

type ReturnRow = {
  id: string;
  return_code: string;
  return_date: string;
  total_base: number | string;
  status: string;
};

type OperationFeedRow = {
  id: string;
  code: string;
  date: string;
  label: string;
  detail: string;
  value: number | null;
  icon: typeof ArrowLeftRight;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatMoney(value: number | string, currency: string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatNumber(value: number | string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en", { maximumFractionDigits: 6 }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function isInboundMovement(type: MovementRow["movement_type"]) {
  return ["receipt", "transfer_in", "adjustment_in", "sales_return"].includes(type);
}

export default async function BusinessInventoryPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/business/${businessSlug}/inventory`)}`);
  }

  const businessResult = await supabase
    .from("businesses")
    .select("id, name, slug, business_type, base_currency")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (!businessResult.data) notFound();
  const business = businessResult.data as BusinessRow;

  const membershipResult = await supabase
    .from("business_members")
    .select("role, status, permissions")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipResult.data || membershipResult.data.status !== "active") notFound();

  const role = membershipResult.data.role;
  const permissions = membershipResult.data.permissions ?? [];
  const wildcard = permissions.includes("*");
  const canManageInventory =
    ["owner", "admin", "manager", "inventory"].includes(role) ||
    wildcard ||
    permissions.includes("inventory.manage");
  const canTransfer = canManageInventory || permissions.includes("inventory.transfer");
  const canAdjust = canManageInventory || permissions.includes("inventory.adjust");
  const canReturnSales =
    ["owner", "admin", "accountant", "manager", "sales"].includes(role) ||
    wildcard ||
    permissions.includes("sales.manage") ||
    permissions.includes("sales.return");
  const canReturnPurchases =
    ["owner", "admin", "accountant", "manager"].includes(role) ||
    wildcard ||
    permissions.includes("purchases.manage") ||
    permissions.includes("purchases.return");

  const [
    settingsResult,
    productsResult,
    warehousesResult,
    balancesResult,
    movementsResult,
    transfersResult,
    adjustmentsResult,
    salesReturnsResult,
    purchaseReturnsResult,
  ] = await Promise.all([
    supabase
      .from("business_inventory_settings")
      .select("valuation_method, allow_negative_stock, default_warehouse_id")
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase
      .from("business_products")
      .select(
        "id, sku, name, unit_of_measure, sales_price, purchase_cost_hint, reorder_level, status",
      )
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("business_warehouses")
      .select("id, code, name, is_default, status")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("business_inventory_balances")
      .select(
        "product_id, warehouse_id, quantity_on_hand, inventory_value_base, average_cost_base",
      )
      .eq("business_id", business.id),
    supabase
      .from("business_stock_movements")
      .select(
        "id, movement_number, movement_type, movement_date, product_id, warehouse_id, quantity, unit_cost_base, total_value_base, source_type, status",
      )
      .eq("business_id", business.id)
      .order("movement_date", { ascending: false })
      .order("movement_number", { ascending: false })
      .limit(100),
    supabase
      .from("business_warehouse_transfers")
      .select("id, transfer_code, transfer_date, from_warehouse_id, to_warehouse_id, status")
      .eq("business_id", business.id)
      .order("transfer_date", { ascending: false })
      .order("transfer_number", { ascending: false })
      .limit(20),
    supabase
      .from("business_stock_adjustments")
      .select("id, adjustment_code, adjustment_date, reason, status")
      .eq("business_id", business.id)
      .order("adjustment_date", { ascending: false })
      .order("adjustment_number", { ascending: false })
      .limit(20),
    supabase
      .from("business_sales_returns")
      .select("id, return_code, return_date, total_base, status")
      .eq("business_id", business.id)
      .order("return_date", { ascending: false })
      .order("return_number", { ascending: false })
      .limit(20),
    supabase
      .from("business_purchase_returns")
      .select("id, return_code, return_date, total_base, status")
      .eq("business_id", business.id)
      .order("return_date", { ascending: false })
      .order("return_number", { ascending: false })
      .limit(20),
  ]);

  const products = (productsResult.data ?? []) as ProductRow[];
  const warehouses = (warehousesResult.data ?? []) as WarehouseRow[];
  const balances = (balancesResult.data ?? []) as BalanceRow[];
  const movements = (movementsResult.data ?? []) as MovementRow[];
  const transfers = (transfersResult.data ?? []) as TransferRow[];
  const adjustments = (adjustmentsResult.data ?? []) as AdjustmentRow[];
  const salesReturns = (salesReturnsResult.data ?? []) as ReturnRow[];
  const purchaseReturns = (purchaseReturnsResult.data ?? []) as ReturnRow[];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));

  const quantitiesByProduct = new Map<string, number>();
  for (const balance of balances) {
    quantitiesByProduct.set(
      balance.product_id,
      (quantitiesByProduct.get(balance.product_id) ?? 0) + Number(balance.quantity_on_hand),
    );
  }

  const totalQuantity = balances.reduce(
    (sum, balance) => sum + Number(balance.quantity_on_hand),
    0,
  );
  const totalInventoryValue = balances.reduce(
    (sum, balance) => sum + Number(balance.inventory_value_base),
    0,
  );
  const lowStockProducts = products.filter(
    (product) =>
      Number(product.reorder_level) > 0 &&
      (quantitiesByProduct.get(product.id) ?? 0) <= Number(product.reorder_level),
  );

  const operations: OperationFeedRow[] = [
    ...transfers.map((transfer) => ({
      id: transfer.id,
      code: transfer.transfer_code,
      date: transfer.transfer_date,
      label: "Warehouse transfer",
      detail: `${warehouseMap.get(transfer.from_warehouse_id)?.name ?? "Warehouse"} → ${
        warehouseMap.get(transfer.to_warehouse_id)?.name ?? "Warehouse"
      } · ${transfer.status}`,
      value: null,
      icon: ArrowLeftRight,
    })),
    ...adjustments.map((adjustment) => ({
      id: adjustment.id,
      code: adjustment.adjustment_code,
      date: adjustment.adjustment_date,
      label: "Stock count",
      detail: `${adjustment.reason} · ${adjustment.status}`,
      value: null,
      icon: ClipboardCheck,
    })),
    ...salesReturns.map((salesReturn) => ({
      id: salesReturn.id,
      code: salesReturn.return_code,
      date: salesReturn.return_date,
      label: "Sales return",
      detail: `Customer credit note · ${salesReturn.status}`,
      value: Number(salesReturn.total_base),
      icon: RotateCcw,
    })),
    ...purchaseReturns.map((purchaseReturn) => ({
      id: purchaseReturn.id,
      code: purchaseReturn.return_code,
      date: purchaseReturn.return_date,
      label: "Purchase return",
      detail: `Supplier debit note · ${purchaseReturn.status}`,
      value: Number(purchaseReturn.total_base),
      icon: Undo2,
    })),
  ]
    .sort((left, right) => right.date.localeCompare(left.date) || right.code.localeCompare(left.code))
    .slice(0, 30);

  const loadError = [
    settingsResult.error,
    productsResult.error,
    warehousesResult.error,
    balancesResult.error,
    movementsResult.error,
    transfersResult.error,
    adjustmentsResult.error,
    salesReturnsResult.error,
    purchaseReturnsResult.error,
  ].find(Boolean);

  if (loadError) {
    console.error("Business inventory workspace load failed", { code: loadError.code });
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/business/${business.slug}`}
            className="finance-focus inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-button)] px-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {business.name}
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Weighted-average and immutable operations active
          </span>
        </div>

        <header className="mt-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            {formatLabel(business.business_type)} stock control
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
            Inventory and warehouses
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-base">
            Purchases, sales, transfers, physical counts, customer returns, supplier returns, stock
            valuation, and accounting all use the same tenant-scoped source of truth.
          </p>
        </header>

        {loadError ? (
          <section className="mt-6 rounded-[var(--radius-card)] bg-danger-soft px-4 py-4 text-sm text-danger">
            Some inventory information could not be loaded. No stock balance or accounting entry was changed.
          </section>
        ) : null}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <Boxes className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Active products</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {products.length}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <WarehouseIcon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Warehouses</p>
            <strong className="mt-1 block text-xl font-black tabular-nums text-text-primary">
              {warehouses.length}
            </strong>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <Scale className="size-5 text-success" aria-hidden="true" />
            <p className="mt-4 text-xs font-bold text-text-secondary">Inventory value</p>
            <strong className="mt-1 block truncate text-lg font-black text-text-primary">
              {formatMoney(totalInventoryValue, business.base_currency)}
            </strong>
            <span className="mt-1 block text-xs text-text-secondary">
              {formatNumber(totalQuantity)} total units
            </span>
          </article>
          <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
            <AlertTriangle
              className={`size-5 ${lowStockProducts.length > 0 ? "text-warning" : "text-success"}`}
              aria-hidden="true"
            />
            <p className="mt-4 text-xs font-bold text-text-secondary">Low stock</p>
            <strong
              className={`mt-1 block text-xl font-black tabular-nums ${
                lowStockProducts.length > 0 ? "text-warning" : "text-success"
              }`}
            >
              {lowStockProducts.length}
            </strong>
          </article>
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] bg-surface-secondary px-4 py-4 text-sm text-text-secondary sm:px-5">
          Valuation method: <strong className="text-text-primary">Weighted average</strong> · Negative
          stock: <strong className="text-text-primary">Blocked</strong> · Default warehouse:{" "}
          <strong className="text-text-primary">
            {warehouseMap.get(settingsResult.data?.default_warehouse_id ?? "")?.name ?? "Main warehouse"}
          </strong>
        </section>

        {canManageInventory ? (
          <div className="mt-8">
            <InventoryCatalogForms businessId={business.id} baseCurrency={business.base_currency} />
          </div>
        ) : null}

        {canTransfer || canAdjust || canReturnSales || canReturnPurchases ? (
          <div className="mt-8">
            <InventoryOperationsForms
              businessId={business.id}
              baseCurrency={business.base_currency}
              canTransfer={canTransfer}
              canAdjust={canAdjust}
              canReturnSales={canReturnSales}
              canReturnPurchases={canReturnPurchases}
            />
          </div>
        ) : null}

        <section className="mt-8 rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
          <div className="flex items-start gap-3">
            <PackageSearch className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="font-black text-text-primary">Stock positions</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Quantity, weighted-average unit cost, and inventory value by warehouse.
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
              Add the first product. Supplier bills or a verified opening count will create stock.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.08em] text-text-secondary">
                  <tr>
                    <th className="pb-3 pr-4">Product</th>
                    <th className="pb-3 pr-4">Warehouse</th>
                    <th className="pb-3 pr-4 text-right">Quantity</th>
                    <th className="pb-3 pr-4 text-right">Average cost</th>
                    <th className="pb-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {products.flatMap((product) => {
                    const positions = balances.filter((balance) => balance.product_id === product.id);
                    if (positions.length === 0) {
                      return [
                        <tr key={`${product.id}-empty`} className="border-t border-border/60">
                          <td className="py-4 pr-4">
                            <strong className="block text-text-primary">{product.name}</strong>
                            <span className="text-xs text-text-secondary">
                              {product.sku} · {product.unit_of_measure}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-text-secondary">No stock yet</td>
                          <td className="py-4 pr-4 text-right tabular-nums">0</td>
                          <td className="py-4 pr-4 text-right tabular-nums">
                            {formatMoney(0, business.base_currency)}
                          </td>
                          <td className="py-4 text-right font-black tabular-nums text-text-primary">
                            {formatMoney(0, business.base_currency)}
                          </td>
                        </tr>,
                      ];
                    }
                    return positions.map((position) => {
                      const low =
                        Number(product.reorder_level) > 0 &&
                        Number(position.quantity_on_hand) <= Number(product.reorder_level);
                      return (
                        <tr
                          key={`${product.id}-${position.warehouse_id}`}
                          className="border-t border-border/60"
                        >
                          <td className="py-4 pr-4">
                            <strong className="block text-text-primary">{product.name}</strong>
                            <span className="text-xs text-text-secondary">
                              {product.sku} · {product.unit_of_measure}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-text-secondary">
                            {warehouseMap.get(position.warehouse_id)?.name ?? "Warehouse"}
                          </td>
                          <td
                            className={`py-4 pr-4 text-right font-black tabular-nums ${
                              low ? "text-warning" : "text-text-primary"
                            }`}
                          >
                            {formatNumber(position.quantity_on_hand)}
                          </td>
                          <td className="py-4 pr-4 text-right tabular-nums text-text-secondary">
                            {formatMoney(position.average_cost_base, business.base_currency)}
                          </td>
                          <td className="py-4 text-right font-black tabular-nums text-text-primary">
                            {formatMoney(position.inventory_value_base, business.base_currency)}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
          <h2 className="font-black text-text-primary">Recent inventory operations</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Posted transfers, physical counts, customer credit notes, and supplier debit notes.
          </p>
          {operations.length === 0 ? (
            <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
              Inventory operations will appear after the first transfer, count, or return.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {operations.map((operation) => {
                const Icon = operation.icon;
                return (
                  <article
                    key={`${operation.label}-${operation.id}`}
                    className="flex items-center justify-between gap-4 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <strong className="block truncate text-text-primary">
                          {operation.code} · {operation.label}
                        </strong>
                        <span className="mt-1 block truncate text-xs text-text-secondary">
                          {operation.detail} · {formatDate(operation.date)}
                        </span>
                      </div>
                    </div>
                    {operation.value !== null ? (
                      <strong className="shrink-0 text-sm tabular-nums text-text-primary">
                        {formatMoney(operation.value, business.base_currency)}
                      </strong>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
          <h2 className="font-black text-text-primary">Recent stock movements</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Immutable receipts, issues, transfers, count differences, and return movements.
          </p>

          {movements.length === 0 ? (
            <div className="mt-5 rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
              Stock movements will appear when inventory is purchased, sold, moved, counted, or returned.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {movements.map((movement) => {
                const inbound = isInboundMovement(movement.movement_type);
                const MovementIcon = inbound ? ArrowDownToLine : ArrowUpFromLine;
                return (
                  <article
                    key={movement.id}
                    className="flex flex-col gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-button)] ${
                          inbound ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                        }`}
                      >
                        <MovementIcon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <strong className="block truncate text-text-primary">
                          {productMap.get(movement.product_id)?.name ?? "Product"}
                        </strong>
                        <span className="mt-1 block text-xs text-text-secondary">
                          #{movement.movement_number} · {warehouseMap.get(movement.warehouse_id)?.name ?? "Warehouse"} · {formatDate(movement.movement_date)}
                        </span>
                        <span className="mt-1 block text-xs text-text-secondary">
                          {formatLabel(movement.movement_type)} · {formatLabel(movement.source_type)} · {movement.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <strong className="block tabular-nums text-text-primary">
                        {inbound ? "+" : "−"}
                        {formatNumber(movement.quantity)}
                      </strong>
                      <span className="text-xs tabular-nums text-text-secondary">
                        {formatMoney(movement.total_value_base, business.base_currency)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
