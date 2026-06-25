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

    let secondFrameId = 0;
    const frameId = requestAnimationFrame(() => {
      secondFrameId = requestAnimationFrame(() => {
        setReady(true);
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(secondFrameId);
    };
  }, [reduceMotion]);

  return {
    ready,
    reduceMotion: Boolean(reduceMotion),
  };
}
