import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ReportsRedirectPage() {
  redirect("/dashboard/analytics");
}
