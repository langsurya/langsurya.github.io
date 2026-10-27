---
title: "Mengenal dan Menambal Node2Shell (CVE-2026-111497) di Node.js"
slug: patch-node2shell
date: 2026-10-27
updated: 2026-10-27
category: Cybersecurity
type: Artikel
tags: node2shell, http2shell, cve-2026-111497, nodejs, brotli, rce, patching, keamanan-server
status: published
description: Penjelasan lengkap tentang celah kritis Node2Shell pada decoder Brotli di Node.js, jalur eksploitasi, versi terdampak, cara audit dan patching, serta mitigasi sementara untuk server produksi.
---
# Mengenal dan Menambal Celah Keamanan "Node2Shell" (CVE-2026-111497) di Node.js

Setelah dunia infrastruktur web dikejutkan oleh celah keamanan **PHP2Shell**, ekosistem JavaScript/Node.js juga menghadapi kerentanan kritis serupa yang dijuluki **Node2Shell** (atau dikenal juga sebagai **HTTP2Shell**). Kerentanan yang tercatat dengan kode **CVE-2026-111497** ini memiliki skor keparahan **CVSS 4.0 sebesar 9.2 (Critical)** dan berpotensi memungkinkan penyerang melakukan *Remote Code Execution* (RCE) atau mengambil alih server dari jarak jauh.

Artikel ini akan membahas tuntas apa itu **Node2Shell**, bagaimana cara kerjanya dari sudut pandang awam hingga teknis mendalam, perbedaannya dengan *PHP2Shell*, serta langkah-langkah *patching* dan mitigasinya di server produksi.

---

## 1. Apa Itu Node2Shell?

Secara sederhana, ketika data dikirim melalui internet (misalnya saat aplikasi web menerima data dari pengguna atau mengambil data dari server lain), data tersebut sering kali "dipadatkan" (dikompresi) agar ukurannya kecil dan proses pengirimannya cepat. Salah satu format kompresi paling populer di web modern adalah **Brotli** (buatan Google).

Di dalam mesin **Node.js**, terdapat komponen bawaan yang bertugas membuka kembali paket data Brotli tersebut (*Brotli decoder*).

**Analogi Sederhana:**
Bayangkan *decoder* Brotli di dalam Node.js seperti seorang petugas gudang yang bertugas membongkar paket kiriman dan menaruh isinya ke dalam kotak penyimpanan (*memori/buffer*) dengan ukuran tertentu. 

Pada celah **Node2Shell (CVE-2026-111497)**, penyerang mengirimkan sebuah "paket Brotli palsu" yang sudah dimodifikasi sedemikian rupa. Saat petugas gudang (Node.js) membuka paket tersebut, ia tertipu dan terus menumpuk barang melewati batas kotak penyimpanan hingga meluber ke ruangan sebelah (*Out-of-Bounds Write* / *Buffer Overflow*). Akibatnya:
1. Gudang bisa langsung runtuh (**Aplikasi *crash* / *Denial of Service***).
2. Penyerang bisa menyelipkan instruksi berbahaya ke area memori server untuk dijalankan secara otomatis (**Remote Code Execution / RCE**).

---

## 2. Detail Teknis (Untuk Developer, Sysadmin & Security Engineer)

Bagi rekan-rekan teknis yang mengelola infrastruktur, berikut adalah rincian anatomi kerentanan **CVE-2026-111497**:

* **CVE ID:** CVE-2026-111497 (Alias: *Node2Shell*, *HTTP2Shell*)
* **Skor Keparahan:** CVSS v4.0: **9.2 (Critical)** | Node.js Advisory: **High**
* **Komponen Terdampak:** Library C `deps/brotli` (`c/dec/decode.c`) yang di-bundle dan dikompilasi langsung ke dalam *binary* utama Node.js.
* **Jenis Kerentanan:** *Out-of-Bounds Write* (CWE-787) pada proses dekompresi *stream* Brotli.

### Dampak Utama Eksploitasi

Jika celah ini berhasil dieksploitasi oleh penyerang, ada tiga dampak fatal yang dapat terjadi pada server:

1. **Denial of Service (DoS) / Aplikasi Mati Mendadak:** Penulisan memori yang meluber (*out-of-bounds*) akan langsung memicu *Segmentation Fault* (Segfault) di level OS, yang seketika mematikan proses utama atau *worker* Node.js.
2. **Memory Disclosure (Kebocoran Data Memori):** Penyerang berpotensi membaca atau memanipulasi area *heap memory* yang berdekatan, yang bisa berisi data sensitif seperti *environment variables* (`.env`), token autentikasi, atau *session* pengguna lain.
3. **Remote Code Execution (RCE) / Pengambilalihan Server:** Dalam skenario terburuk, penyerang dapat menimpa *pointer* instruksi di memori untuk mengeksekusi perintah sistem operasi (*shell command*) secara jarak jauh dengan hak akses (*privilege*) user yang menjalankan service Node.js tersebut.

