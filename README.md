# 🚀 Musend Deck — Modern PHP on-demand Server & Hosting Cockpit

<p align="center">
  <img src="frontend/public/icon-192x192.png" alt="Musend Deck Logo" width="96" height="96" />
</p>

<p align="center">
  <b>Panel kontrol dan konsol server mandiri (self-hosted) berbasis PHP on-demand untuk Linux Shared Hosting, Cloud Instances, maupun Linux VPS.</b><br />
  <i>Backend PHP 8.2+ yang berjalan sesuai permintaan, tanpa daemon aplikasi permanen, dan dirancang untuk akun Linux non-root.</i>
</p>

<p align="center">
  <a href="https://php.net"><img src="https://img.shields.io/badge/PHP-8.2%2B-777bb4?style=flat-square&logo=php&logoColor=white" alt="PHP 8.2+" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18%20%7C%20Vite%206-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 18" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://web.dev/progressive-web-apps/"><img src="https://img.shields.io/badge/PWA-Ready-10b981?style=flat-square&logo=pwa&logoColor=white" alt="PWA Ready" /></a>
  <a href="#-arsitektur-php-on-demand"><img src="https://img.shields.io/badge/Architecture-PHP--on--demand-blueviolet?style=flat-square" alt="PHP on-demand" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" /></a>
</p>

---

## 👨‍💻 Pengembang & Inisiator Proyek

