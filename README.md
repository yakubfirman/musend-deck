# 🚀 Musend Deck — Modern, Eco-Friendly, Zero-Daemon Server & Hosting Cockpit

<p align="center">
  <img src="frontend/public/icon-192x192.png" alt="Musend Deck Logo" width="96" height="96" />
</p>

<p align="center">
  <b>Panel kontrol dan konsol server mandiri (self-hosted) berarsitektur Zero-Daemon yang ultra-ringan, ramah lingkungan, dan dirancang khusus untuk Linux Shared Hosting, Cloud Instances, maupun Linux VPS.</b><br />
  <i>Berjalan di mana pun PHP 8.2+ tersedia — tanpa proses daemon latar belakang, tanpa akses root, dan 100% aman dalam ruang isolasi pengguna.</i>
</p>

<p align="center">
  <a href="https://php.net"><img src="https://img.shields.io/badge/PHP-8.2%2B-777bb4?style=flat-square&logo=php&logoColor=white" alt="PHP 8.2+" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18%20%7C%20Vite%206-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 18" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://web.dev/progressive-web-apps/"><img src="https://img.shields.io/badge/PWA-Ready-10b981?style=flat-square&logo=pwa&logoColor=white" alt="PWA Ready" /></a>
  <a href="#-arsitektur-zero-daemon--ramah-lingkungan"><img src="https://img.shields.io/badge/Architecture-Zero--Daemon-blueviolet?style=flat-square" alt="Zero-Daemon" /></a>
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

## 🍃 Filosofi & Arsitektur: Zero-Daemon & Ramah Lingkungan

Sebagian besar kontrol panel server tradisional memerlukan hak istimewa pengguna tertinggi (*root*) dan terus-menerus menjalankan proses layanan latar belakang (seperti *Node.js, Python, atau Go daemon*) yang memakan memori 250 MB hingga 1 GB RAM secara konstan meskipun server sedang menganggur (*idle*).

**Musend Deck hadir dengan pendekatan komputasi hijau (Green Computing):**
* **0 MB Idle Memory (Zero-Daemon):** Backend berupa *native micro-router* PHP 8.2+ stateless yang hanya aktif saat ada permintaan HTTP dari pengguna dan langsung melepaskan seluruh sumber daya memori dalam hitungan milidetik (*scale-to-zero*).
* **Hemat Energi & Sumber Daya:** Tidak ada *CPU polling* atau thread proses abadi di latar belakang, meminimalkan *CPU wakeups*, panas server, dan jejak karbon server hosting Anda.
* **100% Aman dalam Isolasi Pengguna (*User-Space Sandbox*):** Tidak membutuhkan hak akses `sudo` atau modifikasi kernel sistem. Seluruh operasi berkas dan eksekusi perintah dikurung secara ketat di dalam direktori kerja akun Anda.
* **Antarmuka Modern Kelas Dunia:** Frontend *Single Page Application* (SPA) berbasis React 18, Vite 6, Tailwind CSS, Lucide Icons, dan CodeMirror 6 dengan tema *Dark Mode* elegan berestetika visual presisi.

---

## ✨ Fitur-Fitur Lengkap Proyek

### 1. 🖥️ Web Console (Terminal Interaktif Mandiri)
- **Interactive Directory Tracking:** Mendukung navigasi direktori aktif (`cd folder`, `cd ..`, `cd ~`) yang tersimpan persisten antar eksekusi perintah.
- **Tab Autocomplete Cerdas:** Tekan <kbd>Tab</kbd> untuk melengkapi nama folder, berkas, atau utilitas secara otomatis dengan tray saran interaktif.
- **Bilah Navigasi Breadcrumbs:** Klik segmen rekam jejak folder di bilah lokasi untuk melompat langsung ke direktori tujuan.
- **Pintasan Keyboard Asli:** Mendukung <kbd>Ctrl + L</kbd> (bersihkan layar konsol), riwayat perintah panah atas/bawah, dan auto-focus kursor permanen.
- **Aman & Terisolasi:** Perintah yang berpotensi merusak sistem luar ditolak dengan proteksi *Safe Shell*.

### 2. 📊 Telemetri Real-Time & Grafik Riwayat Tren
- Memantau penggunaan sumber daya akun secara presisi (persentase CPU, RAM Fisik terpakai, Entry Processes, IOPS, serta batas Kecepatan I/O).
- **24-Hour Historical Trend Chart:** Visualisasi grafik tren historis SVG interaktif dengan informasi rincian saat kursor diarahkan (*tooltip hover*).
- Menampilkan penggunaan penyimpanan disk akun secara dinamis (mendukung mode alokasi kuota tertentu maupun *unmetered disk*).

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
- Memindai celah keamanan pada berkas pengguna, mendeteksi berkas dengan izin terlalu longgar (*world-writable 0777*), folder SSH, dan berkas lingkungan konfigurasi sensitif (`.env`).
- Menghitung skor indeks keamanan akun (*Security Score*).
- **1-Click Normalizer:** Memperbaiki seluruh perizinan berkas (0644) dan direktori (0755) secara otomatis serta menerapkan proteksi berkas konfigurasi melalui `.htaccess`.

### 9. 🧹 Housekeeping & Storage Optimizer
- Mendeteksi dan membersihkan aset kompilasi JavaScript/CSS usang dari proses deployment sebelumnya.
- Membersihkan cache metrik sementara (>24 jam) untuk menghemat ruang disk dan penggunaan inode akun.

