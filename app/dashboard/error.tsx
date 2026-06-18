"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-white font-medium text-sm">Something went wrong</p>
        <p className="mt-1 text-xs text-slate-500">{error.message}</p>
      </div>
      <button
        onClick={reset}
        className="primary-action"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  );
}
