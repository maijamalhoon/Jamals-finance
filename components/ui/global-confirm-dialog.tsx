"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmRequest = {
  message: string;
  source: HTMLElement | null;
};

type ConfirmAction = {
  label: string;
  destructive: boolean;
};

function getActionElement(event: MouseEvent): HTMLElement | null {
  const selector =
    'button, [role="button"], a, input[type="button"], input[type="submit"]';

  for (const node of event.composedPath()) {
    if (node instanceof HTMLElement && node.matches(selector)) return node;
  }

  return event.target instanceof HTMLElement
    ? event.target.closest<HTMLElement>(selector)
    : null;
}

function getConfirmAction(message: string): ConfirmAction {
  const action = message.trim().match(/^(delete|remove|archive|restore)\b/i)?.[1];

  if (!action) return { label: "Confirm", destructive: false };

  const normalized = action.toLowerCase();
  return {
    label: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    destructive: normalized === "delete" || normalized === "remove",
  };
}

function getConfirmDescription(message: string) {
  const compact = message.trim().replace(/\s+/g, " ");
  if (!compact) return "Do you want to continue with this action?";

  const action = compact.match(/^(delete|remove|archive|restore)\b/i)?.[1];
  if (!action) return compact;

  const normalized = action.toLowerCase();
  const rest = compact.slice(action.length).trimStart();
  let description = `Do you want to ${normalized} ${rest}`;

  if (
    (normalized === "delete" || normalized === "remove") &&
    !/cannot be undone|progress|balance|existing transactions/i.test(description)
  ) {
    description += " This action cannot be undone.";
  }

  return description;
}

export default function GlobalConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const lastActionElementRef = useRef<HTMLElement | null>(null);
  const bypassNextConfirmRef = useRef(false);

  useEffect(() => {
    const previousConfirm = window.confirm;

    const captureActionElement = (event: MouseEvent) => {
      lastActionElementRef.current = getActionElement(event);
    };

    const captureKeyboardAction = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      lastActionElementRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    };

    const customConfirm = (message?: string) => {
      if (bypassNextConfirmRef.current) {
        bypassNextConfirmRef.current = false;
        return true;
      }

      setRequest({
        message: String(message ?? ""),
        source: lastActionElementRef.current,
      });
      return false;
    };

    document.addEventListener("click", captureActionElement, true);
    document.addEventListener("keydown", captureKeyboardAction, true);
    window.confirm = customConfirm;

    return () => {
      document.removeEventListener("click", captureActionElement, true);
      document.removeEventListener("keydown", captureKeyboardAction, true);
      if (window.confirm === customConfirm) window.confirm = previousConfirm;
    };
  }, []);

  const action = useMemo(
    () => getConfirmAction(request?.message ?? ""),
    [request?.message],
  );
  const description = useMemo(
    () => getConfirmDescription(request?.message ?? ""),
    [request?.message],
  );

  function closeDialog() {
    bypassNextConfirmRef.current = false;
    setRequest(null);
  }

  function confirmAction() {
    const source = request?.source;
    setRequest(null);

    if (!source?.isConnected) return;

    bypassNextConfirmRef.current = true;
    window.setTimeout(() => {
      if (source.isConnected) source.click();
      window.setTimeout(() => {
        bypassNextConfirmRef.current = false;
      }, 0);
    }, 0);
  }

  return (
    <Dialog
      open={Boolean(request)}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent
        showCloseButton={false}
        data-global-confirm-dialog
        className="w-[calc(100vw-1rem)] max-w-[25rem] gap-0 overflow-hidden rounded-[28px] border-border/80 bg-card p-0 text-text-primary shadow-[0_28px_90px_rgb(0_0_0/0.28)] sm:w-full"
      >
        <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <DialogTitle className="text-[20px] font-black leading-7 tracking-[-0.02em] text-text-primary">
            Are you sure?
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm font-medium leading-6 text-text-secondary">
            {description}
          </DialogDescription>
        </div>

        <div className="grid grid-cols-2 gap-2.5 border-t border-border bg-surface-secondary/65 p-3.5 sm:p-4">
          <button
            type="button"
            onClick={closeDialog}
            className="finance-focus inline-flex min-h-[46px] items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-bold text-text-primary transition-[background-color,border-color,transform] duration-[var(--motion-duration-fast)] hover:bg-hover active:scale-[0.985]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmAction}
            className={`finance-focus inline-flex min-h-[46px] items-center justify-center rounded-full px-4 text-sm font-black text-text-inverse shadow-sm transition-[filter,transform,box-shadow] duration-[var(--motion-duration-fast)] hover:brightness-[1.05] active:scale-[0.985] ${
              action.destructive ? "bg-danger" : "bg-active"
            }`}
          >
            {action.label}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
