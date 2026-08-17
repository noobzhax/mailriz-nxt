---
title: Bagaimana sebuah pesan tiba
description: Dari Cloudflare Email Routing sampai satu baris di kotak masuk Anda, langkah demi langkah.
---

Apa yang terjadi antara seseorang menekan send dan pesan muncul di dashboard
Anda.

## 1. Email Routing menerimanya

Catatan MX domain Anda menunjuk ke Cloudflare. Setup mengaktifkan Email
Routing dan mengarahkan aksi **catch-all** ke Worker `mailriz`, sehingga setiap
alamat di domain mencapai handler yang sama.

Catch-all bukan aturan routing biasa — ia punya endpoint sendiri dan
diperbarui, bukan dibuat.

## 2. Worker menyelesaikan alias

Penerima dipecah menjadi local part dan domain. `+tag` dipisahkan lebih dulu,
jadi `news+netflix@` diselesaikan menjadi alias `news`.

Kemudian, secara berurutan:

1. **Alias ada dan aktif** → terima.
2. **Alias ada tapi nonaktif** → tolak. Catch-all tidak menghidupkan kembali
   alamat yang Anda matikan.
3. **Tidak ada alias** → buat satu, asalkan domain itu milik Anda, local part
   valid, dan budget harian untuk alias yang dibuat otomatis belum habis.

Penolakan terjadi dengan `setReject()`, di tingkat SMTP. Pengirim mendapat
bounce dan tidak ada yang disimpan — spam yang menebak alamat tidak menghabiskan
penyimpanan Anda.

## 3. Pesan mentah disimpan lebih dulu

Sebelum apa pun di-parse, `.eml` lengkap masuk ke bucket R2 mentah. Jika
parsing gagal setelahnya, yang asli tetap ada — tidak ada yang hilang gara-gara
pesan yang rusak.

## 4. Parsing dan penyimpanan

Menggunakan `postal-mime`:

- **Lampiran** → bucket lampiran. Content-ID dicatat untuk masing-masing,
  itulah yang membuat gambar tertanam bisa diselesaikan nanti.
- **Body HTML** → konten aktif dibuang (`<script>`, handler `on*`, URL
  `javascript:`), lalu disimpan sebagaimana dikirim di bucket HTML. Presentasi
  tidak diutak-atik.
- **Gambar jarak jauh** dihitung pada titik ini, sehingga reading pane tahu
  apakah perlu menawarkan "show images" tanpa memeriksa body lagi.
- **Body teks dan snippet** → D1.

## 5. Baris, dan indeks

Satu baris di `emails`, dengan trigger database yang menjaga indeks FTS5 tetap
sinkron — sehingga pencarian tidak pernah butuh jalur tulis terpisah yang bisa
melenceng.

## 6. Anda melihatnya

Jika dashboard terbuka, koneksi SSE menyadarinya dalam sekitar empat detik dan
daftar dimuat ulang. Lihat
[Live updates](/mailriz-nxt/id/guides/organising/#mail-arrives-on-its-own).

## Batas ukuran

Cloudflare Email Routing menerima pesan hingga **25 MB**. Yang lebih besar
ditolak sebelum sampai ke Worker; batas itu milik Cloudflare, bukan MailRiz.

Di **Workers Free**, budget CPU 10 ms per request bisa terlampaui saat
mem-parse pesan HTML besar, yang membuat pengiriman masuk gagal secara
intermiten. Inilah alasan utama Workers Paid direkomendasikan.
