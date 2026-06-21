"use client";

import { useEffect, useRef, useState } from "react";

export default function ChartFrame({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let raf = 0;

    const measure = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const rect = frame.getBoundingClientRect();
        setReady(rect.width > 0 && rect.height > 0);
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={frameRef} className={className}>
      {ready ? children : <div className="finance-skeleton h-full w-full" />}
    </div>
  );
}
