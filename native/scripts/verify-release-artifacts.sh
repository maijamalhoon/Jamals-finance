#!/usr/bin/env bash
set -euo pipefail

DEBUG_APK="${DEBUG_APK:-androidApp/build/outputs/apk/debug/androidApp-debug.apk}"
RELEASE_AAB="${RELEASE_AAB:-androidApp/build/outputs/bundle/release/androidApp-release.aab}"
MAPPING_FILE="${MAPPING_FILE:-androidApp/build/outputs/mapping/release/mapping.txt}"
OUTPUT_JSON="${OUTPUT_JSON:-release-artifacts.json}"
MAX_AAB_BYTES=$((80 * 1024 * 1024))

fail() {
  echo "Release verification failed: $*" >&2
  exit 1
}

[ -s "$DEBUG_APK" ] || fail "debug APK is missing"
[ -s "$RELEASE_AAB" ] || fail "release AAB is missing"

unzip -tq "$RELEASE_AAB" >/dev/null || fail "release AAB is not a valid ZIP archive"
zipinfo -1 "$RELEASE_AAB" | grep -q '^base/manifest/AndroidManifest.xml$' || \
  fail "release AAB does not contain the base manifest"

AAB_BYTES="$(wc -c < "$RELEASE_AAB" | tr -d ' ')"
[ "$AAB_BYTES" -le "$MAX_AAB_BYTES" ] || fail "release AAB exceeds 80 MB"

APK_SHA256="$(sha256sum "$DEBUG_APK" | awk '{print $1}')"
AAB_SHA256="$(sha256sum "$RELEASE_AAB" | awk '{print $1}')"

APKSIGNER="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}/build-tools/36.0.0/apksigner"
if [ -x "$APKSIGNER" ]; then
  "$APKSIGNER" verify "$DEBUG_APK" >/dev/null || fail "debug APK signature verification failed"
fi

AAB_SIGNED=false
if jarsigner -verify -strict "$RELEASE_AAB" >/tmp/jamals-aab-signature.log 2>&1 && \
   grep -qi 'jar verified' /tmp/jamals-aab-signature.log && \
   ! grep -qi 'jar is unsigned' /tmp/jamals-aab-signature.log; then
  AAB_SIGNED=true
fi

MAPPING_PRESENT=false
MAPPING_SHA256=""
if [ -s "$MAPPING_FILE" ]; then
  MAPPING_PRESENT=true
  MAPPING_SHA256="$(sha256sum "$MAPPING_FILE" | awk '{print $1}')"
fi

cat > "$OUTPUT_JSON" <<JSON
{
  "versionName": "1.0.0-rc1",
  "versionCode": 10,
  "debugApplicationId": "com.jamalsfinance.app.native.dev",
  "releaseCandidateApplicationId": "com.jamalsfinance.app.native.rc",
  "debugApk": {
    "path": "$DEBUG_APK",
    "sha256": "$APK_SHA256"
  },
  "releaseAab": {
    "path": "$RELEASE_AAB",
    "sha256": "$AAB_SHA256",
    "sizeBytes": $AAB_BYTES,
    "signed": $AAB_SIGNED
  },
  "r8Mapping": {
    "present": $MAPPING_PRESENT,
    "sha256": "$MAPPING_SHA256"
  }
}
JSON

cat "$OUTPUT_JSON"
