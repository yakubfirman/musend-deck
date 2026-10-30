#!/usr/bin/env bash
set -e

# ServerDeck 1-Click Packaging & Release Script
# Builds frontend SPA and merges with Zero-Vendor Micro PHP backend

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/build"
ZIP_OUTPUT="$ROOT_DIR/serverdeck-release.zip"

echo "============================================="
echo "   ServerDeck Release Packaging Tool"
echo "============================================="

# 1. Build Frontend
echo "[1/4] Building Frontend (Vite + Tailwind)..."
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "       Installing frontend dependencies..."
    npm install
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
cp "$ROOT_DIR/backend/.htaccess" "$BUILD_DIR/"
cp "$ROOT_DIR/backend/config.sample.php" "$BUILD_DIR/"
cp -r "$ROOT_DIR/backend/src" "$BUILD_DIR/"

# 4. Generate Production ZIP Archive
echo "[4/4] Creating serverdeck-release.zip..."
cd "$BUILD_DIR"
zip -r -q "$ZIP_OUTPUT" .

ZIP_SIZE=$(du -h "$ZIP_OUTPUT" | cut -f1)
echo "============================================="
echo " SUCCESS! Release package generated:"
echo " Archive: $ZIP_OUTPUT"
echo " Size:    $ZIP_SIZE (Ultra-lightweight!)"
echo " Target:  Extract directly to /home/yakubfir/musend.web.id/monitor/"
echo " Note:    Remember to copy config.sample.php -> config.php on the server."
echo "============================================="