### Perbedaan Krusial: PHP2Shell vs Node2Shell
Berbeda dengan **PHP2Shell** yang dapat langsung dieksploitasi hanya dengan mengirimkan *request* HTTP ke web server yang menjalankan PHP, **Node2Shell membutuhkan jalur dekompresi Brotli yang aktif**. 

Node.js tidak otomatis mendekompresi body Brotli pada modul `http` mentah, **tetapi aplikasi Anda rentan apabila memenuhi salah satu dari 3 jalur berikut:**
1. **Menerima Request Berkompresi Brotli (`Content-Encoding: br`):** Misalnya menggunakan **Express 5** (`express.json()` / `express.urlencoded()`) atau **`body-parser` versi 2.x**, yang secara *default* otomatis mendekompresi *request body* berformat Brotli.
2. **Melakukan Outbound `fetch()` ke URL Eksternal:** Fungsi bawaan `fetch()` di Node.js (berbasis *Undici*) secara otomatis mengirimkan header `Accept-Encoding: br` dan langsung mendekompresi respons Brotli. Jika aplikasi Anda mengambil data (*webhook*, *scraper*, *image proxy*, atau *API call*) dari URL yang dapat dikontrol penyerang, aplikasi Anda rentan!
3. **Memanggil Modul `node:zlib` Secara Langsung:** Aplikasi atau *dependency* npm yang menggunakan fungsi `zlib.brotliDecompress()`, `zlib.brotliDecompressSync()`, atau `zlib.createBrotliDecompress()` pada input dari pengguna.

> **Catatan Penting:** Meng-update package npm bernama `brotli` melalui `npm update` **TIDAK** akan menambal celah ini, karena kode yang rentan berada di dalam *core binary* Node.js (`deps/brotli`), bukan di folder `node_modules`.

---

## 3. Daftar Versi yang Terdampak & Versi Patch Resmi

Tim Node.js telah merilis *security patch* pada **21 Oktober 2026**. Pastikan runtime Anda berada pada versi aman berikut:

| Jalur Rilis Node.js | Versi Rentan | Versi Aman (Patched) | Status Dukungan |
| :--- | :--- | :--- | :--- |
| **Node.js 26.x (Current)** | `<= 26.12.0` | **`v26.12.1`** atau lebih baru | Didukung Aktif |
| **Node.js 24.x (LTS)** | `<= 24.22.0` | **`v24.22.1`** atau lebih baru | Didukung Aktif |
| **Node.js 22.x (LTS)** | `<= 22.23.3` | **`v22.23.4`** atau lebih baru | Didukung Aktif |
| **Node.js 20.x ke bawah** *(20, 18, 16, dst.)* | **Semua Versi** | **Tidak Ada Patch Resmi** | **End-of-Life (EOL)** |

*Catatan Ekosistem Lain:* Karena celah ini berasal dari *upstream* Google Brotli (diperbaiki di Brotli `1.2.1`, `1.1.1`, dan `1.0.10`), runtime lain seperti **Bun** juga terdampak dan telah menambalnya di **Bun `v1.4.4`**.

---

## 4. Cara Audit & Cek Apakah Server Anda Rentan

Lakukan pengecekan di server produksi, container Docker, maupun runner CI/CD Anda dengan langkah berikut:

### A. Cek Versi Runtime Node.js
Jalankan perintah berikut di terminal server atau di dalam container:
```bash
node -v

```

Jika menjalankan aplikasi di dalam Docker, periksa langsung di dalam container yang sedang berjalan:

```bash
docker exec -it <nama_container> node -v

```

Jika output menunjukkan versi di bawah `22.23.4`, `24.22.1`, atau `26.12.1` (atau masih menggunakan seri `v20.x` dan `v18.x`), maka runtime Anda **rentan**.

### B. Cek Penggunaan Library yang Membuka Brotli Otomatis

Masuk ke direktori proyek Anda dan periksa apakah Anda menggunakan Express 5 atau `body-parser` 2.x:

```bash
npm ls express body-parser

```

Cari juga apakah ada kode atau library yang memanggil fungsi dekompresi Brotli secara langsung:

```bash
grep -rnE "brotliDecompress|createBrotliDecompress" ./src ./app

```

