# Product Requirement Document (PRD)

## ServerDeck: Ultra-Lightweight & Anti-Slop Server Management Panel

* **Version:** 1.1.0 (Resource-Optimized & Anti-Slop Edition)
* **Author:** Yakub Firman Mustofa & Pair Assistant
* **Target Environment:** Shared / Cloud Hosting (CloudLinux CageFS / cPanel / LiteSpeed Web Server)
* **Architecture:** Static React SPA (Vite + Tailwind CSS + CodeMirror 6) + Zero-Vendor Micro PHP 8.2+ API
* **Target Deployment Path:** `/home/yakubfir/musend.web.id/monitor`

---

## 1. Executive Summary & Design Philosophy

### 1.1 Problem Statement

Pengguna shared hosting (cPanel/CloudLinux) sering kali menghadapi dua masalah utama:

1. **Antarmuka cPanel Terlalu Lambat & Membingungkan:** Menyajikan metrik fisik server node (misal 64 GB RAM, puluhan core CPU) alih-alih limit paket hosting yang sebenarnya dibeli pengguna.
2. **Keterbatasan Shared Hosting (Batas EP & Inode):** Menjalankan daemon modern (seperti Node.js, Express, atau framework PHP berat seperti Laravel/CI4) membebani kuota *Entry Processes* (EP: 60) dan menghabiskan ribuan *Inodes* untuk folder `vendor/` atau `node_modules/`.
3. **Desain Dashboard "AI Slop":** Banyak dashboard modern terjebak dalam estetika artifisial murahan (gradien ungu-biru buram di latar belakang, emoji bertebaran, metrik kosong/palsu, dan kartu berulang yang membuang ruang layar).

### 1.2 Solution & Core Principles

**ServerDeck** adalah dashboard manajemen server & hosting mandiri yang dirancang dengan 3 pilar:

1. **Ultra-Lightweight & Zero-Daemon:**
   * Backend mengusung **Pure Native PHP 8.2+ (Zero-Vendor)** tanpa dependensi Composer di server produksi (< 10 file core, total ukuran < 150 KB).
   * Memori hanya terpakai saat HTTP request masuk (< 1.5 MB RAM / request, eksekusi < 5 ms), segera dilepas kembali oleh LiteSpeed (*zero idle RAM & zero idle NPROC*).
2. **Anti-Slop, High-Density UX (Human-Grade Interface):**
   * Menggunakan arsitektur desain **Technical Dense & Quiet DevTools** (kanvas monokrom gelap presisi, hairline borders 1px, angka monospace tabular, ikon vektor Lucide 1.5px tanpa emoji acak).
   * Menampilkan telemetri nyata CloudLinux LVE (`4 GB RAM`, `100% CPU / 1 Core`, `NPROC 400`, `EP 60`, `32 MB/s I/O`).
3. **Mobile-First & Responsive Linearity:**
   * Navigasi desktop berupa sidebar presisi 240px; pada mobile bertransformasi menjadi top-bar dengan responsive drawer dan bottom quick actions.
   * Tabel file dan proses dapat di-scroll secara horizontal dengan kolom aksi tetap (*sticky actions*).

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Browser (Desktop & Mobile)"]
        UI["React 18+ SPA (Vite + Tailwind CSS)"]
        CM["CodeMirror 6 (Lazy Loaded Editor)"]
        TQ["TanStack Query (Smart Polling 15s)"]
    end

    subgraph Hosting["Shared Hosting (musend.web.id/monitor)"]
        subgraph StaticLayer["LiteSpeed Web Server"]
            Assets["index.html + Gzip/Brotli Hashed Assets"]
            Htaccess[".htaccess (Security + Cache + Gzip)"]
        end

        subgraph Backend["Zero-Vendor Micro PHP 8.2+"]
            Router["api.php (Micro REST Router & CSRF Guard)"]
            Config["config.php (Protected 403)"]
            
            subgraph CoreClasses["PHP Core Modules (<100KB)"]
                Auth["src/Auth.php (Session + Rate Limit)"]
                Metrics["src/Metrics.php (cPanel Datastore Cache)"]
                Files["src/Files.php (Chroot Jail & ZipArchive)"]
                System["src/System.php (ps & Command Runner)"]
            end
        end

        subgraph CageFS["CloudLinux CageFS Isolation (/home/yakubfir)"]
            CpanelCache["~/.cpanel/datastore/ (0-CPU Metrics)"]
            FileSystem["/home/yakubfir/ (Files & Web Roots)"]
            ProcessTree["Linux Process Table (ps -u yakubfir)"]
            LogFiles["Logs (/home/yakubfir/logs & error_log)"]
        end
    end

    UI -->|Load Static (<200KB Gzip)| Assets
    UI -->|REST JSON + Cookie + X-CSRF-Token| Router
    Router --> Config
    Router --> Auth
    Router --> Metrics
    Router --> Files
    Router --> System
    Metrics -->|Direct Read (<1ms)| CpanelCache
    Files -->|Safe Canonical Realpath| FileSystem
    System -->|Proc Open / Escaped Shell| ProcessTree
    System -->|Reverse Byte-Seek Tail| LogFiles
