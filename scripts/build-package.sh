#!/usr/bin/env bash
set -e

# Musend Deck 1-Click Packaging & Release Script
# Builds frontend SPA and merges with Zero-Vendor Micro PHP backend

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/build"
ZIP_OUTPUT="$ROOT_DIR/musend-deck-release.zip"

echo "============================================="
echo "   Musend Deck Release Packaging Tool"
echo "============================================="

if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm is required to build the frontend. Install Node.js 20+ and npm first." >&2
    exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
    echo "ERROR: the zip utility is required to create the release archive." >&2
    exit 1
fi

# 1. Build Frontend
echo "[1/4] Building Frontend (Vite + Tailwind)..."
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "       Installing locked frontend dependencies..."
    npm ci --no-audit --prefer-offline
fi
npm run build

# 2. Prepare Clean Build Directory
echo "[2/4] Preparing release folder structure..."
rm -rf "$BUILD_DIR"
rm -f "$ZIP_OUTPUT"
mkdir -p "$BUILD_DIR"

# 3. Copy Frontend Production Assets
echo "[3/4] Assembling frontend and backend artifacts..."
cp -r "$ROOT_DIR/frontend/dist/"* "$BUILD_DIR/"

# Copy Backend Core Files
cp "$ROOT_DIR/backend/api.php" "$BUILD_DIR/"
cp "$ROOT_DIR/backend/setup-token.php" "$BUILD_DIR/"
cp "$ROOT_DIR/backend/.htaccess" "$BUILD_DIR/"
cp "$ROOT_DIR/backend/nginx-security.conf.example" "$BUILD_DIR/"
cp "$ROOT_DIR/backend/config.sample.php" "$BUILD_DIR/"
cp "$ROOT_DIR/LICENSE" "$BUILD_DIR/"
cp -r "$ROOT_DIR/backend/src" "$BUILD_DIR/"

# 4. Generate Production ZIP Archive
echo "[4/4] Creating musend-deck-release.zip..."
cd "$BUILD_DIR"
zip -r -q "$ZIP_OUTPUT" .

ZIP_SIZE=$(du -h "$ZIP_OUTPUT" | cut -f1)
echo "============================================="
echo " SUCCESS! Musend Deck package generated:"
echo " Archive: $ZIP_OUTPUT"
echo " Size:    $ZIP_SIZE (Ultra-lightweight!)"
echo " Target:  Extract directly to your hosting web root (e.g. ~/public_html/monitor/)"
echo " Note:    Copy config.sample.php -> config.php or run the web Setup Wizard."
echo "============================================="
