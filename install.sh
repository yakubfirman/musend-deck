#!/usr/bin/env bash
# ==============================================================================
# Musend Deck — 1-Click Automated Installer
# Developed by Yakub Firman Mustofa (https://yakubfirman.com)
# PHP on-demand Cloud & Hosting Management Cockpit
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
echo "║          🚀 MUSEND DECK — 1-CLICK HOSTING COCKPIT INSTALLER          ║"
echo "║          Developed by Yakub Firman Mustofa (yakubfirman.com)         ║"
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
    echo -e "${RED}❌ Musend Deck membutuhkan PHP 8.2 atau lebih baru.${NC}"
    exit 1
fi

# shellcheck disable=SC2016 # The PHP snippet is deliberately single-quoted for the shell.
PHP_REQUIRED_MISSING=$(php -r '
$missing = [];
if (!function_exists("json_encode") || !function_exists("json_decode")) $missing[] = "JSON";
if (!function_exists("posix_geteuid") || !function_exists("posix_getpwuid")) $missing[] = "POSIX";
echo implode(", ", $missing);
')
if [ -n "$PHP_REQUIRED_MISSING" ]; then
    echo -e "${RED}❌ Ekstensi PHP wajib tidak tersedia: ${PHP_REQUIRED_MISSING}.${NC}"
    echo -e "   Aktifkan ekstensi tersebut pada PHP CLI dan PHP web sebelum melanjutkan."
    exit 1
fi

# shellcheck disable=SC2016 # The PHP snippet is deliberately single-quoted for the shell.
PHP_OPTIONAL_MISSING=$(php -r '
$missing = [];
foreach (["proc_open", "shell_exec", "exec"] as $function) {
    if (!function_exists($function)) $missing[] = $function;
}
echo implode(", ", $missing);
')
if [ -n "$PHP_OPTIONAL_MISSING" ]; then
    echo -e "${YELLOW}⚠ Fungsi PHP berikut dibatasi: ${PHP_OPTIONAL_MISSING}.${NC}"
    echo -e "   Terminal, pemantauan, deployment, atau cron dapat memiliki fitur terbatas."
fi

if [ "$(id -u)" -eq 0 ]; then
    echo -e "${RED}❌ Jangan pasang atau jalankan Musend Deck sebagai root. Gunakan akun Linux non-root yang menjalankan PHP-FPM.${NC}"
    exit 1
fi

# 2. Tentukan Direktori Target
if [ -z "$TARGET_DIR" ]; then
    DEFAULT_DIR="$HOME/public_html/MusendDeck"
    echo -e "\n${YELLOW}➜ [2/4] Tentukan folder tujuan instalasi:${NC}"
    echo -e "      Default: ${CYAN}${DEFAULT_DIR}${NC}"
    read -r -p "      Tekan [Enter] untuk default atau ketik path folder: " USER_INPUT
    TARGET_DIR="${USER_INPUT:-$DEFAULT_DIR}"
fi

echo -e "      Target instalasi: ${BOLD}${GREEN}${TARGET_DIR}${NC}\n"
mkdir -p "$TARGET_DIR"
if [ -L "$TARGET_DIR" ]; then
    echo -e "${RED}❌ Direktori tujuan adalah symlink. Tentukan path direktori secara langsung.${NC}"
    exit 1
fi
TARGET_DIR="$(cd "$TARGET_DIR" && pwd -P)"

# Refuse to replace a site's front page or backend files unless this is already
# a Musend Deck installation. A dedicated subfolder or subdomain is safest.
IS_MUSEND_INSTALL=0
if [ -f "$TARGET_DIR/index.html" ] && grep -q 'name="musend-deck-managed"' "$TARGET_DIR/index.html"; then
    IS_MUSEND_INSTALL=1
elif [ -f "$TARGET_DIR/api.php" ] && grep -q 'ServerDeck Micro REST API Router' "$TARGET_DIR/api.php"; then
    IS_MUSEND_INSTALL=1
fi
if [ -e "$TARGET_DIR/index.html" ] && [ "$IS_MUSEND_INSTALL" -ne 1 ]; then
    echo -e "${RED}❌ index.html sudah ada dan bukan halaman Musend Deck. Pilih document root kosong agar situs yang ada tidak tertimpa.${NC}"
    exit 1
fi
if [ -e "$TARGET_DIR/api.php" ] && [ "$IS_MUSEND_INSTALL" -ne 1 ]; then
    echo -e "${RED}❌ api.php sudah ada dan bukan router Musend Deck. Pilih document root kosong agar aplikasi yang ada tidak tertimpa.${NC}"
    exit 1
fi
for protected_path in index.html api.php setup-token.php config.sample.php config.php src .htaccess; do
    if [ -L "$TARGET_DIR/$protected_path" ]; then
        echo -e "${RED}❌ Menolak target symlink: $TARGET_DIR/$protected_path${NC}"
        exit 1
    fi
done
if [ "$IS_MUSEND_INSTALL" -ne 1 ]; then
    for collision_path in setup-token.php config.sample.php config.php src; do
        if [ -e "$TARGET_DIR/$collision_path" ]; then
            echo -e "${RED}❌ $collision_path sudah ada di tujuan. Pilih document root kosong agar berkas situs lain tidak tertimpa.${NC}"
            exit 1
        fi
    done
fi

# Copy a tree while changing permissions only on files and folders owned by this release.
copy_tree() {
    local source_root="$1"
    local target_root="$2"
    local source_path
    local relative_path
    local destination_path

    if [ -L "$target_root" ]; then
        echo -e "${RED}❌ Menolak menulis ke direktori symlink: ${target_root}${NC}"
        return 1
    fi
    mkdir -p "$target_root"
    while IFS= read -r -d '' source_path; do
        relative_path="${source_path#"$source_root"/}"
        destination_path="$target_root/$relative_path"
        local check_path="$destination_path"
        while [ "$check_path" != "$target_root" ]; do
            if [ -L "$check_path" ]; then
                echo -e "${RED}❌ Menolak menulis melalui symlink: ${check_path}${NC}"
                return 1
            fi
            check_path="$(dirname "$check_path")"
        done
        if [ -d "$source_path" ]; then
            if [ ! -d "$destination_path" ]; then
                mkdir -p "$destination_path"
                chmod 755 "$destination_path" 2>/dev/null || true
            fi
        else
            mkdir -p "$(dirname "$destination_path")"
            cp "$source_path" "$destination_path"
            chmod 644 "$destination_path" 2>/dev/null || true
        fi
    done < <(find "$source_root" -mindepth 1 -print0)
}

copy_file() {
    local source_path="$1"
    local destination_path="$2"
    if [ -L "$destination_path" ]; then
        echo -e "${RED}❌ Menolak menulis melalui symlink: ${destination_path}${NC}"
        return 1
    fi
    cp "$source_path" "$destination_path"
    chmod 644 "$destination_path" 2>/dev/null || true
}

# 3. Salin Berkas Aplikasi
echo -e "${YELLOW}➜ [3/4] Menyalin berkas Musend Deck...${NC}"

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

# Salin aset frontend tanpa menghapus atau mengubah izin berkas lain di target.
copy_tree "$SCRIPT_DIR/frontend/dist" "$TARGET_DIR"

# Salin backend native PHP
copy_file "$SCRIPT_DIR/backend/api.php" "$TARGET_DIR/api.php"
copy_file "$SCRIPT_DIR/backend/setup-token.php" "$TARGET_DIR/setup-token.php"
copy_file "$SCRIPT_DIR/backend/config.sample.php" "$TARGET_DIR/config.sample.php"
if [ -f "$TARGET_DIR/.htaccess" ]; then
    if ! grep -q "MUSEND DECK SECURITY RULES" "$TARGET_DIR/.htaccess"; then
        printf '\n' >> "$TARGET_DIR/.htaccess"
        cat "$SCRIPT_DIR/backend/.htaccess" >> "$TARGET_DIR/.htaccess"
    fi
else
    copy_file "$SCRIPT_DIR/backend/.htaccess" "$TARGET_DIR/.htaccess"
fi
copy_tree "$SCRIPT_DIR/backend/src" "$TARGET_DIR/src"

echo -e "${YELLOW}➜ Token setup satu kali (salin ke Setup Wizard):${NC}"
php "$TARGET_DIR/setup-token.php"

# 4. Selesai
echo -e "${GREEN}✓ [4/4] Berkas berhasil dipasang di: ${BOLD}${TARGET_DIR}${NC}\n"

echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}🎉 PEMASANGAN BERKAS MUSEND DECK BERHASIL!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "Dikembangkan oleh: ${BOLD}Yakub Firman Mustofa${NC} (${CYAN}https://yakubfirman.com${NC})\n"
echo -e "Langkah Selanjutnya:"
echo -e "1. Buka URL website / subdomain Anda di browser."
echo -e "2. ${BOLD}Setup Wizard UI${NC} akan otomatis muncul di browser."
echo -e "3. Masukkan ${CYAN}token setup, username, dan password${NC} admin melalui tampilan UI."
echo -e "4. Klik ${BOLD}'Instal & Masuk ke Dashboard'${NC} — Selesai!\n"
