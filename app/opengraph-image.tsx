import { ImageResponse } from "next/og";

export const alt = "Jamal's Finance — calm personal finance workspace";

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
          fontWeight: 700,
          color: "#C2CEDD",
        }}
      >
        Jamal&apos;s Finance
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 48,
          maxWidth: 900,
          fontSize: 78,
          lineHeight: 1.04,
          letterSpacing: "-0.045em",
          fontWeight: 800,
        }}
      >
        Your money picture, made clear.
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 30,
          maxWidth: 760,
          fontSize: 30,
          lineHeight: 1.4,
          color: "#94A4BA",
          fontWeight: 500,
        }}
      >
        A private workspace for accurate tracking, thoughtful review, and
        practical planning.
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
        TRACK  •  REVIEW  •  PLAN
      </div>
    </div>,
    size,
  );
}