```

### 2.1 Technology Stack & Size Budget

| Layer | Komponen / Lib | Alasan & Optimasi "Hemat & Ringan" | Size Budget |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 18+ (TypeScript) | Komponen deklaratif, tipe data aman, ekosistem solid. | ~45 KB (gzipped) |
| **Tooling & Bundler** | Vite 5+ | Tree-shaking agresif, code-splitting otomatis per route. | Dev tool |
| **Styling** | Tailwind CSS (JIT) | Menghasilkan hanya kelas CSS yang digunakan (zero runtime). | < 15 KB (gzipped) |
| **Code Editor** | **CodeMirror 6 (Strict)** | **Pengganti Monaco.** Sangat modular, dimuat dinamis (*lazy*), tidak memberatkan bundle utama. | ~180 KB (lazy chunk) |
| **Icons** | Lucide React | Hanya import ikon spesifik dengan stroke seragam 1.5px (tanpa ikon berlebih/emoji). | ~12 KB |
| **State & Polling** | TanStack Query v5 | Cache cerdas, nonaktif saat tab blur (`refetchIntervalInBackground: false`). | ~14 KB |
| **Backend Runtime** | **Native PHP 8.2+** | **Zero-Vendor.** Tanpa Composer `vendor/` di hosting. Menghemat 100% Inode dan waktu upload. | < 100 KB total |
| **Web Server** | LiteSpeed / LSAPI | Support `.htaccess`, otomatis melayani file statis dengan kompresi gzip/brotli. | Bawaan hosting |

---

## 3. UI/UX Design System: Anti-Slop & Human-Grade Engineering

### 3.1 Strict Anti-Slop Banned Matrix

Desain ServerDeck **secara ketat melarang trope AI-Slop berikut**:

* ❌ **DILARANG:** Gradien ungu/biru blur di latar belakang (`radial-gradient` indigo/purple blob).
* ❌ **DILARANG:** Emoji mentah di tombol, judul, atau sidebar (`🚀`, `🔥`, `📊`, `📁`). Seluruh ikon wajib vektor SVG monokrom (Lucide 1.5px).
* ❌ **DILARANG:** Label berteriak kapital melar (`OVERVIEW`, `STATS`, `SYSTEM`). Gunakan format Sentence case yang tenang.
* ❌ **DILARANG:** Kartu metrik berulang dan statistik palsu (*vanity stats* seperti `+99.9% Uptime` atau `10x Faster`). Tampilkan metrik telemetri asli kuota akun.
* ❌ **DILARANG:** Border glowing berlebihan atau drop-shadow ungu neon.

### 3.2 Design Archetype: Technical Dense DevTools

* **Color Palette (Precision Dark Mode):**
  * `Canvas Base`: `#09090b` (Deep obsidian)
  * `Surface Elevated`: `#121215` (Kartu & panel)
  * `Surface Overlay`: `#18181c` (Modal, popover, dropdown)
  * `Hairline Border`: `rgba(255, 255, 255, 0.08)` (Subtle 1px boundary)
  * `Border Hover`: `rgba(255, 255, 255, 0.16)`
  * `Primary Accent`: `#2563eb` (Cobalt Precision untuk aksi utama)
  * `Text Primary`: `#f4f4f5` (Zinc 100)
  * `Text Secondary`: `#a1a1aa` (Zinc 400)
  * `Text Muted`: `#71717a` (Zinc 500)

* **Status Semantic Palette (Subtle & High Contrast):**
  * `Healthy / Normal (<70%)`: `#10b981` (Emerald)
  * `Warning (70% - 89%)`: `#f59e0b` (Amber)
  * `Critical (>=90%)`: `#f43f5e` (Rose)

