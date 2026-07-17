import { ImageResponse } from "next/og";

export const alt = "Jamal's Finance — calm personal finance workspace";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const modules = ["Accounts", "Activity", "Goals", "Reports"] as const;
const bars = [54, 82, 66, 104, 76, 126, 92] as const;

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#0C1422",
        color: "#EDF3FB",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -220,
          right: -120,
          width: 620,
          height: 620,
          borderRadius: 999,
          background: "rgba(155, 176, 255, 0.10)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -260,
          left: 220,
          width: 620,
          height: 620,
          borderRadius: 999,
          background: "rgba(85, 197, 186, 0.07)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: 64,
        }}
      >
        <div
          style={{
            width: "58%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 13,
                border: "1px solid rgba(155,176,255,0.38)",
                background: "rgba(155,176,255,0.14)",
                color: "#9BB0FF",
                fontSize: 25,
                fontWeight: 800,
              }}
            >
              J
            </div>
            <div
              style={{
                marginLeft: 14,
                color: "#C2CEDD",
                fontSize: 25,
                fontWeight: 700,
              }}
            >
              Jamal&apos;s Finance
            </div>
          </div>

          <div
            style={{
              marginTop: 44,
              maxWidth: 640,
              fontSize: 76,
              lineHeight: 1.01,
              letterSpacing: "-0.052em",
              fontWeight: 800,
            }}
          >
            Your money picture, made clear.
          </div>

          <div
            style={{
              marginTop: 26,
              maxWidth: 610,
              color: "#94A4BA",
              fontSize: 29,
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            A private workspace for accurate tracking, thoughtful review, and
            practical planning.
          </div>

          <div style={{ display: "flex", marginTop: 38 }}>
            {modules.map((item) => (
              <div
                key={item}
                style={{
                  marginRight: 12,
                  borderRadius: 12,
                  border: "1px solid #2B3B55",
                  background: "#152136",
                  padding: "10px 14px",
                  color: "#C2CEDD",
                  fontSize: 19,
                  fontWeight: 700,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: "42%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: 420,
              height: 448,
              display: "flex",
              flexDirection: "column",
              borderRadius: 24,
              border: "1px solid #3B4E6C",
              background: "#152136",
              padding: 28,
              boxShadow: "0 26px 64px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    color: "#94A4BA",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Workspace overview
                </div>
                <div
                  style={{
                    color: "#EDF3FB",
                    fontSize: 34,
                    fontWeight: 800,
                    marginTop: 7,
                  }}
                >
                  Financial clarity
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  border: "1px solid rgba(72,198,145,0.34)",
                  background: "rgba(72,198,145,0.12)",
                }}
              />
            </div>

            <div
              style={{
                height: 160,
                display: "flex",
                alignItems: "flex-end",
                marginTop: 34,
                borderBottom: "1px solid #2B3B55",
              }}
            >
              {bars.map((height, index) => (
                <div
                  key={height}
                  style={{
                    width: 34,
                    height,
                    marginRight: index === bars.length - 1 ? 0 : 17,
                    borderRadius: "8px 8px 0 0",
                    background: index % 3 === 1 ? "#55C5BA" : "#9BB0FF",
                    opacity: 0.72 + index * 0.035,
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
              {["Recent activity", "Savings progress", "Upcoming obligations"].map(
                (label, index) => (
                  <div
                    key={label}
                    style={{
                      height: 46,
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 11,
                      borderRadius: 12,
                      border: "1px solid #2B3B55",
                      background: "#101B2C",
                      padding: "0 14px",
                    }}
                  >
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        marginRight: 12,
                        borderRadius: 999,
                        background: ["#70ADEF", "#48C691", "#E4B45D"][index],
                      }}
                    />
                    <div style={{ color: "#C2CEDD", fontSize: 18, fontWeight: 700 }}>
                      {label}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
