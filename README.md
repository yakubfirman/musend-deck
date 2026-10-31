# 🚀 Musend Deck — Modern, Zero-Daemon Cloud & Hosting Cockpit

<p align="center">
  <img src="frontend/public/icon-192x192.png" alt="Musend Deck Logo" width="96" height="96" />
</p>

<p align="center">
  <b>A featherweight, self-hosted web control cockpit and terminal designed for shared hosting (cPanel/DirectAdmin/CageFS) and Linux VPS.</b><br />
  <i>Runs anywhere PHP 8.2+ exists — zero background daemons, zero root requirements, 100% CageFS isolated.</i>
</p>

<p align="center">
  <a href="https://php.net"><img src="https://img.shields.io/badge/PHP-8.2%2B-777bb4?style=flat-square&logo=php&logoColor=white" alt="PHP 8.2+" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18%20%7C%20Vite%206-61dafb?style=flat-square&logo=react&logoColor=black" alt="React 18" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://web.dev/progressive-web-apps/"><img src="https://img.shields.io/badge/PWA-Ready-10b981?style=flat-square&logo=pwa&logoColor=white" alt="PWA Ready" /></a>
  <a href="#-arsitektur-zero-daemon"><img src="https://img.shields.io/badge/Architecture-Zero--Daemon-blueviolet?style=flat-square" alt="Zero-Daemon" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" /></a>
</p>

---

## 👨‍💻 Pengembang / Author

