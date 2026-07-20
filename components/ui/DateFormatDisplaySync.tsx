"use client";

import { useEffect } from "react";

type DateFormat = "MMM d, yyyy" | "dd MMM yyyy" | "yyyy-MM-dd";

const DATE_FORMAT_STORAGE_KEY = "jamal-date-format";
const DATE_INPUT_SELECTOR =
  'input[aria-haspopup="dialog"][aria-controls$="-calendar"]';
const DATE_WHEEL_SELECTOR =
  '[role="spinbutton"][aria-haspopup="dialog"][aria-controls$="-calendar"]';
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const dateFormatDisplayCss = `
[data-finance-date-format-host="true"] {
  position: relative !important;
}

[data-finance-date-format-overlay] {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  padding-inline: 0.75rem 2.75rem;
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  transition: opacity var(--motion-duration-fast, 160ms) ease;
}

input[data-finance-date-formatted="true"]:not(:focus) {
  color: transparent !important;
  caret-color: transparent !important;
}

[data-finance-date-format-host="true"]:focus-within
  [data-finance-date-format-overlay] {
  opacity: 0;
}
`;

function isDateFormat(value: string | null): value is DateFormat {
  return (
    value === "MMM d, yyyy" ||
    value === "dd MMM yyyy" ||
    value === "yyyy-MM-dd"
  );
}

function readDateFormat(): DateFormat {
  const stored = window.localStorage.getItem(DATE_FORMAT_STORAGE_KEY);
  return isDateFormat(stored) ? stored : "MMM d, yyyy";
}

function parseDateParts(value: string) {
  const trimmed = value.trim();
  const dmyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  const day = Number(dmyMatch?.[1] ?? isoMatch?.[3]);
  const month = Number(dmyMatch?.[2] ?? isoMatch?.[2]);
  const year = Number(dmyMatch?.[3] ?? isoMatch?.[1]);

  if (!day || !month || !year || month > 12) return null;

  const parsed = new Date(year, month - 1, day, 12);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

function formatDate(value: string, format: DateFormat) {
  const parts = parseDateParts(value);
  if (!parts) return "";

  const day = String(parts.day).padStart(2, "0");
  const month = String(parts.month).padStart(2, "0");
  const monthLabel = MONTH_LABELS[parts.month - 1];

  if (format === "yyyy-MM-dd") {
    return `${parts.year}-${month}-${day}`;
  }

  if (format === "dd MMM yyyy") {
    return `${day} ${monthLabel} ${parts.year}`;
  }

  return `${monthLabel} ${parts.day}, ${parts.year}`;
}

function syncDateInput(input: HTMLInputElement, format: DateFormat) {
  const host = input.parentElement;
  if (!host) return;

  const formatted = formatDate(input.value, format);
  let overlay = host.querySelector<HTMLElement>(
    ":scope > [data-finance-date-format-overlay]",
  );

  if (!formatted) {
    overlay?.remove();
    delete input.dataset.financeDateFormatted;
    delete host.dataset.financeDateFormatHost;
    return;
  }

  if (!overlay) {
    overlay = document.createElement("span");
    overlay.dataset.financeDateFormatOverlay = "true";
    overlay.setAttribute("aria-hidden", "true");
    host.appendChild(overlay);
  }

  overlay.textContent = formatted;
  input.dataset.financeDateFormatted = "true";
  host.dataset.financeDateFormatHost = "true";
}

function syncWheelLeaf(element: HTMLElement, format: DateFormat) {
  const currentText = element.textContent?.trim() ?? "";
  const currentParts = parseDateParts(currentText);

  if (currentParts) {
    element.dataset.financeRawDate = currentText;
  }

  const rawDate = currentParts ? currentText : element.dataset.financeRawDate;
  if (!rawDate) return;

  const formatted = formatDate(rawDate, format);
  if (formatted && currentText !== formatted) {
    element.textContent = formatted;
  }
}

function syncDateWheel(wheel: HTMLElement, format: DateFormat) {
  const currentAriaValue = wheel.getAttribute("aria-valuetext")?.trim() ?? "";
  const currentAriaParts = parseDateParts(currentAriaValue);

  if (currentAriaParts) {
    wheel.dataset.financeRawAriaDate = currentAriaValue;
  }

  const rawAriaDate =
    currentAriaParts ? currentAriaValue : wheel.dataset.financeRawAriaDate;
  if (rawAriaDate) {
    const formattedAriaValue = formatDate(rawAriaDate, format);
    if (formattedAriaValue && currentAriaValue !== formattedAriaValue) {
      wheel.setAttribute("aria-valuetext", formattedAriaValue);
    }
  }

  wheel.querySelectorAll<HTMLElement>("div").forEach((element) => {
    if (element.childElementCount === 0) syncWheelLeaf(element, format);
  });
}

function clearDateInputOverlays() {
  document
    .querySelectorAll<HTMLElement>("[data-finance-date-format-overlay]")
    .forEach((overlay) => overlay.remove());

  document
    .querySelectorAll<HTMLInputElement>(
      'input[data-finance-date-formatted="true"]',
    )
    .forEach((input) => delete input.dataset.financeDateFormatted);

  document
    .querySelectorAll<HTMLElement>('[data-finance-date-format-host="true"]')
    .forEach((host) => delete host.dataset.financeDateFormatHost);
}

export default function DateFormatDisplaySync() {
  useEffect(() => {
    let syncFrame = 0;

    const syncDateControls = () => {
      const format = readDateFormat();

      document
        .querySelectorAll<HTMLInputElement>(DATE_INPUT_SELECTOR)
        .forEach((input) => syncDateInput(input, format));

      document
        .querySelectorAll<HTMLElement>(DATE_WHEEL_SELECTOR)
        .forEach((wheel) => syncDateWheel(wheel, format));
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(syncFrame);
      syncFrame = window.requestAnimationFrame(syncDateControls);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DATE_FORMAT_STORAGE_KEY) scheduleSync();
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-valuetext"],
    });

    document.addEventListener("input", scheduleSync, true);
    document.addEventListener("change", scheduleSync, true);
    document.addEventListener("click", scheduleSync, true);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("jamal-date-format-change", scheduleSync);

    syncDateControls();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(syncFrame);
      document.removeEventListener("input", scheduleSync, true);
      document.removeEventListener("change", scheduleSync, true);
      document.removeEventListener("click", scheduleSync, true);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("jamal-date-format-change", scheduleSync);
      clearDateInputOverlays();
    };
  }, []);

  return <style>{dateFormatDisplayCss}</style>;
}
