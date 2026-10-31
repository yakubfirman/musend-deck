#!/usr/bin/env bash
# ==============================================================================
# ServerDeck — 1-Click Automated Installer
# High-Performance CloudLinux Server & Hosting Management Panel
# ==============================================================================
set -e

# Warna Terminal
GREEN="\033[1;32m"
YELLOW="\033[1;33m"
CYAN="\033[1;36m"
RED="\033[1;31m"
BOLD="\033[1m"
NC="\033[0m"

echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          🚀 SERVERDECK — 1-CLICK HOSTING PANEL INSTALLER             ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-}"

# 1. Periksa Lingkungan PHP
echo -e "${YELLOW}➜ [1/4] Memeriksa kompatibilitas runtime PHP...${NC}"
if ! command -v php >/dev/null 2>&1; then
    echo -e "${RED}❌ PHP CLI tidak ditemukan! Pastikan PHP 8.2+ terinstal di server.${NC}"
    exit 1
fi

PHP_VER=$(php -r "echo PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;")
echo -e "      Versi PHP terdeteksi: ${BOLD}PHP ${PHP_VER}${NC}"

PHP_OK=$(php -r "echo version_compare(PHP_VERSION, '8.2.0', '>=') ? '1' : '0';")
if [ "$PHP_OK" != "1" ]; then
    echo -e "${YELLOW}⚠ Peringatan: ServerDeck direkomendasikan berjalan di PHP 8.2 atau lebih baru.${NC}"
fi

# 2. Tentukan Direktori Target
if [ -z "$TARGET_DIR" ]; then
    DEFAULT_DIR="$HOME/public_html/monitor"
    echo -e "\n${YELLOW}➜ [2/4] Tentukan folder tujuan instalasi:${NC}"
    echo -e "      Default: ${CYAN}${DEFAULT_DIR}${NC}"
    read -r -p "      Tekan [Enter] untuk default atau ketik path folder: " USER_INPUT
    TARGET_DIR="${USER_INPUT:-$DEFAULT_DIR}"
fi

echo -e "      Target instalasi: ${BOLD}${GREEN}${TARGET_DIR}${NC}\n"
mkdir -p "$TARGET_DIR"

# 3. Salin Berkas Aplikasi
echo -e "${YELLOW}➜ [3/4] Menyalin berkas ServerDeck...${NC}"

# Cek apakah folder frontend/dist sudah ada
if [ ! -d "$SCRIPT_DIR/frontend/dist" ]; then
    echo -e "      Aset frontend belum dikompilasi, mencoba build lokal..."
    if command -v npm >/dev/null 2>&1; then
        cd "$SCRIPT_DIR/frontend"
        [ ! -d "node_modules" ] && npm install --no-audit --prefer-offline
        npm run build
        cd "$SCRIPT_DIR"
    else
        echo -e "${RED}❌ Node.js / npm tidak ditemukan dan folder frontend/dist belum ada.${NC}"
        echo -e "   Silakan build di komputer lokal terlebih dahulu atau jalankan 'npm run build' di folder frontend."
        exit 1
    fi
fi

# Bersihkan aset lama di target jika ada
rm -rf "$TARGET_DIR/assets"

# Salin aset frontend siap pakai
cp -r "$SCRIPT_DIR/frontend/dist/"* "$TARGET_DIR/"

# Salin backend native PHP (Zero-Daemon)
cp "$SCRIPT_DIR/backend/api.php" "$TARGET_DIR/"
cp "$SCRIPT_DIR/backend/.htaccess" "$TARGET_DIR/" 2>/dev/null || true
mkdir -p "$TARGET_DIR/src"
cp -r "$SCRIPT_DIR/backend/src/"* "$TARGET_DIR/src/"

# Set izin berkas yang aman
chmod 755 "$TARGET_DIR" 2>/dev/null || true
find "$TARGET_DIR" -type d -exec chmod 755 {} + 2>/dev/null || true
find "$TARGET_DIR" -type f -exec chmod 644 {} + 2>/dev/null || true

# 4. Selesai
echo -e "${GREEN}✓ [4/4] Berkas berhasil dipasang di: ${BOLD}${TARGET_DIR}${NC}\n"

echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}🎉 PEMASANGAN BERKAS SERVERDECK BERHASIL!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "Langkah Selanjutnya:"
echo -e "1. Buka URL website / subdomain Anda di browser."
echo -e "2. ${BOLD}Setup Wizard UI${NC} akan otomatis muncul di browser."
echo -e "3. Masukkan ${CYAN}Username & Password${NC} admin yang Anda inginkan langsung lewat tampilan UI."
echo -e "4. Klik ${BOLD}'Instal & Masuk ke Dashboard'${NC} — Selesai!\n"
