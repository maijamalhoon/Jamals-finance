"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PageHeadingActionKey =
  | "accounts"
  | "income"
  | "expenses"
  | "goals"
  | "payables"
  | "investments"
  | "reports";

function isAuthoredTopActionWrapper(element: HTMLElement | null) {
  return Boolean(
    element?.classList.contains("flex") &&
      element.classList.contains("justify-end"),
  );
}

export default function PageHeadingActionPortal({
  page,
  children,
  force = false,
}: {
  page: PageHeadingActionKey;
  children: ReactNode;
  force?: boolean;
}) {
  const pathname = usePathname();
  const markerRef = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(null);

    if (pathname !== `/dashboard/${page}`) return;

    const markerParent = markerRef.current?.parentElement ?? null;
    if (!force && !isAuthoredTopActionWrapper(markerParent)) return;

    setTarget(document.getElementById(`jf-${page}-heading-actions`));
  }, [force, page, pathname]);

  if (target) {
    return createPortal(
      <div className="jf-page-heading-action" data-jf-page-action={page}>
        {children}
      </div>,
      target,
    );
  }

  return (
    <>
      <span ref={markerRef} hidden aria-hidden="true" />
      {children}
    </>
  );
}