**Musend Deck** dikembangkan dan diinisiasi oleh:
* **Pengembang:** [Yakub Firman Mustofa](https://yakubfirman.com)
* **Portofolio & Kontak:** [https://yakubfirman.com](https://yakubfirman.com)
* **Demo / Live Production:** [https://musend.web.id/monitor/](https://musend.web.id/monitor/)

---

## ⚡ Mengapa Musend Deck?

Sebagian besar panel manajemen server (seperti cPanel, aaPanel, Webmin, Cockpit) memerlukan akses **root** dan menjalankan daemon latar belakang (Node.js, Python, atau Go) yang menghabiskan 250MB–1GB RAM terus menerus.

**Musend Deck** hadir dengan paradigma baru:
* **0 MB Idle Memory (Zero-Daemon):** Backend berupa native micro-router PHP 8.2+ yang hanya aktif saat ada request HTTP dan langsung keluar dalam hitungan milidetik.
* **100% Aman di Shared Hosting & CageFS:** Tidak butuh `sudo` atau hak akses root. Bekerja mulus di dalam batas limit CloudLinux LVE (*Entry Processes, IOPS, NPROC*).
* **Tampilan Kelas Dunia:** Frontend SPA modern berbasis React 18, Vite 6, Tailwind CSS, Lucide Icons, dan CodeMirror 6 dengan tema *deep midnight dark mode*.

---

## ✨ Fitur Unggulan

### 1. 🖥️ Web Console (Terminal Bash Interaktif)
- **Tab Autocomplete Cerdas:** Tekan <kbd>Tab</kbd> untuk otomatis melengkapi nama folder, direktori, file, atau perintah dengan tray saran interaktif.
- **Working Directory Tracking:** Navigasi direktori (`cd folder`, `cd ..`, `cd ~`) tersimpan secara persisten antar perintah.
- **Bilah Navigasi Breadcrumbs:** Klik segmen folder di bilah lokasi untuk langsung melompat ke direktori tersebut.
- **Keyboard Shortcuts Asli:** Mendukung <kbd>Ctrl + L</kbd> (bersihkan layar), <kbd>Ctrl + C</kbd> (batal), dan riwayat panah atas/bawah.
- **Auto-Focus Permanen:** Kursor selalu siap menerima ketikan berikutnya tanpa perlu mengklik input ulang.

### 2. 📊 Metrik Real-Time & Grafik Tren 24 Jam
- Telemetri sumber daya akurat yang membaca kuota CloudLinux LVE (`lvecpu`, `lvememphy`, `lveep`, `lvenproc`, `lveio`, `lveiops`).
- Grafik SVG interaktif 24-Hour Historical Trend untuk CPU, RAM Fisik, dan Entry Processes dengan hover tooltip detail.
- Monitor kuota SSD Storage dan Inodes (total file).

### 3. 📁 File Manager & In-Browser Code Editor
- Dual mode tampilan: Grid Card dan Tabel File lengkap.
- Filter cepat: *Semua, Folder, Kode, Gambar, Arsip*.
- **In-Browser Code Editor:** CodeMirror 6 dengan syntax highlighting untuk PHP, JS, CSS, JSON, Markdown, dan HTML.
- Aksi kompresi arsip `.zip` dan ekstraksi langsung di server tanpa terminal.
- Pengaturan perizinan file (*chmod*) dan upload multi-file aman.

### 4. 🚀 1-Click Git Deployment Manager
- Memantau status Git repositori (*branch, commit hash, commit message, status clean/dirty*).
- Pemicu deployment otomatis 1-klik untuk frontend, backend, atau seluruh aplikasi.
- Live console terminal log untuk memantau proses instalasi atau build secara real-time.

### 5. 🗄️ Database Inspector & 1-Click Backup
- Inspeksi database MySQL & PostgreSQL (status koneksi, ukuran database, daftar tabel, dan perkiraan baris data).
- **1-Click Backup:** Membuat dump terkompresi `.sql.gz` secara instan.
- Manajer arsip backup: unduh atau hapus arsip langsung dari browser.

### 6. 🌐 Domain & SSL Expiry Monitor
- Membaca status sertifikat SSL seluruh domain akun via cPanel AutoSSL datastore.
- Perhitungan sisa hari aktif masa berlaku SSL dengan indikator badge warna status.
- Uji *health-check* & latency ping HTTP/HTTPS live untuk setiap domain.

### 7. ⏰ Cron Jobs Manager
- Membaca, mengedit, menonaktifkan (*toggle*), dan menghapus jadwal `crontab` Linux.
- Penerjemah jadwal otomatis ke bahasa manusia (contoh: `*/15 * * * *` → *"Setiap 15 menit"*).
- Fitur **Test-Run** untuk menguji perintah cron secara langsung dengan feedback terminal instan.

### 8. 🛡️ Security Auditor & 1-Click Normalizer
- Memindai izin file berbahaya (*world-writable 0777*), folder `.ssh`, private keys, dan file kredensial `.env`.
- Menghitung skor kesehatan keamanan server (contoh: *Score 95/100 A+*).
- **1-Click Normalizer:** Memperbaiki seluruh izin file (0644) dan direktori (0755) secara otomatis serta menerapkan proteksi `.htaccess`.

### 9. 🧹 Housekeeping & Storage Optimizer
- Mendeteksi dan membersihkan bundle JavaScript/CSS usang dari kompilasi sebelumnya.
- Membersihkan cache metrik sementara yang sudah usang (>24 jam) untuk menghemat ruang disk.

### 10. 📱 Progressive Web App (PWA) & Command Palette
- Mendukung instalasi aplikasi mandiri (*standalone*) di Android, iOS, Windows, dan macOS.
- **Command Palette (<kbd>Ctrl + K</kbd> / <kbd>Cmd + K</kbd>):** Akses cepat ke seluruh modul sistem dari mana saja.

---

## 🚀 Panduan Instalasi Cepat

### Metode 1: Menggunakan Script 1-Perintah (Direkomendasikan)

Di server atau hosting Anda, jalankan perintah berikut:

```bash
git clone https://github.com/yakubfirman/musend-deck.git musend-deck
cd musend-deck
bash install.sh
```

Script akan memandu Anda menentukan folder web tujuan (misal: `/home/username/public_html/monitor`).

---

### Metode 2: Setup Kredensial via Web Wizard

1. Setelah berkas terpasang, buka URL website/subdomain Anda di browser (contoh: `https://domain-anda.com/monitor/`).
2. Tampilan **Musend Deck Setup Wizard** akan otomatis terbuka.
3. Masukkan **Username & Kata Sandi** administrator yang Anda inginkan.
4. Pilih alokasi Core CPU dan RAM hosting Anda.
5. Klik **"Instal & Masuk ke Dashboard"**. Musend Deck akan otomatis membuat file `config.php` yang aman dan langsung membawa Anda ke dashboard!

---

## 📋 Persyaratan Sistem

- **PHP:** 8.2 atau lebih baru
- **Ekstensi PHP:** `json`, `mbstring`, `zip`, `pdo`, `pdo_mysql` / `pdo_pgsql`
- **Web Server:** LiteSpeed, Apache (dengan modul `mod_rewrite`), atau Nginx
- **OS Kompatibel:** CloudLinux, AlmaLinux, Rocky Linux, CentOS, Ubuntu, Debian

---

## 🔒 Keamanan & Privasi

- Kredensial dan konfigurasi privat disimpan di `backend/config.php` yang **selalu di-ignore oleh git** dan terlindungi dari unduhan langsung via browser oleh `.htaccess`.
- Kata sandi di-hash menggunakan algoritma `PASSWORD_BCRYPT` standar industri.
- Dilengkapi sistem proteksi **CSRF Token** pada setiap operasi mutasi data dan mekanisme proteksi *Rate Limiting* terhadap serangan brute-force login.

---

## 📄 Lisensi & Kontribusi

Proyek ini didistribusikan di bawah lisensi **MIT**. Silakan gunakan, kembangkan, dan bagikan secara bebas.

Dibuat dengan ❤️ oleh **[Yakub Firman Mustofa](https://yakubfirman.com)**.
