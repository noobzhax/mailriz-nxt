---
title: Batas platform
description: Batas Cloudflare yang benar-benar membentuk perilaku MailRiz.
---

Ini milik Cloudflare, bukan MailRiz, tapi merekalah yang menentukan apa yang
bisa dijanjikan produk.

## Yang paling menentukan

**Workers Free memberi 10 ms CPU per request. Workers Paid memberi 30 detik.**

Waktu CPU tidak termasuk menunggu I/O, dan kebanyakan request memakai sangat
sedikit — tapi dua jalur di MailRiz menekannya:

- **Mengurai email masuk.** Pesan HTML besar bisa melebihi 10 ms, yang membuat
  pengiriman gagal *sesekali* — jenis kegagalan yang paling sulit didiagnosis,
  karena sebagian besar email tetap tiba.
- **Pembaruan langsung.** Setiap poll di dalam stream terbuka mengambil dari
  anggaran per-request yang sama, itulah mengapa koneksi sengaja berumur
  pendek dan mengapa `UPDATES_POLL_MS` ada.

**Workers Paid ($5/bln) disarankan** untuk kotak masuk yang Anda andalkan.

## Email masuk

| Batas | Nilai |
|---|---|
| Ukuran pesan maksimum | 25 MB |

Pesan yang lebih besar ditolak oleh Email Routing sebelum Worker melihatnya.

## Penyimpanan

| | Tingkat gratis |
|---|---|
| D1 | 500 MB per database, 5 GB per akun |
| R2 | 10 GB tersimpan, 1M operasi Class A, 10M operasi Class B, **tanpa biaya egress** |

Badan dan lampiran berada di R2, jadi D1 tetap kecil — ia menyimpan metadata,
teks untuk pencarian, dan indeks FTS. Kotak masuk pribadi akan mencapai batas
R2 jauh sebelum batas D1.

## Request

Request ke **aset statis gratis dan tanpa batas** dan tidak dihitung ke kuota
Workers — jadi menyajikan dashboard tidak membebani apa pun. Hanya request
yang memanggil script Worker yang dikenakan biaya, yang untuk MailRiz berarti
`/api/*` dan email masuk.

Perhatikan bahwa `run_worker_first: ["/api/*"]` berarti path API selalu
memanggil Worker, memang begitu desainnya.

## Durasi

Tidak ada **batas wall-clock** pada Worker yang dipicu HTTP selama klien tetap
terhubung — itulah yang membuat stream SSE berumur panjang mungkin ada.
Kendalanya adalah CPU, bukan waktu.

Trigger cron dibatasi 15 menit; pembersihan retensi harian jauh di bawah itu.

## Sumber

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
