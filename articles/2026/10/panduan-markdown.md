---
title: Panduan Lengkap Markdown: Sejarah, Pengertian, dan Cara Penggunaan
slug: panduan-markdown
date: 2026-10-28
updated: 2026-10-28
category: Panduan
type: Artikel
tags: markdown, menulis, dokumentasi, github
status: published
description: Mengenal Markdown dari sejarah dan pengertiannya, lalu belajar semua sintaks dasar hingga lanjutan beserta contoh dan tips penulisan.
---

# Panduan Lengkap Markdown

Markdown adalah cara menulis teks berformat hanya dengan karakter biasa di keyboard. Tidak perlu menekan tombol tebal atau miring seperti di pengolah kata. Cukup tambahkan simbol seperti `#`, `*`, atau `-`, dan teks akan diubah menjadi tampilan yang rapi.

Seluruh tulisan di situs ini juga ditulis dengan Markdown.

## Sejarah Singkat

Markdown dibuat oleh **John Gruber** bersama **Aaron Swartz** dan dirilis pada **2004**. Tujuannya sederhana: membuat format tulisan yang tetap enak dibaca dalam bentuk teks mentah, tetapi bisa diubah menjadi HTML untuk web.

Gruber terinspirasi dari kebiasaan orang menulis email teks biasa, misalnya memberi tanda bintang untuk menekankan kata atau tanda strip untuk membuat daftar. Kebiasaan itulah yang dijadikan aturan.

Perkembangan pentingnya:

| Tahun | Peristiwa |
|---|---|
| 2004 | Markdown versi awal dirilis beserta skrip Markdown.pl |
| 2009 | GitHub mulai banyak memakai Markdown untuk README dan komentar |
| 2014 | Proyek CommonMark dimulai untuk membuat spesifikasi yang baku |
| 2017 | GitHub merilis spesifikasi GitHub Flavored Markdown (GFM) berbasis CommonMark |

Karena spesifikasi awal Gruber tidak terlalu ketat, muncul banyak "rasa" (*flavor*) Markdown. Yang paling umum dipakai sekarang adalah **CommonMark** dan **GitHub Flavored Markdown**.

## Pengertian dan Cara Kerja

Markdown adalah **bahasa markah ringan** (*lightweight markup language*). Artinya:

- **Bahasa markah**: memberi tanda pada teks untuk menunjukkan strukturnya, seperti judul, daftar, atau tautan. HTML juga termasuk bahasa markah.
- **Ringan**: tandanya sangat sedikit dan sederhana, sehingga teks mentahnya tetap mudah dibaca manusia.

Alurnya seperti ini:

```text
File .md  →  Parser Markdown  →  HTML  →  Ditampilkan di browser
```

Parser adalah program yang membaca simbol Markdown lalu mengubahnya menjadi HTML. Contohnya, `**tebal**` diubah menjadi `<strong>tebal</strong>`.

## Kenapa Memakai Markdown?

- **Mudah dipelajari**: sintaks dasarnya bisa dikuasai dalam beberapa menit.
- **Fokus menulis**: tidak terganggu urusan format dan tombol.
- **Portabel**: file `.md` hanyalah teks biasa yang bisa dibuka di editor apa pun.
- **Cocok untuk Git**: perubahan teks mudah dilacak per baris.
- **Dipakai di banyak tempat**: GitHub, GitLab, Notion, Obsidian, Discord, Reddit, Stack Overflow, dan banyak generator situs statis.

## Sintaks Dasar

### Judul (Heading)

Gunakan tanda pagar `#`. Jumlah pagar menentukan tingkat judul, dari 1 sampai 6.

```markdown
# Judul Tingkat 1
## Judul Tingkat 2
### Judul Tingkat 3
#### Judul Tingkat 4
```

> Beri satu spasi setelah tanda pagar. Biasanya halaman hanya punya satu judul tingkat 1.

### Paragraf dan Baris Baru

Paragraf dipisahkan dengan **satu baris kosong**. Menekan Enter sekali saja biasanya tidak membuat baris baru di hasil akhir.

```markdown
Ini paragraf pertama.

Ini paragraf kedua.
```

### Penekanan Teks

```markdown
**teks tebal**
*teks miring*
***tebal dan miring***
~~teks dicoret~~
```

Hasilnya: **teks tebal**, *teks miring*, ***tebal dan miring***, dan ~~teks dicoret~~.

> Coretan (`~~`) adalah tambahan GFM. Tidak semua parser mendukungnya.

### Daftar Tidak Berurutan

Gunakan `-`, `*`, atau `+` di awal baris.

```markdown
- Apel
- Jeruk
- Mangga
```

Hasilnya:

- Apel
- Jeruk
- Mangga

### Daftar Berurutan

Gunakan angka diikuti titik.

```markdown
1. Buka editor
2. Tulis konten
3. Simpan file
```

Hasilnya:

1. Buka editor
2. Tulis konten
3. Simpan file

### Tautan (Link)

```markdown
[Teks tautan](https://contoh.com)
[Teks tautan](https://contoh.com "Judul saat disorot")
```

### Gambar

Sama seperti tautan, tetapi diawali tanda seru.

```markdown
![Deskripsi gambar](gambar/foto.png)
```

Teks di dalam kurung siku adalah **teks alternatif**. Teks ini dibaca oleh pembaca layar dan muncul jika gambar gagal dimuat, jadi tulislah deskripsi yang jelas.

### Kutipan (Blockquote)

```markdown
> Ini adalah kutipan.
> Bisa lebih dari satu baris.
```

Hasilnya:

> Ini adalah kutipan.

### Kode di Dalam Kalimat

Apit teks dengan satu tanda backtick. Contohnya, menulis `npm install` di tengah kalimat. Cocok untuk nama perintah, nama file, atau potongan kode pendek.

