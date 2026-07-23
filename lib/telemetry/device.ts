export type TelemetryDevice = {
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  osFamily: "Android" | "iOS" | "Windows" | "macOS" | "Linux" | "ChromeOS" | "Other";
  browserFamily: "Chrome" | "Safari" | "Firefox" | "Edge" | "Samsung Internet" | "Other";
};

function includes(value: string, token: string) {
  return value.toLowerCase().includes(token.toLowerCase());
}

export function classifyTelemetryDevice(headers: Headers): TelemetryDevice {
  const userAgent = headers.get("user-agent") ?? "";
  const mobileHint = headers.get("sec-ch-ua-mobile") ?? "";
  const platformHint = (headers.get("sec-ch-ua-platform") ?? "").replaceAll('"', "");

  const deviceType: TelemetryDevice["deviceType"] =
    mobileHint === "?1" || /mobi|iphone|ipod|android.+mobile/i.test(userAgent)
      ? "mobile"
      : /ipad|tablet|android(?!.*mobile)/i.test(userAgent)
        ? "tablet"
        : userAgent
          ? "desktop"
          : "unknown";

  const osFamily: TelemetryDevice["osFamily"] =
    includes(platformHint, "Android") || includes(userAgent, "Android")
      ? "Android"
      : includes(platformHint, "iOS") || /iPhone|iPad|iPod/i.test(userAgent)
        ? "iOS"
        : includes(platformHint, "Windows") || includes(userAgent, "Windows")
          ? "Windows"
          : includes(platformHint, "macOS") || includes(userAgent, "Macintosh")
            ? "macOS"
            : includes(platformHint, "Chrome OS") || includes(userAgent, "CrOS")
              ? "ChromeOS"
              : includes(platformHint, "Linux") || includes(userAgent, "Linux")
                ? "Linux"
                : "Other";

  const browserFamily: TelemetryDevice["browserFamily"] =
    /SamsungBrowser/i.test(userAgent)
      ? "Samsung Internet"
      : /Edg\//i.test(userAgent)
        ? "Edge"
        : /Firefox\//i.test(userAgent)
          ? "Firefox"
          : /Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent)
            ? "Chrome"
            : /Safari\//i.test(userAgent)
              ? "Safari"
              : "Other";

  return { deviceType, osFamily, browserFamily };
}