* **Typography:**
  * UI Text: `Inter`, `-apple-system`, `system-ui`, sans-serif.
  * Telemetri & Log: Tabular Monospace (`font-variant-numeric: tabular-nums`, `JetBrains Mono`, `Fira Code`, monospace).

### 3.3 Micro-Interactions & 8-State Feedback

Setiap tombol dan elemen interaktif memiliki umpan balik visual terukur:

1. Default -> 2. Hover (brightness 1.08) -> 3. Focus-Visible (ring-2 ring-blue-500) -> 4. Active (`transform: scale(0.98)`) -> 5. Disabled (opacity 50%) -> 6. Loading (micro spinner) -> 7. Error -> 8. Success.

* Durasi transisi cepat: **120ms – 150ms ease-out** (tanpa animasi lambat yang membuang waktu pengguna).

---

## 4. Detailed Functional Specifications

### 4.1 Authentication & Security Hardening

* **Zero-Database Credential Storage:**
  * Password disimpan dalam hash `password_hash($pass, PASSWORD_BCRYPT)` di dalam `backend/config.php`.
  * Konfigurasi dilindungi `.htaccess` (`Require all denied` / `Deny from all`).

* **Session & CSRF Token:**
  * Native PHP Session menggunakan cookie aman: `HttpOnly`, `SameSite=Lax`, dan `Secure` (saat HTTPS aktif).
  * CSRF Token unik per sesi divalidasi pada seluruh mutasi (`POST`, `PUT`, `DELETE`) via header `X-CSRF-Token`.

* **Brute-Force Rate Limiting Ringan:**
  * Merekam percobaan gagal per IP ke temporary file JSON di `/tmp/serverdeck_rate_limit.json` (auto-expire 5 menit, max 5 kegagalan berturut-turut).
  * Tidak menggunakan database dan tidak meninggalkan jejak sampah di sistem file akun.

* **Toleransi Login Pengguna:**
  * Case-insensitive untuk username (mencegah typo huruf kapital otomatis di keyboard Android/iOS).
  * Toleransi tanda titik penutup pada password.

### 4.2 Hosting Resource & Performance Monitor (Zero-CPU Overhead)

* **Strategi Pembacaan Metrik Super Cepat:**
  1. **Tingkat 1 (Direct Datastore Cache):** Membaca langsung cache cPanel di `~/.cpanel/datastore/` (misal informasi disk space, domain list, bandwidth). Waktu baca **< 1 ms**, tanpa CPU fork.
  2. **Tingkat 2 (Transient In-Memory/File Cache):** Hasil pembacaan di-cache selama **15 detik** di file temp PHP. Dashboard polling tidak akan membebani server hosting meskipun dibuka di beberapa tab browser sekaligus.
  3. **Tingkat 3 (Fallback LVE Command):** Jika cache tidak tersedia, baru mengeksekusi `uapi Quota get_quota_info` atau perintah Linux dasar secara terukur.

* **Metrik yang Ditampilkan (Hosting-Scoped):**
  * **CPU LVE:** Persentase penggunaan terhadap limit 1 Core (100%).
  * **RAM Fisik LVE:** Penggunaan memori real-time terhadap batas paket (`... MB / 4.00 GB`).
  * **Penyimpanan & Inode:** Total byte terpakai di `/home/yakubfir` dan jumlah inode (file) terhadap batas kuota.
  * **Proses (NPROC & EP):** Jumlah proses aktif akun (`... / 400 NPROC`) dan Entry Processes (`... / 60 EP`).
  * **I/O Speed & IOPS:** Limit transfer disk (32 MB/s) dan IOPS limit (4.096).
  * **Bandwidth Bulanan:** Bandwidth terpakai bulan berjalan.

### 4.3 File & Directory Manager

* **CageFS Chroot Jail:**
  * Setiap request path diperiksa kanonikalitasnya melalui `realpath()`.
  * Seluruh path di luar `/home/yakubfir` ditolak dengan `HTTP 403 Forbidden` untuk mencegah *directory traversal*.

* **CodeMirror 6 In-Browser Editor:**
  * Dimuat secara dinamis (*lazy import*) hanya saat pengguna mengklik "Edit File".
  * Syntax highlighting adaptif berdasarkan ekstensi (`.php`, `.js`, `.ts`, `.json`, `.html`, `.css`, `.sh`, `.env`, `.yml`).
  * Shortcut keyboard: `Ctrl + S` (atau `Cmd + S`) untuk menyimpan file tanpa menutup modal editor.