### Blok Kode

Untuk kode beberapa baris, buka dan tutup dengan **tiga tanda backtick** di baris tersendiri. Setelah backtick pembuka, tulis nama bahasanya, misalnya `bash`, `javascript`, atau `python`, agar editor bisa memberi warna sintaks.

Cara menulisnya:

````markdown
```bash
sudo apt update
sudo apt upgrade -y
```
````

Hasilnya:

```bash
sudo apt update
sudo apt upgrade -y
```

```javascript
function sapa(nama) {
  return `Halo, ${nama}!`;
}
```

### Garis Pemisah

Tulis tiga tanda strip, bintang, atau garis bawah di baris tersendiri.

```markdown
---
```

## Sintaks Lanjutan

Bagian ini sebagian besar berasal dari GitHub Flavored Markdown dan didukung oleh banyak platform modern.

### Tabel

```markdown
| Nama  | Peran     | Status |
|-------|-----------|--------|
| Andi  | Penulis   | Aktif  |
| Budi  | Editor    | Cuti   |
```

Hasilnya:

| Nama | Peran | Status |
|---|---|---|
| Andi | Penulis | Aktif |
| Budi | Editor | Cuti |

Atur perataan kolom dengan titik dua di baris pemisah:

```markdown
| Kiri | Tengah | Kanan |
|:-----|:------:|------:|
```

### Daftar Tugas (Checklist)

```markdown
- [x] Tulis draf
- [ ] Periksa ejaan
- [ ] Terbitkan
```

Di GitHub, daftar ini tampil sebagai kotak centang.

### Daftar Bersarang

Beri spasi (biasanya dua atau empat) sebelum tanda daftar.

```markdown
- Buah
  - Apel
  - Jeruk
- Sayur
  - Bayam
```

### Tautan Otomatis

Alamat yang diapit tanda kurung sudut otomatis menjadi tautan:

```markdown
<https://contoh.com>
```

### Escape Karakter

Jika ingin menampilkan simbol Markdown apa adanya, beri garis miring terbalik `\` di depannya.

```markdown
\*bukan miring\*
\# bukan judul
```

Karakter yang sering perlu di-*escape*: `\` `` ` `` `*` `_` `{}` `[]` `()` `#` `+` `-` `.` `!` `|`.

### Front Matter

Banyak situs statis membaca informasi tulisan dari blok di bagian paling atas file, diapit tiga tanda strip. Situs ini juga memakainya.

```yaml
---
title: Judul Tulisan
date: 2026-10-28
category: Panduan
tags: markdown, menulis
---
```

## Contoh Satu Dokumen Utuh

```markdown
# Cara Membuat Kopi Tubruk

Kopi tubruk adalah cara paling **sederhana** menyeduh kopi.

## Bahan

- 2 sendok kopi bubuk
- 1 sendok gula (opsional)
- 200 ml air panas

## Langkah

1. Masukkan kopi dan gula ke gelas.
2. Tuang air panas sekitar 90°C.
3. Aduk, lalu diamkan 3 menit.

> Tips: jangan pakai air mendidih agar rasa tidak terlalu pahit.

Sumber lain: [Wikipedia](https://id.wikipedia.org/wiki/Kopi_tubruk)
```

## Alat untuk Menulis Markdown

| Jenis | Contoh |
|---|---|
| Editor kode | VS Code (pratinjau bawaan dengan `Ctrl+Shift+V`), Sublime Text |
| Aplikasi catatan | Obsidian, Typora, Joplin, Notion |
| Daring | Editor GitHub, StackEdit, Dillinger |
| Konversi dokumen | Pandoc (Markdown ke PDF, DOCX, HTML, dan lainnya) |

## Kesalahan yang Sering Terjadi

- **Lupa spasi setelah `#`**: `#Judul` tidak selalu dikenali sebagai judul. Tulis `# Judul`.
- **Tidak ada baris kosong**: daftar, tabel, atau blok kode yang menempel ke paragraf sebelumnya kadang tidak terbaca. Beri satu baris kosong di atasnya.
- **Indentasi tidak konsisten** pada daftar bersarang. Pilih dua atau empat spasi dan pakai terus.
- **Blok kode tidak ditutup**: lupa tiga backtick penutup membuat sisa dokumen dianggap kode.
- **Mengandalkan fitur khusus**: tabel, checklist, atau coretan belum tentu didukung semua platform. Cek dulu di tempat tulisan akan diterbitkan.

## Tips Menulis yang Rapi

1. Gunakan urutan judul yang logis: `#`, lalu `##`, lalu `###`. Jangan melompat tingkat.
2. Satu ide per paragraf, dan buat paragraf pendek.
3. Pakai daftar untuk langkah dan poin, bukan untuk semua hal.
4. Selalu cantumkan nama bahasa di blok kode.
5. Tulis teks alternatif yang jelas untuk setiap gambar.
6. Pratinjau tulisan sebelum diterbitkan.

## Ringkasan Cepat

| Ingin membuat | Tulis |
|---|---|
| Judul | `# Judul` |
| Tebal | `**teks**` |
| Miring | `*teks*` |
| Coret | `~~teks~~` |
| Daftar | `- item` |
| Daftar bernomor | `1. item` |
| Tautan | `[teks](url)` |
| Gambar | `![alt](url)` |
| Kutipan | `> teks` |
| Kode pendek | satu backtick di kiri dan kanan |
| Blok kode | tiga backtick di baris pembuka dan penutup |
| Garis | `---` |
| Checklist | `- [ ] tugas` |

> Cara tercepat menguasai Markdown adalah langsung memakainya. Mulai dari catatan harian atau README proyek, dan sintaksnya akan hafal dengan sendirinya.
