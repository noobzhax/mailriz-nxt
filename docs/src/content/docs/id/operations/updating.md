---
title: Memperbarui
description: Pindah ke rilis baru tanpa menyentuh email Anda.
---

```sh
mailriz-cli update
```

Mengganti Worker dengan rilis terbaru. **D1 dan R2 tidak disentuh** — setiap
pesan, alias, dan lampiran bertahan.

## Yang dilakukannya

| Tugas | |
|---|---|
| `release` | mengunduh bundle Worker terbaru dari GitHub Releases |
| `migrations` | menerapkan perubahan skema apa pun yang dibawa rilis |
| `worker` | men-deploy ulang, mempertahankan konfigurasi Anda yang ada |
| `aliases` | memperbaiki domain alias yang dibuat salah oleh build lama |
| `health` | mem-polling `/healthz` sampai dashboard menjawab |

Skema dulu, lalu kode yang bergantung padanya — rilis yang membawa kolom baru
kalau tidak akan men-deploy kode yang menanyakan kolom yang tidak ada.

## Token

Anda diminta API token kecuali Anda menyimpannya saat setup, dan dalam kasus
itu menekan Enter memakainya lagi. Kalau tidak, ekspor dulu:

```sh
export CLOUDFLARE_API_TOKEN=...
mailriz-cli update
```

Tidak ada tawaran untuk menyimpannya di sini — memang disengaja; keputusan itu
milik tempat token pertama kali diserahkan.

## Migrasi dijalankan sekali

Masing-masing dicatat di `schema_migrations`. Menjalankan `update` dua kali
beruntun aman — yang kedua melaporkan `migrations up to date`.

Kalau instalasi Anda mendahului tabel itu, `update` pertama mengadopsi migrasi
yang sudah diterapkan alih-alih gagal karena migrasi itu.

## Instalasi Access

Kalau deployment Anda memakai Cloudflare Access, `update` menolak berjalan
ketika tidak ada audience tag yang tercatat untuknya. Men-deploy ulang tanpa
itu akan membuat Worker menolak setiap permintaan dan mengunci Anda dari
dashboard. Jalankan `reconfigure` sebagai gantinya — ia membaca aplikasi Access
kembali, mencatat audience tag-nya, dan tetap menyimpan email Anda. Pesannya
menyebutkan hal itu.

## Memeriksa apa yang Anda miliki

```sh
mailriz-cli status
```

Menampilkan hostname dashboard, domain email, mode auth, nama Worker,
database, apakah ada token tersimpan, dan apakah `/healthz` menjawab.

## Mengembalikan perubahan

Tidak ada perintah downgrade. Rilis diberi tag di GitHub, jadi mem-pin CLI
yang lebih lama bisa dilakukan, tapi **migrasi tidak bisa di-roll back** —
skema yang lebih baru tetap ada. Anggap maju sebagai satu-satunya arah yang
didukung.
