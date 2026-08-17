---
title: Konfigurasi Worker
description: Setiap variable yang dibaca Worker, dan apa yang berubah saat Anda mengubahnya.
---

Diatur oleh `mailriz-cli setup` dan `update`. Anda bisa mengeditnya di dashboard
Cloudflare di bawah pengaturan Worker; deploy ulang lewat CLI akan mengatur
ulang ke apa yang dikatakan config-nya, jadi utamakan mengubah hal-hal lewat
CLI kalau ada perintahnya.

## Identitas dan perutean

| Variable | Arti |
|---|---|
| `ADMIN_EMAIL` | satu-satunya alamat yang diizinkan membaca kotak masuk |
| `MAIL_DOMAIN` | zone apex tempat email tiba — **tempat alias berada** |
| `DASHBOARD_HOSTNAME` | tempat dashboard disajikan |

`MAIL_DOMAIN` dan `DASHBOARD_HOSTNAME` memang sengaja merupakan dua nilai yang
berbeda. Alias milik domain email; host dashboard tidak menerima email. Kalau
`MAIL_DOMAIN` tidak disetel, catch-all menolak semuanya alih-alih menerima
semua email — nilai yang hilang tidak boleh berarti "terima apa saja".

## Autentikasi

| Variable | Arti |
|---|---|
| `AUTH_MODE` | `access` atau `session` |
| `ACCESS_TEAM_DOMAIN` | team domain Zero Trust Anda |
| `ACCESS_AUD` | audience tag aplikasi Access |

Dalam mode access, Worker menolak setiap permintaan selama `ACCESS_AUD`
kosong, jadi ia harus disetel sebelum deploy yang memakainya — itulah mengapa
setup membuat aplikasi Access lebih dulu.

### Secret session

Keduanya adalah **secret**, bukan variable — keduanya disetel dengan
`wrangler secret bulk` dan tidak muncul di pengaturan teks biasa Worker.

| Secret | Arti |
|---|---|
| `SESSION_PASSWORD_HASH` | `pbkdf2:<iterations>:<salt>:<hash>` dari password dashboard |
| `SESSION_SIGNING_KEY` | 32 byte acak; kunci HMAC untuk cookie session |

Keduanya wajib dalam mode session. Kalau salah satunya hilang, atau hash-nya
tidak dalam format itu, Worker menjawab 500 untuk setiap permintaan alih-alih
jatuh ke sesuatu yang lebih lemah. Lihat
[Autentikasi](/mailriz-nxt/id/internals/auth/).

### Secret Telegram

| Secret | Arti |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token bot dari `@BotFather`, dipakai mengirim notifikasi email baru |

Juga secret, disetel oleh `mailriz-cli setup`, `update` dan `reconfigure`
lewat `wrangler secret bulk` — tidak pernah variable biasa. Nilai **kosong**
adalah sinyal "mati": melewati prompt di wizard menghapus token yang di-deploy
sebelumnya. Tanpa itu dashboard tetap menampilkan pengaturannya, tapi tidak
ada yang pernah terkirim. Lihat
[Notifikasi Telegram](/mailriz-nxt/id/guides/telegram-notifications/).

### Binding untuk auth

| Binding | Tujuan |
|---|---|
| `LOGIN_LIMITER` | membatasi laju `POST /api/login` (5 per menit per IP) |

Tanpa binding itu, login tetap berfungsi tapi tidak dibatasi lajunya, dan
Worker mencatat peringatan sekali.

## Retensi

| Variable | Bawaan | Arti |
|---|---|---|
| `TRASH_RETENTION_DAYS` | `30` | berapa lama email di tempat sampah bertahan dari pembersihan harian |

Hanya email di tempat sampah yang dibersihkan. Email di kotak masuk dan yang
diarsipkan disimpan sampai Anda menghapusnya.

## Pembaruan langsung

| Variable | Bawaan | Arti |
|---|---|---|
| `UPDATES_POLL_MS` | `4000` | seberapa sering stream terbuka memeriksa email baru |
| `UPDATES_PING_MS` | `20000` | interval keep-alive |
| `UPDATES_CONNECTION_MS` | `180000` | berapa lama koneksi hidup sebelum menyambung ulang |

Tidak seperti variable-variable di atas, tiga ini **tidak ditulis oleh CLI**.
Worker jatuh ke nilai bawaan kalau ketiganya tidak ada, jadi mereka hanya ada
kalau Anda menambahkannya sendiri di dashboard Cloudflare.

`UPDATES_POLL_MS` adalah tuasnya kalau pembaruan langsung terus terputus di
**Workers Free**: setiap poll di dalam koneksi mengambil dari anggaran CPU
10 ms yang sama, jadi interval yang lebih panjang berarti lebih sedikit poll
per koneksi. Menaikkannya juga menaikkan penundaan sebelum email baru muncul.

Menurunkan `UPDATES_CONNECTION_MS` membuat lebih sering menyambung ulang, yang
lebih sering mengatur ulang anggaran dengan mengorbankan lebih banyak request.

## Binding

| Binding | Resource |
|---|---|
| `DB` | database D1 `mailriz` |
| `RAW_BUCKET` | `.eml` asli |
| `ATTACHMENTS_BUCKET` | lampiran |
| `HTML_BUCKET` | badan HTML tersanitasi |
| `ASSETS` | berkas statis dashboard |

## Perutean aset

Konfigurasi Wrangler yang dibuat menetapkan dua opsi yang penting:

- `not_found_handling: "single-page-application"` — jadi memuat ulang rute
  sisi klien menyajikan aplikasi alih-alih 404.
- `run_worker_first: ["/api/*"]` — jadi fallback itu tidak akan pernah
  menjawab panggilan API. Tanpa itu, request navigasi ke path API (misalnya
  iframe yang memuat badan pesan) menerima kerangka dashboard sebagai
  gantinya.
