---
title: Arsitektur
description: Bagian-bagian penyusun MailRiz, dan mengapa jumlahnya hanya sedikit.
---

Satu Worker, satu database, tiga bucket. Itulah keseluruhan sistemnya.

```
Internet mail ──► Cloudflare Email Routing (MX/SPF dikelola untuk Anda)
                        │  catch-all → Worker "mailriz"
                        ▼
              ┌─────────────────────┐
              │  Cloudflare Worker  │  email()  — email masuk
              │  (Hono API + React) │  /api/*   — API dashboard
              └─────┬─────────┬─────┘  /*       — dashboard itu sendiri
                    │         │
            D1 (SQLite)   R2 (raw .eml, lampiran, HTML tersanitasi)
            Pencarian FTS5
```

## Mengapa satu Worker mengerjakan semuanya

Script yang sama punya tiga pekerjaan:

- **`email()`** — handler yang dipanggil Email Routing untuk setiap pesan masuk.
- **`/api/*`** — aplikasi Hono di balik autentikasi.
- **sisanya** — dashboard React, disajikan sebagai static assets.

Memisahkannya berarti lebih banyak deploy, lebih banyak konfigurasi, dan
kredensial bersama di antara keduanya. Satu Worker dengan tiga entry point
menjaga deploy tetap satu kesatuan — itulah yang membuat `mailriz-cli update`
hanya satu langkah.

Static assets dikonfigurasi dengan `not_found_handling: single-page-application`
agar rute sisi klien tetap hidup setelah reload, dan `run_worker_first: ["/api/*"]`
agar fallback tidak pernah menelan panggilan API.

## Mengapa D1 dan R2, bukan salah satunya saja

- **D1** menyimpan apa yang Anda cari dan urutkan: pengirim, subjek, snippet,
  flag, timestamp — plus indeks FTS5 yang disinkronkan oleh trigger.
- **R2** menyimpan yang berukuran besar: `.eml` mentah, lampiran, dan body HTML.

Body pesan akan cepat membengkakkan database 500 MB dan tidak pernah di-query,
hanya diambil berdasarkan key. Menyimpannya di R2 membuat D1 tetap kecil dan
cepat, dan R2 tidak mengenakan biaya egress.
[Storage](/mailriz-nxt/id/internals/storage/) menjelaskan detailnya.

## Tempat state berada

| State | Tempat |
|---|---|
| Pesan, alias, label | D1 |
| Body, lampiran, email mentah | R2 |
| Migrasi mana yang sudah dijalankan | D1 (`schema_migrations`) |
| Identifiers deployment Anda | `~/.mailriz/config.json` di mesin Anda |
| Session | cookie, atau Cloudflare Access |

Tidak ada yang disimpan di memori Worker antar request, karena tidak ada
jaminan dua request sampai di instance yang sama. Fakta tunggal itulah yang
membentuk desain live-updates: Worker yang membuka stream bukan yang menerima
email Anda, jadi kedatangan ditemukan dengan mem-polling database, bukan
didorong lewat memori.

## Pekerjaan terjadwal

Trigger cron berjalan setiap hari dan memurnikan email di trash yang lebih tua
dari retention window (30 hari secara bawaan).
