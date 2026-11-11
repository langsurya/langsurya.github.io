# Checklist Pengujian TTS Lintas Browser

Dokumen ini mencatat hasil pengujian langsung. Static code review, emulator viewport, dan inspeksi source tidak boleh diberi status PASS.

## Status

- **PASS**: diuji langsung pada browser/perangkat dan berhasil.
- **FAIL**: diuji langsung dan gagal. Tulis versi OS/browser, langkah reproduksi, serta hasil aktual.
- **NOT TESTED**: belum diuji langsung pada browser/perangkat tersebut.
- **NOT SUPPORTED**: browser tidak menyediakan API yang dibutuhkan. Fitur utama lain tetap harus diuji.

## Informasi Sesi Uji

- Tanggal:
- Commit/versi web:
- Perangkat:
- Versi OS:
- Versi browser:
- Jenis suara yang dipilih, lokal/online:
- Koneksi, Wi-Fi/seluler/offline:

## Chrome Desktop

| Skenario | Status | Catatan/Bukti |
|---|---|---|
| Initial page load | NOT TESTED | |
| Voice loading dan `voiceschanged` | NOT TESTED | |
| Play / Pause / Resume | NOT TESTED | |
| Skip Forward / Backward | NOT TESTED | |
| Stop / Restart | NOT TESTED | |
| Translation | NOT TESTED | |
| History | NOT TESTED | |
| Settings | NOT TESTED | |
| Screen rotation / resize | NOT TESTED | |
| Virtual keyboard | NOT TESTED | Tidak berlaku bila perangkat tanpa keyboard virtual |
| Background / foreground transition | NOT TESTED | |
| Screen lock behavior | NOT TESTED | Jangan mengharapkan playback universal |

## Firefox Desktop

| Skenario | Status | Catatan/Bukti |
|---|---|---|
| Initial page load | NOT TESTED | |
| Voice loading dan `voiceschanged` | NOT TESTED | |
| Play / Pause / Resume | NOT TESTED | |
| Skip Forward / Backward | NOT TESTED | |
| Stop / Restart | NOT TESTED | |
| Translation | NOT TESTED | |
| History | NOT TESTED | |
| Settings | NOT TESTED | |
| Screen rotation / resize | NOT TESTED | |
| Virtual keyboard | NOT TESTED | Tidak berlaku bila perangkat tanpa keyboard virtual |
| Background / foreground transition | NOT TESTED | |
| Screen lock behavior | NOT TESTED | Wake Lock mungkin NOT SUPPORTED, playback diuji terpisah |

## Safari Desktop

| Skenario | Status | Catatan/Bukti |
|---|---|---|
| Initial page load | NOT TESTED | |
| Voice loading dan `voiceschanged` | NOT TESTED | |
| Play / Pause / Resume | NOT TESTED | |
| Skip Forward / Backward | NOT TESTED | |
| Stop / Restart | NOT TESTED | |
| Translation | NOT TESTED | |
| History | NOT TESTED | |
| Settings | NOT TESTED | |
| Screen rotation / resize | NOT TESTED | |
| Virtual keyboard | NOT TESTED | Tidak berlaku bila perangkat tanpa keyboard virtual |
| Background / foreground transition | NOT TESTED | |
| Screen lock behavior | NOT TESTED | |

## Chrome Android

| Skenario | Status | Catatan/Bukti |
|---|---|---|
| Initial page load | NOT TESTED | Uji portrait dan landscape |
| Voice loading dan `voiceschanged` | NOT TESTED | Uji cold load dan reload |
| Play / Pause / Resume | NOT TESTED | |
| Skip Forward / Backward | NOT TESTED | Periksa tidak ada double execution |
| Stop / Restart | NOT TESTED | |
| Translation | NOT TESTED | Uji jaringan lambat dan pembatalan |
| History | NOT TESTED | |
| Settings | NOT TESTED | Uji select, range, dan panel bawah |
| Screen rotation | NOT TESTED | Saat idle, playing, dan panel terbuka |
| Virtual keyboard | NOT TESTED | Pastikan textarea dan kontrol tidak tertutup |
| Background / foreground transition | NOT TESTED | Catat apakah speech berhenti/dilanjutkan sistem |
| Screen lock behavior | NOT TESTED | Jangan diklaim sebagai background playback |

