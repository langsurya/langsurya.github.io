# Panduan Menambah Konten

Setiap tulisan punya **topik** (kelompok besar) dan **kategori** (sub-kelompok).

| Topik (`topic`) | Warna aksen | Contoh kategori | Gaya halaman |
|---|---|---|---|
| `teknologi` (default) | Navy | Cybersecurity, Linux, Pemrograman | Standar, cocok untuk kode & tabel |
| `umum` | Teal | Produktivitas, Keuangan, Cerita, Opini | Paragraf lebih lega |
| `agama` | Hijau | Renungan, Kajian, Doa, Fiqih Harian | Huruf serif, judul bagian di tengah, teks Arab kanan-ke-kiri |

Tab topik di beranda baru muncul otomatis setelah ada tulisan dari minimal 2 topik.

## Langkah

1. Buat file `articles/TAHUN/BULAN/slug.md`.
2. Tambahkan entri di `articles/index.json` dengan field `topic`.
3. Set `status` ke `published`.

## Contoh entri `index.json`

```json
{
  "slug": "makna-sabar",
  "path": "2026/11/makna-sabar.md",
  "title": "Makna Sabar dalam Keseharian",
  "date": "2026-11-01",
  "updated": "2026-11-01",
  "topic": "agama",
  "category": "Renungan",
  "type": "Tulisan",
  "tags": ["sabar", "renungan"],
  "status": "published",
  "description": "Renungan singkat tentang sabar dan cara menerapkannya sehari-hari."
}
```

## Menulis teks Arab (ayat/hadis)

Tulis teks Arab dalam blockquote atau paragraf tersendiri. Teks otomatis tampil kanan-ke-kiri dengan huruf lebih besar. Letakkan terjemahan di blockquote berikutnya:

```markdown
> إِنَّ اللَّهَ مَعَ الصَّابِرِينَ

> "Sesungguhnya Allah beserta orang-orang yang sabar." (QS. Al-Baqarah: 153)
```

## Saran untuk konten agama

- Selalu sertakan sumber (nama surah dan nomor ayat, atau perawi hadis).
- Periksa ulang teks Arab dan terjemahannya dari sumber terpercaya sebelum terbit.
- Bedakan dengan jelas mana dalil dan mana pendapat pribadi.
