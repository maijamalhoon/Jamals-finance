"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function useDashboardAnimationReady() {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      setReady(true);
      return;
    }

    setReady(false);

    const frameId = requestAnimationFrame(() => {
      setReady(true);
    });

    return () => cancelAnimationFrame(frameId);
  }, [reduceMotion]);

  return {
    ready,
    reduceMotion: Boolean(reduceMotion),
  };
}
