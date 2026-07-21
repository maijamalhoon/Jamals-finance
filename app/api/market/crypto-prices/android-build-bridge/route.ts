import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUILD_SERVICE = "https://pwabuilder-cloudapk.azurewebsites.net";
const BUILD_TOKEN = "dZwpC4-iGB8ydiWZxdhN42dEjXD-vRrMeg-_KP-4BTs";

const packageOptions = {
  appVersion: "1.0.0.0",
  appVersionCode: 1,
  backgroundColor: "#F3F6FA",
  display: "standalone",
  enableNotifications: false,
  enableSiteSettingsShortcut: true,
  fallbackType: "customtabs",
  features: {
    locationDelegation: { enabled: false },
    playBilling: { enabled: false },
  },
  host: "jamals-finance-sable.vercel.app",
  pwaUrl: "https://jamals-finance-sable.vercel.app",
  fullScopeUrl: "https://jamals-finance-sable.vercel.app/",
  iconUrl: "https://jamals-finance-sable.vercel.app/icons/icon-512.png",
  includeSourceCode: false,
  isChromeOSOnly: false,
  isMetaQuest: false,
  launcherName: "Jamal's Finance",
  maskableIconUrl:
    "https://jamals-finance-sable.vercel.app/icons/icon-maskable-512.png",
  monochromeIconUrl: "",
  name: "Jamal's Finance",
  navigationColor: "#F3F6FA",
  navigationColorDark: "#0B1220",
  navigationDividerColor: "#F3F6FA",
  navigationDividerColorDark: "#0B1220",
  orientation: "portrait-primary",
  packageId: "com.jamalsfinance.app",
  shortcuts: [],
  signing: null,
  signingMode: "none",
  splashScreenFadeOutDuration: 300,
  startUrl: "/?source=twa",
  themeColor: "#2956C8",
  themeColorDark: "#2956C8",
  webManifestUrl:
    "https://jamals-finance-sable.vercel.app/manifest.webmanifest",
  minSdkVersion: 23,
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  if (searchParams.get("token") !== BUILD_TOKEN) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const action = searchParams.get("action");

  if (action === "enqueue") {
    const response = await fetch(`${BUILD_SERVICE}/enqueuePackageJob`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "platform-identifier": "jamals-finance",
        "platform-identifier-version": "1.0.0",
      },
      body: JSON.stringify(packageOptions),
      cache: "no-store",
    });

    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "text/plain" },
    });
  }

  const jobId = searchParams.get("id");
  if (!jobId) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  if (action === "status") {
    const response = await fetch(
      `${BUILD_SERVICE}/getPackageJob?id=${encodeURIComponent(jobId)}`,
      { cache: "no-store" },
    );
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  }

  if (action === "download") {
    const response = await fetch(
      `${BUILD_SERVICE}/downloadPackageZip?id=${encodeURIComponent(jobId)}`,
      { cache: "no-store" },
    );

    if (!response.ok || !response.body) {
      const body = await response.text();
      return new NextResponse(body, { status: response.status });
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition":
          'attachment; filename="jamals-finance-android-unsigned.zip"',
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
