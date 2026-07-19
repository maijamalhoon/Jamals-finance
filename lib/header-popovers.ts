export const HEADER_POPOVER_OPEN_EVENT = "jamal-header-popover-open";

export type HeaderPopoverSource = "notifications" | "profile";

export function announceHeaderPopoverOpen(source: HeaderPopoverSource) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<HeaderPopoverSource>(HEADER_POPOVER_OPEN_EVENT, {
      detail: source,
    }),
  );
}

export function getHeaderPopoverSource(event: Event) {
  const detail = (event as CustomEvent<unknown>).detail;
  return detail === "notifications" || detail === "profile" ? detail : null;
}
