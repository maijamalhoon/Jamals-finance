import { ImageResponse } from "next/og";

export const alt = "Jamal's Finance — Premium Personal Finance Dashboard";

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
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #0B1220 0%, #111A2B 48%, #162235 100%)",
        color: "#E7EEF8",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -160,
          right: -120,
          width: 460,
          height: 460,
          borderRadius: 999,
          background: "rgba(56, 189, 248, 0.18)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: -180,
          left: -120,
          width: 520,
          height: 520,
          borderRadius: 999,
          background: "rgba(34, 197, 94, 0.16)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          opacity: 0.75,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 10,
          background: "linear-gradient(90deg, #33C78B, #62A5FF, #E6B450)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 64,
        }}
      >
        <div
          style={{
            width: "58%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: 310,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.08)",
                padding: "12px 18px",
                color: "rgba(248,251,255,0.78)",
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  marginRight: 12,
                  background: "linear-gradient(135deg, #33C78B, #62A5FF)",
                }}
              />
              Jamal&apos;s Finance
            </div>

            <div
              style={{
                marginTop: 42,
                fontSize: 72,
                lineHeight: 1.02,
                letterSpacing: "-0.055em",
                fontWeight: 800,
                color: "#E7EEF8",
              }}
            >
              Manage money with clarity.
            </div>

            <div
              style={{
                marginTop: 24,
                maxWidth: 620,
                fontSize: 31,
                lineHeight: 1.35,
                color: "rgba(248,251,255,0.68)",
                fontWeight: 500,
              }}
            >
              Track accounts, expenses, goals, liabilities, investments and
              savings in one secure workspace.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            {["Accounts", "Expenses", "Goals", "Investments"].map((item) => (
              <div
                key={item}
                style={{
                  marginRight: 14,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  padding: "10px 16px",
                  color: "rgba(248,251,255,0.76)",
                  fontSize: 22,
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
              width: 410,
              height: 440,
              borderRadius: 36,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.10)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
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
                    color: "rgba(248,251,255,0.52)",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  Net Balance
                </div>
                <div
                  style={{
                    color: "#E7EEF8",
                    fontSize: 50,
                    fontWeight: 800,
                    marginTop: 6,
                  }}
                >
                  $24,850
                </div>
              </div>

              <div
                style={{
                  borderRadius: 999,
                  background: "rgba(34,197,94,0.16)",
                  color: "#33C78B",
                  padding: "9px 14px",
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                +18.4%
              </div>
            </div>

            <div
              style={{
                marginTop: 34,
                height: 150,
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              {[72, 92, 62, 112, 82, 130, 104].map((height, index) => (
                <div
                  key={index}
                  style={{
                    width: 34,
                    height,
                    marginRight: 14,
                    borderRadius: 999,
                    background:
                      "linear-gradient(180deg, #E7EEF8 0%, #8AA4FF 100%)",
                  }}
                />
              ))}
            </div>

            <div
              style={{
                marginTop: 30,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {[
                ["Income", "+$4,280", "#33C78B"],
                ["Expenses", "-$1,940", "#F08A7B"],
                ["Savings", "$2,340", "#8AA4FF"],
              ].map(([label, value, color]) => (
                <div
                  key={label}
                  style={{
                    height: 46,
                    marginBottom: 12,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.11)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 18px",
                  }}
                >
                  <div
                    style={{
                      color: "rgba(248,251,255,0.60)",
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      color,
                      fontSize: 21,
                      fontWeight: 800,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