## Samsung Internet

| Skenario | Status | Catatan/Bukti |
|---|---|---|
| Initial page load | NOT TESTED | Uji portrait dan landscape |
| Voice loading dan `voiceschanged` | NOT TESTED | Uji cold load dan reload |
| Play / Pause / Resume | NOT TESTED | |
| Skip Forward / Backward | NOT TESTED | Periksa tidak ada double execution |
| Stop / Restart | NOT TESTED | |
| Translation | NOT TESTED | Uji jaringan lambat dan pembatalan |
| History | NOT TESTED | |
| Settings | NOT TESTED | Uji select, range, dan panel bawah |
| Screen rotation | NOT TESTED | Saat idle, playing, dan panel terbuka |
| Virtual keyboard | NOT TESTED | Pastikan textarea dan kontrol tidak tertutup |
| Background / foreground transition | NOT TESTED | |
| Screen lock behavior | NOT TESTED | Catat dukungan Screen Wake Lock versi browser |

## Safari iPhone

| Skenario | Status | Catatan/Bukti |
|---|---|---|
| Initial page load | NOT TESTED | Uji portrait dan landscape, termasuk notch/safe area |
| Voice loading dan `voiceschanged` | NOT TESTED | Uji cold load dan reload |
| Play / Pause / Resume | NOT TESTED | |
| Skip Forward / Backward | NOT TESTED | Periksa tidak ada double execution |
| Stop / Restart | NOT TESTED | |
| Translation | NOT TESTED | Uji pembatalan saat request berjalan |
| History | NOT TESTED | |
| Settings | NOT TESTED | Uji native select dan panel dengan keyboard |
| Screen rotation | NOT TESTED | Saat idle, playing, dan panel terbuka |
| Virtual keyboard | NOT TESTED | Uji visual viewport dan textarea fokus |
| Background / foreground transition | NOT TESTED | iOS dapat menangguhkan halaman/speech |
| Screen lock behavior | NOT TESTED | Jangan mengharapkan background playback |

## Chrome iPhone

Chrome iOS menggunakan engine WebKit tetapi tetap harus diuji terpisah dari Safari iOS karena lifecycle aplikasi dan UI browser dapat berbeda.

| Skenario | Status | Catatan/Bukti |
|---|---|---|
| Initial page load | NOT TESTED | Uji portrait dan landscape, termasuk safe area |
| Voice loading dan `voiceschanged` | NOT TESTED | Uji cold load dan reload |
| Play / Pause / Resume | NOT TESTED | |
| Skip Forward / Backward | NOT TESTED | Periksa tidak ada double execution |
| Stop / Restart | NOT TESTED | |
| Translation | NOT TESTED | Uji pembatalan saat request berjalan |
| History | NOT TESTED | |
| Settings | NOT TESTED | Uji native select dan panel dengan keyboard |
| Screen rotation | NOT TESTED | Saat idle, playing, dan panel terbuka |
| Virtual keyboard | NOT TESTED | Uji visual viewport dan textarea fokus |
| Background / foreground transition | NOT TESTED | Catat perbedaan dari Safari iOS |
| Screen lock behavior | NOT TESTED | Jangan mengharapkan background playback |

## Skenario Tambahan Wake Lock

| Skenario | Status | Catatan/Bukti |
|---|---|---|
| Browser tanpa `navigator.wakeLock` tetap dapat memutar speech | NOT TESTED | |
| Request Wake Lock ditolak tanpa menghentikan playback | NOT TESTED | |
| Lock dilepas saat halaman hidden | NOT TESTED | |
| Lock diminta kembali saat visible dan playback masih berjalan | NOT TESTED | |
| Tidak ada request ganda saat tap berulang | NOT TESTED | |
| Stop saat request masih pending tidak menghasilkan lock terlambat | NOT TESTED | |

## Format Laporan FAIL

- Browser/perangkat:
- Versi OS/browser:
- Skenario:
- Langkah reproduksi:
- Hasil yang diharapkan:
- Hasil aktual:
- Konsol/error:
- Voice lokal/online:
- Kondisi tab, layar, dan koneksi:
