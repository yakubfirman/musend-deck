# ServerDeck

> Lightweight Web-based Server & Hosting Management Panel (React SPA + Micro PHP REST API)

ServerDeck adalah panel dashboard mandiri modern untuk mengelola file, direktori, proses latar belakang, dan performa akun hosting cPanel/CloudLinux tanpa beban background daemon (*zero idle RAM footprint*).

---

## 📖 Dokumentasi Lengkap

Spesifikasi arsitektur, daftar endpoint API, dan panduan fitur dapat dibaca di **[PRD.md](PRD.md)**.

---

## 🚀 Fitur Utama

- **Hosting-Scoped Resource Monitor:** Menampilkan limit kuota CloudLinux LVE akun (`4 GB RAM`, `100% CPU / 1 Core`, `NPROC 400`, `EP 60`, `32 MB/s I/O`) secara akurat.
- **File & Directory Explorer:** File manager lengkap dengan in-browser code editor, multi-file upload, rename, chmod, zip, dan unzip.
- **Process Manager:** Pantau dan kelola proses aktif akun Linux (`ps -u <user>`).
- **Web Terminal Runner:** Eksekusi perintah command-line aman di level akun pengguna.
- **Log Viewer:** Pemantau SSL access log dan error log PHP real-time.

---

## 🛠️ Stack Teknologi

- **Frontend:** React 18+ (TypeScript), Vite, Tailwind CSS, Lucide Icons, CodeMirror 6.
- **Backend:** Zero-Vendor Micro PHP 8.2+ REST API (Native, no Composer in production).
- **Target Deployment:** Shared / Cloud Hosting (LiteSpeed / Apache / cPanel).

---

## 💻 Pengembangan Lokal

1. **Clone repositori:**
   ```bash
   git clone https://github.com/yakubfirman/hostingmanage.git
   cd hostingmanage
   ```

2. **Jalankan Frontend (Vite):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Jalankan Backend (PHP):**
   ```bash
   cd backend
   php -S 127.0.0.1:8000
   ```

---

&copy; 2026 Yakub Firman Mustofa.
