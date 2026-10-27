---
title: Memahami Kerentanan Kritis PHP2Shell (CVE-2026-109618 & CVE-2026-109619) dan Cara Mengamankan Server Linux
slug: memahami-kerentanan-kritis-php2shell-dan-cara-patching-server
date: 2026-10-27
updated: 2026-10-27
category: Cybersecurity
type: article
tags: [php2shell, cve-2026-109618, cve-2026-109619, php, ubuntu, sysadmin, keamanan-server]
status: published
description: Penjelasan lengkap dan mudah dipahami mengenai celah keamanan kritis PHP2Shell pada mesin PHP, cara kerjanya, serta panduan langkah demi langkah menambal server Ubuntu/Debian.
---

# PHP2Shell: Celah Kritis PHP dan Cara Mengamankan Server

Pada pertengahan Oktober 2026, dunia keamanan siber dikejutkan oleh penemuan sepasang celah keamanan tingkat kritis pada mesin inti bahasa pemrograman PHP yang dijuluki **PHP2Shell** (**CVE-2026-109618** dan **CVE-2026-109619**). 

Karena PHP menggerakkan sekitar 70% situs web di internet, kerentanan yang berdampak pada **PHP versi 5.4 hingga 8.5** ini menjadi ancaman serius bagi jutaan server di seluruh dunia. Artikel ini akan membahas apa itu PHP2Shell dengan bahasa yang mudah dipahami, mengapa celah ini begitu berbahaya, hingga cara memverifikasi dan menambalnya pada server Linux.

---

## Apa Itu PHP2Shell?

**PHP2Shell** adalah nama julukan untuk gabungan dua celah keamanan pada *core engine* (mesin inti) PHP yang memungkinkan penyerang melakukan **Unauthenticated Remote Code Execution (RCE)** serta mencuri isi memori server dari jarak jauh tanpa memerlukan akses login.

Nama *PHP2Shell* diambil dari alat eksploitasi (*exploit tool*) yang menggabungkan kedua celah tersebut untuk mengubah server target berbasis PHP menjadi akses *command shell* interaktif secara instan.

### Mengapa Sangat Berbahaya? (Analogi Gedung Perkantoran)

Pada kasus peretasan web biasa, celah keamanan umumnya terletak di **kode aplikasi**—misalnya celah pada fitur *upload file* yang kurang aman di kode *framework* atau *plugin* CMS. Selama kode aplikasi kita rapi dan dilindungi halaman login, penyerang tidak bisa masuk.

**PHP2Shell bekerja secara berbeda karena celahnya berada di mesin PHP itu sendiri, bukan di kode aplikasi web.**

> **Analogi Sederhana:**
> Bayangkan aplikasi web Anda adalah sebuah gedung perkantoran dengan penjagaan satpam berlapis di meja resepsionis (sistem login, middleware, dan pengaturan hak akses). PHP2Shell tidak melewati meja satpam tersebut, melainkan menyerang **sistem pipa ventilasi udara gedung (mesin PHP)** yang menyaring udara dari luar bahkan sebelum tamu menginjakkan kaki di pintu lobi.

Saat ada permintaan (*HTTP request*) masuk ke server, mesin PHP wajib membaca dan mengurai isi permintaan tersebut **sebelum** baris pertama kode aplikasi web dijalankan. Serangan PHP2Shell terjadi tepat pada fase awal ini—sehingga meskipun kode aplikasi Anda sudah sangat aman, server tetap bisa ditembus jika mesin PHP di bawahnya belum diperbarui.

---

## Bagaimana Cara Kerja Serangan PHP2Shell?

Serangan ini memanfaatkan kelemahan cara mesin PHP menangani kondisi darurat saat kehabisan memori (**Out-of-Memory / OOM**):

1. **Kondisi Normal:** Proses pekerja (*worker*) pada PHP bertugas melayani banyak pengunjung secara bergantian. Setiap kali satu permintaan selesai diproses, *worker* wajib membersihkan sisa memori sebelum melayani pengunjung berikutnya.
2. **Memicu Kehabisan Memori (OOM):** Penyerang mengirimkan permintaan khusus berformat `multipart/form-data` (format standar untuk mengunggah form/file) yang dirancang untuk menguras batas memori PHP (`memory_limit`) hingga habis di tengah proses pembacaan.
3. **Kegagalan Pembersihan Memori (*Bailout*):** Ketika memori habis, mesin PHP menarik "rem darurat" (disebut **bailout**) untuk menghentikan proses secara paksa. Sayangnya, sebelum sempat membersihkan memori dengan tuntas, proses keburu terputus dan meninggalkan struktur memori yang rusak (*corrupted state*).
4. **Pembajakan Memori:** Saat *worker* yang sama dipakai kembali untuk melayani permintaan berikutnya, tercipta dua celah fatal:
   * **CVE-2026-109618 (*Use-After-Free & Memory Leak*):** Kegagalan pembersihan pada fitur pelacak unggahan (`session.upload_progress`) membuat memori bocor ke dalam *cookie* `PHPSESSID` (mirip kasus *Heartbleed*) atau dimanipulasi untuk menjalankan kode jahat.
   * **CVE-2026-109619 (*Stale Global State*):** PHP mempercayai sisa data rusak di memori dari proses sebelumnya sebagai instruksi yang valid, sehingga penyerang dapat membaca file sistem hingga mengeksekusi perintah langsung di terminal server (RCE).

---

## Cara Mengecek dan Menambal (Patching) Server Ubuntu/Debian

