"use client";

import { useEffect } from "react";

export default function LandingChartMotion() {
  useEffect(() => {
    const chartLine = document.querySelector<SVGPathElement>(".jf-chart-line");
    const chartSvg = chartLine?.ownerSVGElement;

    if (!chartLine || !chartSvg || chartSvg.querySelector(".jf-chart-travel-light")) {
      return;
    }

    const travelLight = chartLine.cloneNode(false) as SVGPathElement;
    travelLight.setAttribute("class", "jf-chart-travel-light");
    travelLight.setAttribute("pathLength", "100");
    travelLight.setAttribute("aria-hidden", "true");
    chartSvg.appendChild(travelLight);

    return () => {
      travelLight.remove();
    };
  }, []);

  return null;
}
