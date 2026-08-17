---
title: Perbedaan dengan upstream
description: MailRiz NXT adalah fork — halaman ini mencantumkan apa yang ditambahkannya dan apa yang berubah relatif terhadap MailRiz asli.
---

MailRiz NXT adalah fork dari [MailRiz](https://github.com/rizkirmdhnnn/mailriz)
asli, dibangun di atas tumpukan Cloudflare yang sama. Sebagian besar dokumentasi
ini menggambarkan keduanya dengan setia; halaman ini berisi daftar apa yang NXT
tambahkan atau ubah.

## Fitur baru: Notifikasi Telegram

Tambahan utamanya: **setiap email masuk bisa mendorong notifikasi ke chat
Telegram** — pengirim, subjek, snippet, dan tautan kembali ke pesan. Lihat
[Notifikasi Telegram](/mailriz-nxt/id/guides/telegram-notifications/).

- Token bot adalah Worker **secret** yang di-deploy oleh CLI
- Chat id, aktif/nonaktif, dan opsi body lengkap ada di halaman **Settings**
  dashboard
- Setiap alias bisa **di-mute satu per satu** dengan lonceng di sidebar

## Paket CLI

CLI diterbitkan sebagai **`mailriz-cli-nxt`** alih-alih `mailriz-cli` (nama
upstream milik penerbit aslinya). Pasang dan jalankan dengan cara yang sama:

```bash
bunx mailriz-cli-nxt@latest setup
bunx mailriz-cli-nxt@latest reconfigure
```

Hal lain tentang CLI tidak berubah — perintah yang sama,
`~/.mailriz/config.json` yang sama, wizard yang sama.

## Sumber rilis

CLI mengunduh bundle Worker dari **GitHub Releases fork ini**
(`noobzhax/mailriz-nxt`), bukan dari repositori upstream. Itulah yang membuat
`setup` atau `reconfigure` di sini men-deploy Worker fork — termasuk fitur
Telegram dan migrasi databasenya. Rilis upstream tidak memuatnya.

## Dokumentasi

Situs ini di-deploy dari fork ke `noobzhax.github.io/mailriz-nxt`. Situs
dokumentasi upstream terpisah dan tidak mencakup fitur Telegram atau nama paket
ini.

## Yang sama

Segala hal lain dibagi dengan upstream: alias catch-all, folder, label, search,
model penyimpanan email mentah (data Anda di R2 dan D1 Anda sendiri),
autentikasi Cloudflare Access / session-password, perintah `update` dan
`destroy`, serta batas platform.
