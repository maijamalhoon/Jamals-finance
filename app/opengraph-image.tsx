import { ImageResponse } from "next/og";

import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/brand";

export const alt = `${APP_NAME} — ${APP_TAGLINE}`;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px 84px",
        background: "#0C1422",
        color: "#EDF3FB",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 28,
          fontWeight: 800,
          color: "#C2CEDD",
          letterSpacing: "0.08em",
        }}
      >
        {APP_NAME}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 48,
          maxWidth: 960,
          fontSize: 78,
          lineHeight: 1.04,
          letterSpacing: "-0.045em",
          fontWeight: 800,
        }}
      >
        {APP_TAGLINE}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 30,
          maxWidth: 820,
          fontSize: 30,
          lineHeight: 1.4,
          color: "#94A4BA",
          fontWeight: 500,
        }}
      >
        {APP_DESCRIPTION}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 44,
          fontSize: 22,
          color: "#9BB0FF",
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        PERSONAL  •  BUSINESS  •  POS  •  ERP  •  CRM
      </div>
    </div>,
    size,
  );
}