* **Operasi File Efisien:**
  * Listing direktori menggunakan `scandir()` native PHP dengan pemisahan folder dan file terurut.
  * Upload multi-file via HTML5 Drag & Drop dengan chunk streaming.
  * Kompresi dan Ekstraksi ZIP instan via ekstensi native PHP `ZipArchive` (tersedia secara bawaan di LiteSpeed/cPanel).

### 4.4 Process Manager

* Menampilkan daftar proses akun pengguna saja (`ps -u yakubfir -o pid,ppid,%cpu,%mem,time,comm,args --sort=-%cpu`).
* Kemampuan filter/pencarian proses berdasarkan nama atau PID.
* Aksi **Kill Process** (`SIGTERM` kode 15, atau paksa `SIGKILL` kode 9) dengan verifikasi bahwa PID tersebut benar-benar milik user `yakubfir`.

### 4.5 Web Console / Safe Terminal Runner

* Eksekusi perintah command-line ringan yang dibatasi pada direktori aktif pengguna (`cwd`).
* Menggunakan `proc_open()` dengan proteksi timeout (maksimal 10 detik per perintah) agar tidak meninggalkan proses menggantung yang memakan jatah EP/NPROC.
* Riwayat perintah (*command history*) disimpan lokal di browser pengguna (`localStorage`).
* Tombol pintas cepat (*quick actions*): `git status`, `git pull`, `php -v`, `ls -lah`, `composer --version`.

### 4.6 Log Viewer (Reverse Byte-Seek, Anti-Hanging)

* **Bebas Masalah Slot EP (No Long-Polling / No SSE):**
  * Alih-alih koneksi persistent yang menahan slot Entry Process hosting, log dibaca secara **stateless**.
  * Backend menggunakan fungsi `fseek()` dari akhir file (*reverse byte-seek*) untuk membaca 100/250/500 baris terakhir secara efisien tanpa memuat seluruh file besar ke RAM PHP.

* **Target Log File:**
  * `musend.web.id` SSL Access Log
  * `yakubfirman.com` SSL Access Log
  * `php.error.log` / `error_log`

* Tombol Auto-Refresh opsional (interval aman: setiap 10 detik).

---

## 5. API Contract & Endpoints

Seluruh endpoint beralamat di: `/monitor/api.php?action=<endpoint>` (atau `/monitor/api/<endpoint>` melalui `.htaccess`).

Format Respon Standar:

```json
{
  "success": true,
  "data": { },
  "message": "Operasi berhasil"
}
```

Format Respon Error:

```json
{
  "success": false,
  "error": "Pesan kesalahan yang ramah",
  "code": 400
}
```

### 5.1 Endpoint Directory

| Method | Endpoint | Deskripsi | Parameter Utama |
| :--- | :--- | :--- | :--- |
| `POST` | `auth/login` | Login & set cookie sesi | `username`, `password` |
| `GET` | `auth/check` | Validasi sesi & kirim CSRF token | - |
| `POST` | `auth/logout` | Hapus sesi aktif | `csrf_token` |
| `GET` | `stats` | Ambil metrik CPU, RAM, EP, Disk (cached) | - |
| `GET` | `files/list` | List item direktori | `path` (relatif terhadap home) |
| `GET` | `files/read` | Baca isi file teks | `path` |
| `POST` | `files/save` | Simpan revisi file teks | `path`, `content`, `csrf_token` |
| `POST` | `files/create` | Buat file atau folder baru | `dir`, `name`, `type: "file"\|"dir"` |
| `POST` | `files/delete` | Hapus file atau folder rekursif | `path`, `csrf_token` |
| `POST` | `files/rename` | Ubah nama file / folder | `old_path`, `new_name`, `csrf_token` |
| `POST` | `files/chmod` | Ubah izin akses (misal 0755) | `path`, `mode`, `csrf_token` |
| `POST` | `files/upload` | Upload satu/banyak file | `dir`, `files[]`, `csrf_token` |
| `GET` | `files/download` | Unduh direct attachment stream | `path` |
| `POST` | `files/zip` | Kompres file/folder terpilih | `dir`, `items[]`, `zip_name` |
| `POST` | `files/unzip` | Ekstrak arsip zip | `path`, `dest_dir` |
| `GET` | `processes/list` | Daftar proses akun aktif | - |
| `POST` | `processes/kill` | Matikan PID tertentu | `pid`, `signal: 15\|9`, `csrf_token` |
| `POST` | `terminal/run` | Eksekusi CLI non-interaktif | `cmd`, `cwd`, `csrf_token` |
| `GET` | `logs/tail` | Baca N baris log terakhir | `type: "access"\|"error"`, `lines: 100` |
| `POST` | `settings/password` | Update password baru | `old_password`, `new_password` |

