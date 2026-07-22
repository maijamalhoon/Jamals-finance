import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AcceptBusinessInvitation from "@/components/business/AcceptBusinessInvitation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accept Business Invitation",
  robots: { index: false, follow: false },
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AcceptBusinessInvitationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const token = single(query.token)?.trim() ?? "";
  const nextPath = `/business/invitations/accept?token=${encodeURIComponent(token)}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <AcceptBusinessInvitation token={token} />
    </main>
  );
}
