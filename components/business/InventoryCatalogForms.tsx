"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, PackagePlus, Warehouse } from "@/components/icons/jalvoro/compat";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type InventoryCatalogFormsProps = {
  businessId: string;
  baseCurrency: string;
};

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function InventoryCatalogForms({
  businessId,
  baseCurrency,
}: InventoryCatalogFormsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [productSaving, setProductSaving] = useState(false);
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("unit");
  const [salesPrice, setSalesPrice] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [reorderLevel, setReorderLevel] = useState("0");

  const [warehouseSaving, setWarehouseSaving] = useState(false);
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseCode, setWarehouseCode] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (productSaving) return;

    const cleanName = productName.trim();
    const cleanSku = sku.trim().toUpperCase();
    if (cleanName.length < 2 || !/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(cleanSku)) {
      toast.error("Enter a product name and a valid SKU.");
      return;
    }

    const parsedSalesPrice = numeric(salesPrice);
    const parsedPurchaseCost = numeric(purchaseCost);
    const parsedReorderLevel = numeric(reorderLevel);
    if (parsedSalesPrice < 0 || parsedPurchaseCost < 0 || parsedReorderLevel < 0) {
      toast.error("Prices and reorder level cannot be negative.");
      return;
    }

    setProductSaving(true);
    const { error } = await supabase.rpc("upsert_business_product", {
      p_business_id: businessId,
      p_name: cleanName,
      p_sku: cleanSku,
      p_unit_of_measure: unit.trim() || "unit",
      p_sales_price: parsedSalesPrice,
      p_purchase_cost_hint: parsedPurchaseCost,
      p_reorder_level: parsedReorderLevel,
      p_product_id: null,
    });
    setProductSaving(false);

    if (error) {
      console.error("Inventory product creation failed", { code: error.code });
      toast.error("Product was not created. The SKU may already exist.");
      return;
    }

    setProductName("");
    setSku("");
    setSalesPrice("");
    setPurchaseCost("");
    setReorderLevel("0");
    toast.success("Product added to the inventory catalog.");
    router.refresh();
  }

  async function createWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (warehouseSaving) return;

    const cleanName = warehouseName.trim();
    const cleanCode = warehouseCode.trim().toUpperCase();
    if (cleanName.length < 2 || !/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(cleanCode)) {
      toast.error("Enter a warehouse name and valid code.");
      return;
    }

    setWarehouseSaving(true);
    const { error } = await supabase.rpc("upsert_business_warehouse", {
      p_business_id: businessId,
      p_name: cleanName,
      p_code: cleanCode,
      p_is_default: makeDefault,
      p_warehouse_id: null,
    });
    setWarehouseSaving(false);

    if (error) {
      console.error("Warehouse creation failed", { code: error.code });
      toast.error("Warehouse was not created. The code may already exist.");
      return;
    }

    setWarehouseName("");
    setWarehouseCode("");
    setMakeDefault(false);
    toast.success("Warehouse added.");
    router.refresh();
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <form
        onSubmit={createProduct}
        className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
            <PackagePlus className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-black text-text-primary">Add inventory product</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Product accounts are linked automatically to Sales, Inventory, and Cost of Goods Sold.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold text-text-primary">Product name</span>
            <Input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Example product" maxLength={160} disabled={productSaving} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">SKU</span>
            <Input value={sku} onChange={(event) => setSku(event.target.value.toUpperCase())} placeholder="SKU-001" maxLength={40} disabled={productSaving} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Unit</span>
            <Input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="unit, kg, box" maxLength={30} disabled={productSaving} required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Sales price · {baseCurrency}</span>
            <Input value={salesPrice} onChange={(event) => setSalesPrice(event.target.value)} inputMode="decimal" placeholder="0" disabled={productSaving} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold text-text-primary">Cost hint · {baseCurrency}</span>
            <Input value={purchaseCost} onChange={(event) => setPurchaseCost(event.target.value)} inputMode="decimal" placeholder="0" disabled={productSaving} />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold text-text-primary">Reorder level</span>
            <Input value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} inputMode="decimal" placeholder="0" disabled={productSaving} />
          </label>
        </div>

        <Button type="submit" className="mt-5 w-full sm:w-auto" loading={productSaving} loadingLabel="Adding product...">
          <Boxes aria-hidden="true" /> Add product
        </Button>
      </form>

      <form
        onSubmit={createWarehouse}
        className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
            <Warehouse className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-black text-text-primary">Add warehouse</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Each stock position is isolated by product and warehouse. One active warehouse is the default.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold text-text-primary">Warehouse name</span>
            <Input value={warehouseName} onChange={(event) => setWarehouseName(event.target.value)} placeholder="Secondary warehouse" maxLength={120} disabled={warehouseSaving} required />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold text-text-primary">Warehouse code</span>
            <Input value={warehouseCode} onChange={(event) => setWarehouseCode(event.target.value.toUpperCase())} placeholder="WH-02" maxLength={20} disabled={warehouseSaving} required />
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 sm:col-span-2">
            <input type="checkbox" checked={makeDefault} onChange={(event) => setMakeDefault(event.target.checked)} disabled={warehouseSaving} className="size-4 accent-primary" />
            <span className="text-sm font-bold text-text-primary">Make this the default warehouse</span>
          </label>
        </div>

        <Button type="submit" className="mt-5 w-full sm:w-auto" loading={warehouseSaving} loadingLabel="Adding warehouse...">
          <Warehouse aria-hidden="true" /> Add warehouse
        </Button>
      </form>
    </section>
  );
}
