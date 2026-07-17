"use client";

import type { ReactNode } from "react";

import MobileNav from "@/components/layout/MobileNav";

type MobileHeaderProps = {
  notificationSlot: ReactNode;
};

export default function MobileHeader({
  notificationSlot,
}: MobileHeaderProps) {
  return <MobileNav notificationSlot={notificationSlot} />;
}
