import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClientMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: createBrowserClientMock,
}));

import {
  createClient,
  verifyDestructiveMutationResult,
} from "./client";

type QueryResult = {
  data: unknown;
  error: unknown;
};

function createThenableQuery(result: QueryResult, calls: string[]) {
  const query = {
    eq(column: string, value: unknown) {
      calls.push(`eq:${column}:${String(value)}`);
      return query;
    },
    is(column: string, value: unknown) {
      calls.push(`is:${column}:${String(value)}`);
      return query;
    },
    select(columns: string) {
      calls.push(`select:${columns}`);
      return query;
    },
    then<TResult1 = QueryResult, TResult2 = never>(
      onFulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      calls.push("execute");
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };

  return query;
}

function mockBrowserClient(result: QueryResult) {
  const calls: string[] = [];
  const query = createThenableQuery(result, calls);
  const tableBuilder = {
    delete() {
      calls.push("delete");
      return query;
    },
    update(payload: unknown) {
      calls.push(`update:${JSON.stringify(payload)}`);
      return query;
    },
  };

  createBrowserClientMock.mockReturnValue({
    from() {
      return tableBuilder;
    },
    storage: {
      from() {
        return {};
      },
    },
  });

  return calls;
}

describe("destructive mutation verification", () => {
  beforeEach(() => {
    createBrowserClientMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("keeps a successful single-row delete result unchanged", () => {
    const result = {
      data: [{ id: "goal-1" }],
      error: null,
      status: 200,
      statusText: "OK",
    };

    expect(
      verifyDestructiveMutationResult(result, "goals", "delete"),
    ).toBe(result);
  });

  it("allows successful multi-row destructive mutations", () => {
    const result = {
      data: [{ id: "row-1" }, { id: "row-2" }],
      error: null,
    };

    expect(
      verifyDestructiveMutationResult(result, "transactions", "soft delete"),
    ).toBe(result);
  });

  it("keeps a successful maybeSingle result unchanged", () => {
    const result = {
      data: { id: "payable-1" },
      error: null,
    };

    expect(
      verifyDestructiveMutationResult(result, "liabilities", "delete"),
    ).toBe(result);
  });

  it("fails closed when PostgREST reports success but affects zero rows", () => {
    const result = verifyDestructiveMutationResult(
      { data: [], error: null, status: 200, statusText: "OK" },
      "investments",
      "delete",
    ) as {
      data: unknown;
      error: { code: string; message: string; hint: string } | null;
    };

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      code: "JF_MUTATION_NOT_APPLIED",
      message: "Delete did not affect any investments row.",
    });
    expect(result.error?.hint).not.toContain("policy");
  });

  it("fails closed when a soft delete returns no representation", () => {
    const result = verifyDestructiveMutationResult(
      { data: null, error: null },
      "transactions",
      "soft delete",
    ) as {
      data: unknown;
      error: { code: string; message: string } | null;
    };

    expect(result.error).toMatchObject({
      code: "JF_MUTATION_NOT_APPLIED",
      message: "Soft delete did not affect any transactions row.",
    });
  });

  it("preserves genuine database errors", () => {
    const databaseError = {
      message: "foreign key violation",
      details: null,
      hint: null,
      code: "23503",
    };
    const result = { data: null, error: databaseError };

    expect(
      verifyDestructiveMutationResult(result, "goals", "delete"),
    ).toBe(result);
  });

  it("blocks unfiltered hard deletes before a request can execute", async () => {
    const calls = mockBrowserClient({ data: [{ id: "goal-1" }], error: null });
    const client = createClient();

    const result = await (client.from("goals" as never) as any).delete();

    expect(calls).toEqual(["delete"]);
    expect(result.error).toMatchObject({
      code: "JF_DESTRUCTIVE_FILTER_REQUIRED",
    });
  });

  it("requests a deletion receipt after filters and rejects zero-row deletes", async () => {
    const calls = mockBrowserClient({ data: [], error: null });
    const client = createClient();

    const result = await (client.from("goals" as never) as any)
      .delete()
      .eq("id", "goal-1");

    expect(calls).toEqual([
      "delete",
      "eq:id:goal-1",
      "select:id",
      "execute",
    ]);
    expect(result.error).toMatchObject({
      code: "JF_MUTATION_NOT_APPLIED",
    });
  });

  it("verifies deleted_at soft deletes without changing ordinary updates", async () => {
    const softDeleteCalls = mockBrowserClient({ data: [], error: null });
    const softDeleteClient = createClient();

    const softDeleteResult = await (
      softDeleteClient.from("transactions" as never) as any
    )
      .update({ deleted_at: "2026-07-23T20:00:00.000Z" })
      .eq("id", "transaction-1")
      .is("deleted_at", null);

    expect(softDeleteCalls).toEqual([
      'update:{"deleted_at":"2026-07-23T20:00:00.000Z"}',
      "eq:id:transaction-1",
      "is:deleted_at:null",
      "select:id",
      "execute",
    ]);
    expect(softDeleteResult.error).toMatchObject({
      code: "JF_MUTATION_NOT_APPLIED",
    });

    const ordinaryUpdateCalls = mockBrowserClient({ data: null, error: null });
    const ordinaryUpdateClient = createClient();
    const ordinaryResult = await (
      ordinaryUpdateClient.from("transactions" as never) as any
    )
      .update({ note: "Updated note" })
      .eq("id", "transaction-1");

    expect(ordinaryUpdateCalls).toEqual([
      'update:{"note":"Updated note"}',
      "eq:id:transaction-1",
      "execute",
    ]);
    expect(ordinaryResult).toEqual({ data: null, error: null });
  });
});