---

## 5. Panduan Patching & Perbaikan (Step-by-Step)

Solusi utama dan paling permanen adalah memperbarui *binary* Node.js ke versi yang sudah di-patch.

### Opsi 1: Update Menggunakan NVM (Node Version Manager)

Jika Anda menggunakan `nvm` di lingkungan *development* atau server:

```bash
# Untuk pengguna Node 22 LTS
nvm install 22.23.4
nvm alias default 22.23.4
nvm use default

# Untuk pengguna Node 24 LTS
nvm install 24.22.1
nvm alias default 24.22.1
nvm use default

```

Jangan lupa me-restart service aplikasi Anda (misalnya dengan `pm2 restart all --update-env` atau `systemctl restart <nama-service>`).

### Opsi 2: Update di Server Ubuntu / Debian (via APT / NodeSource)

Jika Node.js diinstal melalui repositori sistem (APT):

```bash
sudo apt update
sudo apt install --only-upgrade nodejs -y

# Verifikasi versi setelah upgrade
node -v

# Restart service Node.js / PM2
sudo systemctl restart nama-aplikasi.service

```

*(Catatan: Jika Anda masih berada di repositori Node.js 20.x yang sudah EOL, Anda wajib mengubah repositori NodeSource ke `node_22.x` atau `node_24.x` terlebih dahulu).*

### Opsi 3: Rebuild Container Docker

Jika aplikasi berjalan di atas Docker, jangan hanya mengandalkan tag generik seperti `node:22-alpine` tanpa melakukan *pull* ulang. Ubah `Dockerfile` Anda agar mengunci versi patch minimal:

```dockerfile
# Gunakan versi yang sudah di-patch
FROM node:22.23.4-alpine
# atau FROM node:24.22.1-alpine

```

Kemudian bangun ulang (*rebuild*) image tanpa cache:

```bash
docker compose build --no-cache
docker compose up -d

```

---

## 6. Mitigasi Sementara (Workaround) Jika Belum Bisa Upgrade

Jika Anda mengelola sistem *legacy* (misalnya masih tertahan di Node.js 18 atau 20 EOL) dan membutuhkan waktu untuk menguji kompatibilitas sebelum *upgrade*, terapkan langkah mitigasi darurat berikut:

### 1. Blokir Header `Content-Encoding: br` di Reverse Proxy (Nginx / Apache)

Cegah paket Brotli dari klien eksternal mencapai proses Node.js dengan menolaknya langsung di level *Reverse Proxy*.

**Contoh Konfigurasi di Nginx:**
Tambahkan blok berikut di dalam blok `server` atau `location` yang mengarah ke aplikasi Node.js Anda:

```nginx
# Tolak request masuk yang dikompresi dengan Brotli
if ($http_content_encoding ~* "br") {
    return 415; # Unsupported Media Type
}

```

Lalu muat ulang Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx

```

**Contoh Konfigurasi di Apache (`mod_rewrite`):**

```apache
RewriteEngine On
RewriteCond %{HTTP:Content-Encoding} br [NC]
RewriteRule .* - [R=415,L]

```

### 2. Matikan Dekompresi Otomatis di Express / Body-Parser

Jika menggunakan `body-parser` atau Express, Anda dapat mengatur opsi `inflate: false` (namun perhatikan bahwa ini juga akan menonaktifkan dekompresi `gzip`/`deflate`), atau pasang *middleware* paling awal sebelum `express.json()` untuk menolak header `Content-Encoding: br`.

### 3. Batasi Header `Accept-Encoding` pada Outbound `fetch()`

Jika aplikasi Node.js Anda melakukan `fetch()` ke URL milik pihak ketiga/pengguna, paksa header agar tidak meminta format Brotli:

```javascript
await fetch(targetUrl, {
  headers: {
    'Accept-Encoding': 'gzip, deflate, identity' // Hindari 'br'
  }
});

```

---

## Kesimpulan

Celah keamanan **Node2Shell (CVE-2026-111497)** menjadi pengingat penting bahwa kerentanan kritis tidak hanya muncul dari kode yang kita tulis atau *package* di `node_modules`, melainkan bisa bersumber langsung dari *native dependency* (seperti C/C++ library Brotli) di dalam runtime utama.

Segera lakukan inventarisasi versi Node.js di seluruh server dan container Anda, pastikan sudah diperbarui ke minimal **v22.23.4**, **v24.22.1**, atau **v26.12.1**, dan rencanakan migrasi segera apabila masih ada sistem yang berjalan di Node.js 20.x ke bawah.