---

## 6. Project Structure & Packaging Strategy

Untuk menjaga repositori tetap bersih, rapi, dan mudah di-deploy ke hosting:

```text
hostingmanage/
├── backend/                        # Source code backend PHP (Zero-Vendor)
│   ├── .htaccess                   # Proteksi akses langsung config & src
│   ├── api.php                     # Entrypoint router & handler
│   ├── config.sample.php           # Template kredensial & path
│   └── src/                        # Modul PHP native murni (OOP ringan)
│       ├── Auth.php                # Sesi, CSRF, & rate-limit
│       ├── Files.php               # Operasi sistem file & zip
│       ├── Metrics.php             # Datastore & LVE parser
│       └── System.php              # Process & terminal execution
│
├── frontend/                       # Source code React SPA
│   ├── public/
│   │   ├── favicon.svg
│   │   └── robots.txt
│   ├── src/
│   │   ├── components/             # Komponen UI modular (Anti-Slop)
│   │   │   ├── layout/             # Sidebar, Header, MobileDrawer
│   │   │   ├── common/             # Button, StatCard, Badge, Modal
│   │   │   ├── files/              # FileTable, Breadcrumb, EditorModal
│   │   │   ├── processes/          # ProcessTable, KillConfirmModal
│   │   │   └── terminal/           # TerminalBox, CommandHistory
│   │   ├── hooks/                  # useStats, useFiles, useLogs
│   │   ├── pages/                  # Overview, Files, Processes, Logs, Settings
│   │   ├── services/               # api.ts (fetch wrapper + CSRF interceptor)
│   │   ├── types/                  # TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── index.css               # Tailwind directives + custom tokens
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts              # Konfigurasi proxy & manualChunks splitting
│
├── scripts/                        # Automasi deploy & packaging
│   └── build-package.sh            # Script 1-klik untuk bundling ZIP release
│
├── .gitignore
├── PRD.md                          # Dokumen spesifikasi teknis (ini)
└── README.md                       # Petunjuk instruksi singkat
```

### 6.1 Automated 1-Click Packaging (`build-package.sh`)

Script packaging akan otomatis:

1. Menjalankan `npm run build` di folder `frontend/`.
2. Menyalin aset terkompresi `frontend/dist/` ke folder sementara `build/`.
3. Menyalin `backend/api.php`, `backend/.htaccess`, `backend/src/`, dan `backend/config.sample.php` ke folder `build/`.
4. Mengompres seluruh isi `build/` menjadi file `serverdeck-release.zip` (< 1.5 MB).
5. File ZIP ini siap diunggah dan diekstrak langsung ke `/home/yakubfir/musend.web.id/monitor/`.

---

## 7. Non-Functional & Security Requirements

1. **Hosting Safety (CageFS Compliance):**
   * Tidak ada skrip yang mencoba melakukan `sudo`, mengakses `/root`, atau melintasi direktori di luar `/home/yakubfir`.
2. **Resource Throttling:**
   * Waktu eksekusi PHP dibatasi maksimal 10 detik (`max_execution_time = 10`).
   * Limit memori per request PHP dibatasi maksimal 32 MB (`memory_limit = 32M`), jauh di bawah alokasi hosting 4 GB.
3. **HTTP Caching & Compression:**
   * File `.htaccess` mengonfigurasi LiteSpeed gzip/brotli untuk semua file teks (`.js`, `.css`, `.svg`, `.json`).
   * Aset di folder `assets/` diberi header `Cache-Control: public, max-age=31536000, immutable`.
4. **Mobile Responsiveness Standard:**
   * Minimum ukuran area sentuh (*touch target*) tombol di smartphone adalah **44 x 44 px**.
   * Tidak ada overflow horizontal yang menyebabkan halaman bergeser ke samping di viewport mobile (360px – 430px).
5. **No AI-Slop Code Quality:**
   * Struktur kode rapi, terdokumentasi jelas, tanpa kode boilerplate mubazir atau dependensi npm/composer berlebih.
