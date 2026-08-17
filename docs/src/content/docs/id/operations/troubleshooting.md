---
title: Pemecahan masalah
description: Gejala yang terlihat di praktik, penyebabnya, dan yang harus dilakukan.
---

## Email memantul, tidak ada yang muncul

Pengirim mendapat `Address not found`.

**Pertama, periksa apakah alamatnya di domain yang tepat.** Alias berada di
**domain email** Anda — zone apex, `yourdomain.com` — bukan hostname dashboard
`inbox.yourdomain.com`. Catch-all Email Routing terikat ke apex.

Kalau dashboard menampilkan alamat yang berakhiran `inbox.…`, instalasi itu
mendahului perbaikan. Jalankan `mailriz-cli update`: ia memindahkannya dan
melaporkan berapa banyak.

Lalu periksa, secara berurutan:

1. **Record MX** — `dig +short MX yourdomain.com` seharusnya mengembalikan
   `route1/2/3.mx.cloudflare.net`.
2. **Email Routing aktif** dan aksi catch-all-nya adalah Worker `mailriz` —
   Email → Email Routing → Routing Rules di dashboard.
3. **Alias tidak dinonaktifkan.** Alias yang dinonaktifkan sengaja ditolak dan
   catch-all tidak akan membuatnya lagi.
4. **Anggaran harian.** Setelah 50 alamat yang dibuat otomatis dalam 24 jam,
   alamat baru mendapat kegagalan sementara. Pengirim akan mencoba lagi; itu
   bersih dengan sendirinya.

## Dashboard tidak mau terbuka

- **Dalam mode access**, audience tag yang kosong membuat Worker menolak setiap
  permintaan. `mailriz-cli status` menampilkan mode auth; kalau `access` dan
  instalasi tidak punya aud yang tercatat, jalankan `mailriz-cli reconfigure`.
  Ia menemukan aplikasi Access yang sudah ada alih-alih membuat yang kedua di
  hostname yang sama.
- **Dalam mode session**, 401 seharusnya menampilkan layar login. Kalau tidak,
  Worker mungkin tidak menjawab sama sekali — periksa `/healthz`.

## `update` gagal dengan `duplicate column name`

CLI lama memutar ulang setiap migrasi di setiap run. Perbarui CLI-nya sendiri:

```sh
bunx mailriz-cli-nxt@latest update
```

Versi yang lebih baru mencatat migrasi yang telah diterapkan dan mengadopsi
yang sudah ada.

## Email baru tidak muncul dengan sendirinya

Titik pada tombol refresh berwarna abu-abu.

Momen abu-abu singkat setiap beberapa menit adalah hal normal — koneksi
memang berumur pendek oleh desain dan browser menyambung kembali. Abu-abu
yang menetap berarti stream tidak bertahan.

Di **Workers Free**, anggaran CPU 10 ms per request adalah penyebab umumnya:
setiap poll di dalam koneksi mengambil dari anggaran yang sama. Naikkan
interval poll untuk memakainya lebih sedikit:

```
UPDATES_POLL_MS = 8000
```

Setel sebagai variable Worker dan deploy ulang. Refresh tetap berfungsi
selama itu.

## Gambar dalam pesan rusak

- **Gambar tertanam dalam pesan lama** tetap rusak. Content-ID dicatat saat
  ingest, jadi pesan yang diterima sebelum itu rilis tidak punya apa-apa untuk
  diselesaikan. Email yang tiba setelah pembaruan tampil normal; berkasnya
  tetap bisa diunduh dari daftar lampiran.
- **SVG tidak pernah dirender inline.** Ia bisa membawa script, jadi selalu
  jadi unduhan.
- **Gambar jarak jauh** butuh prompt *Show images* — itu memang disengaja.

## Setup gagal memasang custom domain

Cloudflare menolak memasang Custom Domain di atas record DNS yang sudah ada.
Hapus record yang ada untuk hostname dashboard, lalu jalankan ulang setup.

## Email masuk gagal secara terputus-putus

Pesan HTML besar bisa melewati batas CPU 10 ms di **Workers Free** saat
diurai. Workers Paid menaikkannya menjadi 30 detik dan merupakan perbaikan
yang disarankan.

## Membaca log

```sh
npx wrangler tail --name mailriz
```

Menampilkan output Worker langsung, termasuk email handler.