**Musend Deck** diciptakan dan dikembangkan oleh:
* **Pengembang:** [Yakub Firman Mustofa](https://yakubfirman.com)
* **Website Resmi:** [https://yakubfirman.com](https://yakubfirman.com)
* **Demo / Live Production:** [https://musend.web.id/monitor/](https://musend.web.id/monitor/)
* **Repositori Sumber:** [https://github.com/yakubfirman/hostingmanage](https://github.com/yakubfirman/hostingmanage)

---

## 🍃 Filosofi & Arsitektur: PHP on-demand

Sebagian besar kontrol panel server tradisional memerlukan hak istimewa pengguna tertinggi (*root*) dan terus-menerus menjalankan proses layanan latar belakang (seperti *Node.js, Python, atau Go daemon*) yang memakan memori 250 MB hingga 1 GB RAM secara konstan meskipun server sedang menganggur (*idle*).

**Musend Deck memakai backend PHP tanpa daemon aplikasi permanen:**
* Permintaan API ditangani oleh PHP-FPM atau runtime PHP yang disediakan web server. Web server dan PHP-FPM tetap memakai sumber daya sesuai konfigurasi host.
* Deployment dapat menjalankan proses sementara di latar belakang sampai pekerjaan selesai.
* Aplikasi tidak membutuhkan `sudo`. File Manager membatasi path ke direktori di dalam home akun OS PHP. Terminal menjalankan shell sebagai akun OS tersebut dan dapat mengakses semua file yang memang diizinkan untuk akun itu; `root_dir` adalah direktori awal dan batas File Manager, bukan sandbox OS.
* Untuk mengelola server dengan aman, jalankan PHP sebagai akun Linux khusus non-root dan batasi akses panel melalui HTTPS serta VPN atau allowlist IP.
* **Antarmuka Modern Kelas Dunia:** Frontend *Single Page Application* (SPA) berbasis React 18, Vite 6, Tailwind CSS, Lucide Icons, dan CodeMirror 6 dengan tema *Dark Mode* elegan berestetika visual presisi.

---

## ✨ Fitur-Fitur Lengkap Proyek

### 1. 🖥️ Web Console (Terminal Interaktif Mandiri)
- **Interactive Directory Tracking:** Mendukung navigasi direktori aktif (`cd folder`, `cd ..`, `cd ~`) yang tersimpan persisten antar eksekusi perintah.
- **Tab Autocomplete Cerdas:** Tekan <kbd>Tab</kbd> untuk melengkapi nama folder, berkas, atau utilitas secara otomatis dengan tray saran interaktif.
- **Bilah Navigasi Breadcrumbs:** Klik segmen rekam jejak folder di bilah lokasi untuk melompat langsung ke direktori tujuan.
- **Pintasan Keyboard Asli:** Mendukung <kbd>Ctrl + L</kbd> (bersihkan layar konsol), riwayat perintah panah atas/bawah, dan auto-focus kursor permanen.
- **Terminal akun Linux:** Perintah berjalan dengan hak akun OS PHP. Panel menampilkan batas akses ini; daftar perintah terlarang hanya pengaman tambahan dan bukan sandbox.

### 2. 📊 Telemetri Real-Time & Grafik Riwayat Tren
- Mengambil data CPU, RAM, proses, disk, dan I/O dari CloudLinux UAPI bila tersedia. Pada host lain, beberapa nilai merupakan estimasi proses akun; data kuota atau bandwidth yang tidak tersedia ditandai di dashboard.
- **Telemetry Trend Chart:** Grafik SVG interaktif dari sampel telemetri yang benar-benar terkumpul (maksimal 96 titik); riwayat bertambah saat dashboard aktif.
- Menampilkan pemakaian disk home dengan UAPI atau estimasi `du`; kuota hanya ditampilkan jika datanya tersedia.

### 3. 📁 File Manager & In-Browser Code Editor
- **Dual Mode Tampilan:** Mendukung tata letak Grid Card dan Tabel Berkas lengkap.
- **Kategori Filter Cepat:** Navigasi cepat antara *Semua Berkas, Direktori, Kode Sumber, Gambar, dan Arsip*.
- **In-Browser Code Editor:** Terintegrasi langsung dengan CodeMirror 6 untuk membaca dan mengedit berkas PHP, JS, TS, HTML, CSS, JSON, YAML, maupun Markdown.
- **Manajemen Arsip ZIP:** Kemampuan membuat arsip `.zip` dan mengekstrak berkas arsip langsung di server tanpa memerlukan terminal.
- **Pengaturan Izin & Unggah Berkas:** Pengaturan izin akses berkas (*chmod*) dan fitur unggah berkas instan.

### 4. 🚀 Deployment Center (CI/CD Otomatis)
- Mendeteksi otomatis folder proyek yang berada di direktori `~/projects/` beserta tipe frameworknya (Laravel, Astro, Next.js, React/Vite, Node.js, atau PHP Native).
- Membaca metadata Git terkini secara otomatis (*branch aktif, commit hash, pesan commit, author, dan status repo dirty/clean*).
- Pemicu deploy 1-klik terintegrasi dengan skrip otomasi kompilasi dan git pull (`~/bin/deploy-*`).
- Menampilkan live streaming log output proses deployment secara *real-time*.

### 5. 🗄️ Database Inspector & Snapshot Backup 1-Klik
- Inspeksi menyeluruh untuk database **PostgreSQL** dan **MySQL / MariaDB**.
- Auto-discovery kredensial koneksi database secara dinamis dari berkas `.env` proyek atau konfigurasi panel.
- Menampilkan daftar tabel publik, estimasi jumlah baris (*row count*), dan ukuran penyimpanan tiap tabel.
- **1-Click Snapshot Backup:** Membuat berkas dump cadangan terkompresi `.sql.gz` secara instan langsung dari peramban.
- Pengelola arsip cadangan: unduh berkas dump langsung ke komputer lokal atau hapus berkas cadangan lama yang tidak terpakai.

### 6. 🌐 Domain & SSL Expiry Monitor
- Mendeteksi secara dinamis semua domain utama, addon domain, serta subdomain aktif pada server akun Anda.
- Membaca masa berlaku sertifikat SSL dan menghitung sisa hari aktif secara otomatis sebelum masa kedaluwarsa.
- Menangani status domain baru yang sertifikat SSL-nya masih dalam antrean penerbitan (*Pending SSL*).
- Fitur live ping uji latensi dan kesehatan respons HTTP/HTTPS untuk setiap domain.

### 7. ⏰ Cron Jobs Manager (Penjadwal Tugas Berkala)
- Membaca, menambah, mengedit, menonaktifkan (*toggle active/inactive*), dan menghapus entri jadwal `crontab` Linux.
- Dilengkapi penerjemah ekspresi cron otomatis ke bahasa manusia (contoh: `*/15 * * * *` → *"Setiap 15 menit"*).
- Fitur **Test-Run** untuk menguji coba perintah cron langsung dengan umpan balik terminal sebelum disimpan ke crontab.

### 8. 🛡️ Security Auditor & Permission Normalizer
- Memindai beberapa kondisi keamanan akun, termasuk bit write untuk pengguna lain, izin folder SSH dan `.env`, penggunaan PHP sebagai root, serta aturan akses Nginx yang tidak dapat diverifikasi.
- Menghitung skor indeks keamanan akun (*Security Score*).
- **Permission Normalizer:** Menghapus bit write untuk pengguna lain pada web root, membatasi izin file SSH dan `.env`, serta menambahkan aturan `.htaccess` bila aman. Hasilnya perlu ditinjau; fitur ini bukan audit menyeluruh.

### 9. 🧹 Housekeeping & Storage Optimizer
- Mendeteksi dan membersihkan aset kompilasi JavaScript/CSS usang dari proses deployment sebelumnya.
- Membersihkan cache metrik sementara (>24 jam) untuk menghemat ruang disk dan penggunaan inode akun.

### 10. 📱 Progressive Web App (PWA) & Command Palette
- Mendukung pemasangan aplikasi mandiri (*standalone app*) di perangkat Android, iOS, Windows, dan macOS tanpa browser bar.
- **Command Palette (<kbd>Ctrl + K</kbd> / <kbd>Cmd + K</kbd>):** Bilah pencarian cepat untuk berpindah antar modul dalam hitungan detik.
- **First-Time Setup Wizard:** Pemasangan pertama kali berbasis antarmuka grafis yang ramah pengguna tanpa perlu menyunting berkas konfigurasi server secara manual.

---

## 🛠️ Panduan Instalasi & Deployment

### 📂 Pilih Lokasi Pemasangan

Musend Deck dapat dipasang di **mana saja** sesuai kebutuhan Anda. Pilih salah satu skenario berikut:

| Skenario | Direktori di Server | URL Akses |
| :--- | :--- | :--- |
| **Subfolder di domain utama** | `~/public_html/MusendDeck/` | `https://domain-anda.com/MusendDeck/` |
| **Subdomain khusus (root)** | `~/domain-anda.com/` atau `~/public_html/` | `https://deck.domain-anda.com/` |
| **Subfolder di subdomain** | `~/subdomain.domain-anda.com/panel/` | `https://subdomain.domain-anda.com/panel/` |
| **Domain root langsung** | `~/public_html/` | `https://domain-anda.com/` |

> **Catatan:** Pada cPanel / shared hosting, sesuaikan direktori tujuan dengan *Document Root* domain atau subdomain yang Anda tentukan di panel hosting Anda.
>
> Gunakan subfolder atau document root kosong. Installer menolak mengganti `index.html` atau `api.php` milik situs lain. Jalankan CLI installer sebagai akun Linux non-root yang sama dengan PHP-FPM.

---

### Metode 1: Menggunakan Skrip Installer Otomatis (Direkomendasikan)

Buka terminal SSH server Anda, lalu jalankan perintah berikut:

```bash
git clone https://github.com/yakubfirman/hostingmanage.git musend-deck
cd musend-deck
bash install.sh
```

Skrip installer otomatis akan:
1. Memverifikasi ketersediaan dan kompatibilitas runtime PHP (PHP 8.2+).
2. Meminta lokasi folder web tujuan — masukkan salah satu pilihan sesuai skenario Anda:
   ```
   # Contoh lokasi yang dapat dimasukkan:
   ~/public_html/MusendDeck          → https://domain-anda.com/MusendDeck/
   ~/deck.domain-anda.com            → https://deck.domain-anda.com/
   ~/public_html                     → https://domain-anda.com/
   ~/panel.domain-anda.com/MusendDeck → https://panel.domain-anda.com/MusendDeck/
   ```
3. Memasang berkas frontend yang telah dikompilasi, mikro-router PHP, dan perintah CLI untuk token setup.
4. Mengatur izin hanya untuk berkas aplikasi yang dipasang. Installer tidak menghapus folder `assets` yang sudah ada atau mengubah izin semua berkas di document root.
5. Menampilkan token setup satu kali. Simpan token ini dan masukkan ke Setup Wizard.

---

### Metode 2: Pemasangan Manual

Jika Anda ingin mengompilasi dan memasang secara manual:

1. **Clone Repositori:**
   ```bash
   git clone https://github.com/yakubfirman/hostingmanage.git
   cd hostingmanage
   ```

2. **Build Frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

3. **Salin ke Direktori Web Publik** (sesuaikan path tujuan dengan skenario Anda):
   ```bash
   # Contoh A — subfolder domain utama:
   TARGET=~/public_html/MusendDeck

   # Contoh B — subdomain khusus (root):
   TARGET=~/deck.domain-anda.com

   # Contoh C — domain root langsung:
   TARGET=~/public_html

   # Jalankan perintah salin berikut:
   mkdir -p "$TARGET"
   for path in index.html api.php setup-token.php config.sample.php config.php src; do
     if [ -e "$TARGET/$path" ]; then
       echo "Berkas $path sudah ada. Pilih document root kosong." >&2
       exit 1
     fi
   done
   cp -r frontend/dist/. "$TARGET/"
   cp backend/api.php "$TARGET/"
   cp backend/setup-token.php "$TARGET/"
   cp backend/config.sample.php "$TARGET/"
   cp -n backend/.htaccess "$TARGET/.htaccess"
   cp -r backend/src "$TARGET/"
   # Untuk Nginx, tinjau backend/nginx-security.conf.example dan terapkan
   # aturan tersebut pada blok server Nginx, bukan sebagai .htaccess.
   php "$TARGET/setup-token.php"
   ```
   Jika `.htaccess` sudah ada, gabungkan aturan dari `backend/.htaccess` secara manual dan jangan mengganti aturan situs yang sudah berjalan.

---

### Metode 3: Konfigurasi Pertama Kali (Setup Wizard UI)

Setelah berkas terpasang di direktori web Anda:

1. Buka peramban (browser) dan akses URL sesuai skenario yang Anda pilih, misalnya:
   - `https://domain-anda.com/MusendDeck/` (subfolder domain utama)
   - `https://deck.domain-anda.com/` (subdomain khusus)
   - `https://domain-anda.com/` (domain root langsung)
2. Tampilan **Musend Deck Setup Wizard** akan terbuka secara otomatis.
3. Jalankan `php setup-token.php` di direktori instalasi melalui SSH. Installer otomatis sudah menampilkan token ini.
4. Masukkan token, **Username**, dan **Password** admin panel yang Anda kehendaki. Password harus 12–72 byte.
5. Wizard menyarankan alokasi CPU dan RAM sesuai host; sesuaikan jika perlu.
6. Klik **"Instal & Masuk ke Dashboard"**. Token akan dihapus setelah konfigurasi berhasil dibuat.

---

## 💻 Persyaratan Sistem

| Komponen | Spesifikasi Minimum | Keterangan |
| :--- | :--- | :--- |
| **PHP Runtime** | PHP 8.2 atau lebih baru | Native CLI / FPM / FastCGI |
| **Ekstensi PHP** | `json`, `mbstring`, `zip`, `pdo`, `posix` | Standar pada sebagian besar hosting Linux |
| **Web Server** | Apache/LiteSpeed atau Nginx | Aturan `.htaccess` berlaku untuk Apache/LiteSpeed. Nginx perlu aturan dari [`backend/nginx-security.conf.example`](backend/nginx-security.conf.example) di dalam blok `server`. |
| **Sistem Operasi** | Linux x86_64 / ARM64 | Kompatibel dengan seluruh distribusi Linux standar |
| **Hak Akses** | Pengguna Biasa (*Standard User Space*) | **Tidak memerlukan akses root / sudo** |

---

## 🔐 Arsitektur Keamanan & Privasi

1. **Telemetri:** CloudLinux UAPI digunakan saat tersedia; nilai perkiraan host dan data yang tidak tersedia diberi label terpisah. Grafik riwayat hanya memakai sampel yang benar-benar terkumpul.
2. **Kredensial:** Kata sandi disimpan dengan `password_hash` dan diverifikasi melalui `password_verify`; Setup Wizard mewajibkan password 12–72 byte.
3. **Setup pertama:** Setup memerlukan token acak satu kali yang dibuat dari CLI, disimpan dengan izin privat di direktori sementara OS, dan dikonsumsi setelah konfigurasi berhasil.
4. **Batas File Manager:** Path kanonis dibatasi ke home akun Linux PHP dan symlink akhir ditolak. Ini tidak membatasi perintah shell.
5. **CSRF, CORS, dan login:** Permintaan perubahan data memerlukan token CSRF. CORS pengembangan hanya menerima origin loopback yang tepat. Forwarded IP hanya dipercaya dari proxy yang didaftarkan di `auth.trusted_proxies`.
6. **Perlindungan web server:** Apache/LiteSpeed memakai `.htaccess`; Nginx perlu aturan server tersendiri. Snippet Nginx berlaku pada seluruh `server` block; batasi regex ke prefix aplikasi jika berbagi domain dengan situs lain.
7. **Batas audit:** Security Auditor memeriksa beberapa kondisi akun dan izin file, bukan pengganti audit penetrasi atau pemeriksaan konfigurasi web server yang menyeluruh.

---

## ⚖️ Lisensi & Keterangan Terbuka

Perangkat lunak ini dirilis secara terbuka di bawah naungan [Lisensi MIT](LICENSE). Anda memiliki kebebasan untuk menggunakan, memodifikasi, menggabungkan, mempublikasikan, maupun mendistribusikan salinan perangkat lunak ini sesuai ketentuan lisensi.

> **Pemberitahuan:** *Musend Deck adalah proyek perangkat lunak independen dan tidak terafiliasi, disponsori, atau didukung secara resmi oleh penyedia panel komersial pihak ketiga mana pun. Seluruh integrasi menggunakan perintah standar POSIX, utilitas Linux native, dan antarmuka pemrograman terdokumentasi.*

---

<p align="center">
  Didesain dan dikembangkan dengan penuh dedikasi oleh <b><a href="https://yakubfirman.com">Yakub Firman Mustofa</a></b>.<br />
  <i>"Menghadirkan efisiensi server yang bersih, hemat daya, dan bertenaga untuk semua orang."</i>
</p>
