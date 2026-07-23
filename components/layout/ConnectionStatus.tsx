"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "@/components/icons/jalvoro/compat";

export default function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="print:hidden flex min-h-10 items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-3 py-2 text-center text-xs font-semibold text-warning"
    >
      <WifiOff size={15} aria-hidden="true" />
      You are offline. Saved data remains unchanged; reconnect before refreshing or submitting forms.
    </div>
  );
}