Karena serangan terjadi sebelum aplikasi web berjalan, perbaikan wajib dilakukan dengan memperbarui paket PHP di level sistem operasi.

### 1. Kenali Arsitektur PHP di Server Anda (`PHP-FPM` vs `Apache mod_php`)
Sebelum melakukan pembaruan dan me-restart layanan, pastikan Anda mengetahui bagaimana web server menjalankan PHP. Jalankan perintah berikut:

```bash
php-fpm -v
```

Jika muncul pesan `command not found`, cek isi direktori konfigurasi PHP Anda (contoh untuk PHP 7.4 atau 8.x):

```bash
ls /etc/php/7.4/
# Output: apache2  cli  mods-available
```

* Jika terdapat folder **`fpm`**, berarti server Anda menggunakan **PHP-FPM** (biasanya dipadukan dengan Nginx atau Apache Event).
* Jika hanya terdapat folder **`apache2`** dan paket `libapache2-mod-php*`, berarti PHP berjalan menyatu di dalam layanan **Apache (`mod_php`)**.

### 2. Lakukan Pembaruan Paket (Update & Upgrade)
Tim pengembang PHP telah merilis pembaruan untuk cabang aktif (**PHP 8.2.35, 8.3.36, 8.4.27, dan 8.5.12**). 

Bagi pengguna sistem operasi Ubuntu/Debian yang masih menjalankan versi PHP lawas (*End-of-Life* seperti **PHP 7.4, 8.0, atau 8.1**) melalui repositori PPA **Ondřej Surý (`deb.sury.org`)** maupun repositori resmi distro, tambalan keamanan juga telah disediakan melalui mekanisme *backport*.

Jalankan perintah berikut untuk memperbarui paket PHP Anda:

```bash
sudo apt update
sudo apt install --only-upgrade php7.4* libapache2-mod-php7.4 -y
```
*(Catatan: Sesuaikan angka `7.4` dengan versi PHP yang terpasang di server Anda, misalnya `php8.3*`).*

### 3. Wajib Me-restart Layanan Web Server
Memperbarui paket saja tidak cukup karena proses PHP yang sedang berjalan di RAM masih menggunakan kode lama yang rentan. Restart layanan sesuai arsitektur server Anda:

```bash
# Jika menggunakan Apache mod_php:
sudo systemctl restart apache2

# Jika menggunakan PHP-FPM (sesuaikan versinya):
sudo systemctl restart php8.3-fpm
```

---

## Cara Memverifikasi Apakah Server Sudah Benar-Benar Ditambal

Banyak administrator server bingung ketika mengecek versi PHP setelah update karena angka versi utamanya tidak berubah (misalnya tetap tertulis `PHP 7.4.33`). 

Pada distribusi Linux seperti Ubuntu dan Debian, perbaikan keamanan disuntikkan ke dalam versi yang ada menggunakan metode **Backporting**—di mana hanya **angka revisi paket di belakang tanda hubung (`-`)** yang bertambah.

### 1. Cek Nomor Revisi Paket
Jalankan perintah `dpkg` untuk melihat versi paket yang terpasang:

```bash
dpkg -l | grep -E "php7.4-common|libapache2-mod-php7.4"
```

Pastikan versi paket pada PHP 7.4 sudah naik dari revisi `-30` ke **`1:7.4.33-31`** (atau versi revisi terbaru setelah tanggal 21 Oktober 2026).

### 2. Periksa Bukti CVE di Dalam Changelog Lokal
Pada repositori pihak ketiga seperti PPA `deb.sury.org`, perintah `apt changelog` sering kali tidak tersedia secara langsung. Sebagai gantinya, Anda dapat membaca catatan perubahan (*changelog*) langsung dari file dokumentasi lokal yang terpasang di server:

```bash
zcat /usr/share/doc/php7.4-common/changelog.Debian.gz | head -n 45
```

Jika server Anda sudah tertambal dari celah PHP2Shell, Anda akan menemukan baris berikut di dalam catatan versi terbaru:

```text
  * Backported from 8.2.35
   + [CVE-2026-109618, CVE-2026-109619]: Avoid state corruption via
     bailout.
```

### Apa Arti "Backported from 8.2.35" dan "Avoid state corruption via bailout"?
* **Backported from 8.2.35:** Karena pengembangan resmi PHP 7.4 telah berhenti di versi `7.4.33`, pengelola repositori mengambil kode tambalan keamanan dari rilis terbaru **PHP 8.2.35**, lalu menyesuaikannya dan menanamkannya ke dalam paket **PHP 7.4.33** revisi `-31`.
* **Avoid state corruption via bailout:** Menjelaskan cara kerja tambalan tersebut. Kini, setiap kali terjadi penghentian darurat (*bailout*) akibat kehabisan memori (OOM), mesin PHP akan langsung memutus dan mengisolasi memori secara bersih tanpa meninggalkan status rusak (*corrupted/stale state*) yang dapat dibajak oleh penyerang.

---

## Kesimpulan

Kerentanan **PHP2Shell (CVE-2026-109618 & CVE-2026-109619)** menjadi pengingat penting bahwa keamanan aplikasi web tidak hanya bergantung pada seberapa aman kode aplikasi yang kita tulis, tetapi juga pada pemeliharaan rutin *runtime* dan sistem operasi di bawahnya. Dengan memperbarui paket PHP ke revisi terbaru, me-restart layanan web server, serta memverifikasi catatan *changelog* CVE, server Anda telah terlindungi sepenuhnya dari ancaman eksploitasi ini.