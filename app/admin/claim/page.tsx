import { redirect } from "next/navigation";

import { acceptAdminInvitationAction } from "@/app/admin/access-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const RESULTS = new Set(["invalid", "missing", "forbidden", "unavailable"]);

export default async function AdminInvitationClaimPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=%2Fadmin%2Fclaim");

  const params = await searchParams;
  const result =
    typeof params.result === "string" && RESULTS.has(params.result)
      ? params.result
      : null;

  return (
    <div className="mx-auto w-full max-w-xl py-8 sm:py-12">
      <Card className="border-border/70 bg-card/92 shadow-sm">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-info">
            Private panel invitation
          </p>
          <CardTitle className="text-2xl">Accept an Admin Panel role</CardTitle>
          <CardDescription className="leading-6">
            Enter the one-time code shared by a JALVORO Owner. Your signed-in email must match the invitation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <div className="rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm text-warning">
              {result === "missing"
                ? "This code is unavailable, expired, revoked, already used, or belongs to another email."
                : result === "forbidden"
                  ? "This signed-in account cannot accept the invitation."
                  : result === "invalid"
                    ? "The access code format is invalid."
                    : "The invitation could not be accepted. No access grant was changed."}
            </div>
          ) : null}

          <form action={acceptAdminInvitationAction} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">One-time access code</span>
              <input
                className="min-h-12 w-full rounded-xl border border-border/80 bg-background px-3 py-2 font-mono text-sm uppercase text-foreground outline-none transition focus:border-info/60 focus:ring-2 focus:ring-info/15"
                name="accessCode"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                maxLength={44}
                placeholder="JAV-…"
              />
            </label>
            <Button type="submit" className="w-full">
              Verify email and accept invitation
            </Button>
          </form>

          <div className="rounded-2xl border border-border/70 bg-surface-secondary/35 px-4 py-3 text-xs leading-5 text-muted-foreground">
            Codes are single-use, expire within seven days, are locked to one email hash, and are never stored in raw form.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
