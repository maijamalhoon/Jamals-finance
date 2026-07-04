type TransactionLoadOptions = {
  type?: "income" | "expense";
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  parent_id?: string | null;
};

export async function loadTransactions(
  supabase: any,
  options: TransactionLoadOptions = {},
): Promise<any[]> {
  let query = supabase
    .from("transactions")
    .select("*, categories(id, name, color, parent_id), accounts(name)")
    .order("date", { ascending: false });

  if (options.type) query = query.eq("type", options.type);
  if (options.from) query = query.gte("date", options.from);
  if (options.to) query = query.lte("date", options.to);
  if (options.category && options.category !== "all") {
    query = query.eq("category_id", options.category);
  }
  if (options.account && options.account !== "all") {
    query = query.eq("account_id", options.account);
  }
  if (
    typeof options.minAmount === "number" &&
    Number.isFinite(options.minAmount)
  ) {
    query = query.gte("amount", options.minAmount);
  }
  if (
    typeof options.maxAmount === "number" &&
    Number.isFinite(options.maxAmount)
  ) {
    query = query.lte("amount", options.maxAmount);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load transactions", error.message);
    return [];
  }

  const rows = data ?? [];
  const parentIds = Array.from(
    new Set(
      rows
        .map((transaction: any) => transaction.categories?.parent_id)
        .filter(Boolean),
    ),
  );

  if (parentIds.length === 0) return rows;

  const { data: parents, error: parentError } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", parentIds);

  if (parentError) {
    console.error("Failed to load parent categories", parentError.message);
    return rows;
  }

  const parentById = new Map(
    (parents ?? []).map((category: Pick<CategoryRow, "id" | "name">) => [
      category.id,
      { name: category.name },
    ]),
  );

  return rows.map((transaction: any) => {
    const category = transaction.categories as CategoryRow | null;
    if (!category?.parent_id) return transaction;

    return {
      ...transaction,
      categories: {
        ...category,
        parent: parentById.get(category.parent_id) ?? null,
      },
    };
  });
}
