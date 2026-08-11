#!/usr/bin/env bash
set -euo pipefail

echo "▶ Building mobile export..."
npm run build:mobile

echo "▶ Syncing to Android..."
npx cap sync android

echo "▶ Building APK..."
(cd android && ./gradlew assembleDebug)

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  echo "✓ APK generated: $APK_PATH"
else
  echo "✗ APK not found at $APK_PATH"
  exit 1
fi
