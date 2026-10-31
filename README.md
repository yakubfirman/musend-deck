# 🚀 ServerDeck — Modern Cloud & Hosting Management Panel

[![PHP Version](https://img.shields.io/badge/PHP-8.2%2B-777bb4?logo=php&logoColor=white)](https://php.net)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%206-61dafb?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-10b981?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Architecture](https://img.shields.io/badge/Architecture-Zero--Daemon-blueviolet)](#-arsitektur-zero-daemon)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **ServerDeck** adalah panel manajemen server & web hosting modern, mandiri, dan berkecepatan tinggi yang dirancang khusus untuk cPanel, CloudLinux (CageFS), LiteSpeed, dan VPS Linux tanpa daemon latar belakang (*0 MB idle RAM footprint*).

---

## ✨ Fitur Unggulan

### 1. 📊 Telemetri Sumber Daya 100% Real
- Mengintegrasikan data kuota CloudLinux LVE langsung melalui cPanel UAPI (`lvecpu`, `lvememphy`, `lveep`, `lvenproc`, `lveio`, `lveiops`).
- Menampilkan grafik interaktif SVG **Historical Trend 24 Jam** untuk vCPU, RAM Fisik, dan Entry Processes (EP) dengan tooltip detail.
- Indikator akurat untuk kuota Unmetered SSD dan Inodes.

### 2. 📁 File Manager Ramah Pengguna
- **Dual View Mode:** Tampilan Grid Card dan Tampilan Tabel Standar.
- **Filter Cepat:** Kategori *All, Folder, Code, Image, Archive*.
- **In-Browser Editor:** CodeMirror 6 dengan syntax highlighting untuk kode PHP, JS, CSS, JSON, Markdown, dan HTML.
- **Aksi Arsip:** Kompresi multi-file ke `.zip` dan ekstraksi `.zip` langsung di server.
- Pengaturan izin file (*chmod*) dan upload multi-file aman.

### 3. 🚀 1-Click Deployment Center
- Mendukung pemantauan status Git repo (*branch, commit hash, commit message, dirty status*).
- Pemicu deployment otomatis 1-klik untuk frontend, backend, atau seluruh proyek.
- Jendela konsol terminal live untuk memantau proses build secara real-time.

### 4. 🗄️ Database Inspector & 1-Click Backup
- Inspeksi PostgreSQL & MySQL secara langsung (koneksi, ukuran total, daftar tabel, dan perkiraan baris data).
- **1-Click Backup:** Membuat dump terkompresi `.sql.gz` secara instan.
- Manajer arsip backup: unduh atau hapus arsip langsung dari web panel.

### 5. 🌐 Domain & SSL Expiry Monitor
- Memantau sertifikat SSL seluruh domain akun via cPanel AutoSSL datastore.
- Perhitungan sisa hari aktif sertifikat SSL dengan indikator warna status.
- Uji *health-check* & latency ping HTTP/HTTPS live ke setiap domain.

### 6. ⏰ Cron Jobs Manager
- Membaca, mengedit, menonaktifkan (*toggle*), dan menghapus jadwal `crontab`.
- Penerjemah jadwal otomatis ke bahasa manusia (contoh: `*/15 * * * *` → *"Setiap 15 menit"*).
- Fitur **Test-Run** untuk menguji perintah cron secara langsung dengan feedback terminal instan.

### 7. 🛡️ Security Auditor & 1-Click Normalizer
- Memeriksa izin file berbahaya (*world-writable 0777*), folder `.ssh`, private keys, dan file `.env`.
- Menghitung skor kesehatan keamanan server (contoh: *Score 95/100 A+*).
- **1-Click Normalizer:** Memperbaiki seluruh izin file (0644) dan direktori (0755) secara otomatis serta menerapkan proteksi `.htaccess`.

### 8. 🧹 Housekeeping & Storage Optimizer
- Mendeteksi dan membersihkan bundle JavaScript/CSS usang dari kompilasi sebelumnya.
- Membersihkan cache sementara yang sudah usang (>24 jam) untuk menghemat ruang disk hosting.

### 9. 📱 Progressive Web App (PWA)
- Mendukung instalasi aplikasi mandiri (*standalone*) di Android, iOS, Windows, dan macOS dengan ikon SVG futuristik dan service worker offline-ready.

---

## ⚡ Arsitektur Zero-Daemon

Kebanyakan kontrol panel server (seperti cPanel, aaPanel, Webmin) memerlukan daemon latar belakang yang berjalan 24/7 dan mengonsumsi 200MB–1GB RAM. 

ServerDeck menggunakan pendekatan **Serverless-style Micro PHP 8.2+ Architecture**:
- **0 MB Idle Memory:** Backend hanya aktif selama beberapa milidetik ketika ada request HTTP masuk, lalu langsung mati.
- **Sangat Ramah Shared Hosting:** Tidak membebani batas Entry Processes (EP) atau limit memori CloudLinux Anda.
- **Zero External Vendor:** Backend tidak memerlukan folder `vendor/` raksasa di server produksi.

---

## 🚀 Panduan Instalasi Cepat

### Metode 1: Menggunakan Script 1-Perintah (Direkomendasikan)

Di server atau hosting baru, jalankan:

```bash
git clone https://github.com/yakubfirman/hostingmanage.git serverdeck
cd serverdeck
bash install.sh
```

Script akan memandu Anda menentukan folder web tujuan (misal: `/home/username/public_html/monitor`).

---

### Metode 2: Setup Kredensial via Web Wizard

1. Setelah berkas terpasang, buka URL website/subdomain Anda di browser (contoh: `https://domain-anda.com/monitor/`).
2. Tampilan **Setup Wizard Interaktif** akan otomatis terbuka.
3. Masukkan **Username & Kata Sandi** administrator yang Anda inginkan.
4. Pilih alokasi Core CPU dan RAM hosting Anda.
5. Klik **"Instal & Masuk ke Dashboard"**. ServerDeck akan otomatis membuat file `config.php` yang aman dan langsung membawa Anda ke dashboard!

---

## 📋 Persyaratan Sistem

- **PHP:** 8.2 atau lebih baru
- **Ekstensi PHP:** `json`, `mbstring`, `zip`, `pdo`, `pdo_mysql` / `pdo_pgsql`
- **Web Server:** LiteSpeed, Apache (dengan modul `mod_rewrite`), atau Nginx
- **OS:** CloudLinux, CentOS, AlmaLinux, Rocky Linux, Ubuntu, Debian

---

## 🔒 Keamanan & Privasi

- Kredensial dan konfigurasi privat disimpan di `backend/config.php` yang **selalu di-ignore oleh git** dan terlindungi dari unduhan langsung via browser oleh `.htaccess`.
- Kata sandi di-hash menggunakan algoritma `PASSWORD_BCRYPT` standar industri.
- Dilengkapi sistem proteksi **CSRF Token** pada setiap operasi mutasi data dan mekanisme proteksi *Rate Limiting* terhadap serangan brute-force login.

---

## 📄 Lisensi

Proyek ini didistribusikan di bawah lisensi **MIT**. Silakan gunakan, modifikasi, dan bagikan secara bebas.