### 10. 📱 Progressive Web App (PWA) & Command Palette
- Mendukung pemasangan aplikasi mandiri (*standalone app*) di perangkat Android, iOS, Windows, dan macOS tanpa browser bar.
- **Command Palette (<kbd>Ctrl + K</kbd> / <kbd>Cmd + K</kbd>):** Bilah pencarian cepat untuk berpindah antar modul dalam hitungan detik.
- **First-Time Setup Wizard:** Pemasangan pertama kali berbasis antarmuka grafis yang ramah pengguna tanpa perlu menyunting berkas konfigurasi server secara manual.

---

## 🛠️ Panduan Instalasi & Deployment

### Metode 1: Menggunakan Skrip Installer Otomatis (Direkomendasikan)

Buka terminal SSH server Anda, lalu jalankan perintah berikut:

```bash
git clone https://github.com/yakubfirman/hostingmanage.git musend-deck
cd musend-deck
bash install.sh
```

Skrip installer otomatis akan:
1. Memverifikasi ketersediaan dan kompatibilitas runtime PHP (PHP 8.2+).
2. Meminta lokasi folder web tujuan (default: `~/public_html/monitor`).
3. Memasang berkas frontend yang telah dikompilasi serta mikro-router backend PHP.
4. Menerapkan perizinan berkas yang aman (`0755` untuk folder, `0644` untuk file).

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

3. **Salin ke Direktori Web Publik:**
   ```bash
   mkdir -p ~/public_html/monitor
   cp -r frontend/dist/* ~/public_html/monitor/
   cp backend/api.php ~/public_html/monitor/
   cp backend/.htaccess ~/public_html/monitor/
   cp -r backend/src ~/public_html/monitor/
   ```

---

### Metode 3: Konfigurasi Pertama Kali (Setup Wizard UI)

Setelah berkas terpasang di direktori web Anda:

1. Buka peramban (browser) dan akses URL tempat Anda memasang Musend Deck (contoh: `https://domain-anda.com/monitor/`).
2. Tampilan **Musend Deck Setup Wizard** akan terbuka secara otomatis.
3. Masukkan **Username** dan **Password** admin panel yang Anda kehendaki.
4. Wizard secara otomatis menyarankan alokasi CPU dan RAM sesuai sistem host Anda (dapat disesuaikan pada opsi lanjutan jika diperlukan).
5. Klik **"Instal & Masuk ke Dashboard"**. Musend Deck akan menghasilkan berkas konfigurasi privat `config.php` terproteksi dan Anda akan langsung diarahkan masuk ke dashboard!

---

## 💻 Persyaratan Sistem

| Komponen | Spesifikasi Minimum | Keterangan |
| :--- | :--- | :--- |
| **PHP Runtime** | PHP 8.2 atau lebih baru | Native CLI / FPM / FastCGI |
| **Ekstensi PHP** | `json`, `mbstring`, `zip`, `pdo`, `posix` | Standar pada sebagian besar hosting Linux |
| **Web Server** | Apache (dengan `mod_rewrite`), LiteSpeed, Nginx | Mendukung file router `.htaccess` / URL rewrite |
| **Sistem Operasi** | Linux x86_64 / ARM64 | Kompatibel dengan seluruh distribusi Linux standar |
| **Hak Akses** | Pengguna Biasa (*Standard User Space*) | **Tidak memerlukan akses root / sudo** |

---

## 🔐 Arsitektur Keamanan & Privasi

1. **Kredensial Terenkripsi:** Kata sandi panel diamankan menggunakan enkripsi *hash* satu arah berstandar industri `PASSWORD_BCRYPT`.
2. **Proteksi Akses Berkas Konfigurasi:** Berkas `config.php` dilindungi oleh aturan `.htaccess` dari akses publik langsung dan secara otomatis dimasukkan ke `.gitignore` agar tidak bocor ke repositori publik.
3. **Pencegahan Directory Traversal:** Seluruh operasi pembacaan berkas dan navigasi terminal dienkapsulasi dengan verifikasi `realpath()`, memastikan eksekusi tidak dapat melintasi direktori di luar batas *home* akun pengguna.
4. **Proteksi CSRF & Rate Limiting:** Setiap permintaan manipulasi data (*POST/PUT/DELETE*) diverifikasi menggunakan token CSRF dinamis per sesi, serta dilengkapi pembatasan percobaan login untuk menangkis serangan *brute-force*.

---

## ⚖️ Lisensi & Keterangan Terbuka

Perangkat lunak ini dirilis secara terbuka di bawah naungan [Lisensi MIT](LICENSE). Anda memiliki kebebasan untuk menggunakan, memodifikasi, menggabungkan, mempublikasikan, maupun mendistribusikan salinan perangkat lunak ini sesuai ketentuan lisensi.

> **Pemberitahuan:** *Musend Deck adalah proyek perangkat lunak independen dan tidak terafiliasi, disponsori, atau didukung secara resmi oleh penyedia panel komersial pihak ketiga mana pun. Seluruh integrasi menggunakan perintah standar POSIX, utilitas Linux native, dan antarmuka pemrograman terdokumentasi.*

---

<p align="center">
  Didesain dan dikembangkan dengan penuh dedikasi oleh <b><a href="https://yakubfirman.com">Yakub Firman Mustofa</a></b>.<br />
  <i>"Menghadirkan efisiensi server yang bersih, hemat daya, dan bertenaga untuk semua orang."</i>
</p>
