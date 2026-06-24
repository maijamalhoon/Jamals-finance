import { notFound } from "next/navigation";
import SentryExampleClient from "./SentryExampleClient";

export default function Page() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <SentryExampleClient />;
}
