"use client";

import type { ReactNode } from "react";

import MobileNav from "@/components/layout/MobileNav";
import MobileNavSwipeGestures from "@/components/layout/MobileNavSwipeGestures";

// Keep mobile swipe navigation mounted alongside the existing mobile controls.
type MobileHeaderProps = {
  notificationSlot: ReactNode;
};

export default function MobileHeader({
  notificationSlot,
}: MobileHeaderProps) {
  return (
    <>
      <MobileNav notificationSlot={notificationSlot} />
      <MobileNavSwipeGestures />
    </>
  );
}
