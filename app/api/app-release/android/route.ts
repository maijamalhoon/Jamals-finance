import { NextResponse } from "next/server";

import {
  ANDROID_RELEASE_FALLBACK,
  type AndroidRelease,
} from "@/lib/app-release";

type GitHubReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

type GitHubRelease = {
  tag_name: string;
  html_url: string;
  published_at: string | null;
  assets: GitHubReleaseAsset[];
};

const LATEST_RELEASE_API =
  "https://api.github.com/repos/maijamalhoon/Jamals-finance/releases/latest";

function normalizeVersion(tagName: string) {
  return tagName.trim().replace(/^v/i, "");
}

function pickApkAsset(release: GitHubRelease, version: string) {
  const assets = release.assets.filter((asset) =>
    asset.name.toLowerCase().endsWith(".apk"),
  );

  return (
    assets.find(
      (asset) => asset.name.toLowerCase() === "jamals-finance-latest.apk",
    ) ??
    assets.find(
      (asset) =>
        asset.name.toLowerCase() ===
        `jamals-finance-v${version}.apk`.toLowerCase(),
    ) ??
    assets[0]
  );
}

function responseFor(release: AndroidRelease, source: "github" | "fallback") {
  return NextResponse.json(
    { ...release, source },
    {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET() {
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Jamals-Finance-App-Release-Resolver",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return responseFor(ANDROID_RELEASE_FALLBACK, "fallback");
    }

    const latest = (await response.json()) as GitHubRelease;
    const version = normalizeVersion(latest.tag_name);
    const apk = pickApkAsset(latest, version);

    if (!version || !apk?.browser_download_url) {
      return responseFor(ANDROID_RELEASE_FALLBACK, "fallback");
    }

    const isKnownFallbackVersion =
      version === ANDROID_RELEASE_FALLBACK.version;

    const release: AndroidRelease = {
      version,
      versionCode: isKnownFallbackVersion
        ? ANDROID_RELEASE_FALLBACK.versionCode
        : 0,
      apkUrl: apk.browser_download_url,
      releaseUrl: latest.html_url,
      sha256: isKnownFallbackVersion
        ? ANDROID_RELEASE_FALLBACK.sha256
        : "",
      fileSizeBytes: apk.size,
      minimumAndroid: ANDROID_RELEASE_FALLBACK.minimumAndroid,
      publishedAt:
        latest.published_at?.slice(0, 10) ??
        ANDROID_RELEASE_FALLBACK.publishedAt,
    };

    return responseFor(release, "github");
  } catch {
    return responseFor(ANDROID_RELEASE_FALLBACK, "fallback");
  }
}
