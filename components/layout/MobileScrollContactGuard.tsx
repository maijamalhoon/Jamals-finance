"use client";

import { useEffect } from "react";

import FinancePickerKeyboardGuard from "@/components/forms/FinancePickerKeyboardGuard";

const BODY_CONTACT_ATTRIBUTE = "data-mobile-scroll-contact";

export default function MobileScrollContactGuard() {
  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-dashboard-scroll]",
    );
    if (!scrollContainer) return;

    let activePointerId: number | null = null;
    let pointerStartedInsideScroll = false;

    const setContactState = (active: boolean) => {
      if (active) {
        document.body.setAttribute(BODY_CONTACT_ATTRIBUTE, "true");
        return;
      }

      document.body.removeAttribute(BODY_CONTACT_ATTRIBUTE);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        !event.isPrimary ||
        (event.pointerType !== "touch" && event.pointerType !== "pen")
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node) || !scrollContainer.contains(target)) return;

      activePointerId = event.pointerId;
      pointerStartedInsideScroll = true;
    };

    const handleScroll = () => {
      if (activePointerId === null || !pointerStartedInsideScroll) return;
      setContactState(true);
    };

    const releasePointer = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;

      activePointerId = null;
      pointerStartedInsideScroll = false;
      setContactState(false);
    };

    const resetContact = () => {
      activePointerId = null;
      pointerStartedInsideScroll = false;
      setContactState(false);
    };

    scrollContainer.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("pointerup", releasePointer, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointercancel", releasePointer, {
      capture: true,
      passive: true,
    });
    window.addEventListener("blur", resetContact);

    return () => {
      scrollContainer.removeEventListener("pointerdown", handlePointerDown);
      scrollContainer.removeEventListener("scroll", handleScroll);
      document.removeEventListener("pointerup", releasePointer, true);
      document.removeEventListener("pointercancel", releasePointer, true);
      window.removeEventListener("blur", resetContact);
      resetContact();
    };
  }, []);

  return <FinancePickerKeyboardGuard />;
}
