"use client";

import type { ReactNode } from "react";

import MobileNav from "@/components/layout/MobileNav";
import MobileNavSwipeGestures from "@/components/layout/MobileNavSwipeGestures";

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
