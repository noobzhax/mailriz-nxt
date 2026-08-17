---
title: Notifikasi Telegram
description: Dapatkan pesan Telegram begitu email tiba — dengan tautan langsung ke pesannya.
---

Ketika email baru mendarat, MailRiz bisa mengirim notifikasi ke chat Telegram:
pengirim, subjek, snippet pendek, dan tautan yang membuka pesan di dashboard.
Opsional, body teks polos lengkap ikut serta (dibatasi 4096 karakter, batas
pesan Telegram).

## Yang Anda perlukan

- Bot Telegram — buat satu dengan **@BotFather** dan simpan token yang
  diberikannya
- Chat id dari chat tempat bot harus menulis (lihat di bawah)
- Notifikasi Telegram di-deploy di instalasi Anda (satu perintah, di bawah)

## Deploy token bot

Token bot adalah Worker secret, jadi ia dimasukkan lewat CLI:

```bash
bunx mailriz-cli-nxt@latest reconfigure
```

Ketika wizard meminta **Telegram bot token**, tempelkan (atau biarkan kosong
untuk melewatinya). Token juga bisa ditambahkan atau diganti belakangan dengan
perintah yang sama — prompt yang dilewati akan menghapus token yang pernah
di-deploy.

## Temukan chat id Anda

Chat id baru ada setelah Anda mengirim pesan ke bot: buka chat dengan bot Anda
di Telegram dan kirimkan apa saja (sebuah `/start` juga berfungsi). Lalu minta
**@userinfobot** memberi tahu id chat itu — ia membalas dengan angka, positif
untuk chat pribadi, negatif untuk grup.

## Nyalakan

Buka **Settings → Telegram** di dashboard:

1. Tempel chat id dan tekan **Save**
2. Nyalakan **Receive new-mail notifications**
3. Tekan **Send test message** — pesan tes akan muncul di chat segera

Kalau tes gagal, halaman settings menampilkan teks error Telegram sendiri — dua
penyebab umumnya adalah salah ketik chat id, atau bot tidak bisa mengirim pesan
ke chat itu (grup perlu bot ditambahkan sebagai anggota dulu).

## Penyesuaian

- **Include full message body** — menambahkan body teks polos ke setiap
  notifikasi, jadi ringkasannya bisa dibaca tanpa membuka dashboard
- **Per-alias mute** — lonceng di samping alias di sidebar dashboard
  mem-bisukan alias itu saja. Berguna untuk newsletter berisik: bisukan alias
  newsletter-nya, biarkan yang lain tetap nyaring

## Seperti apa notifikasinya

```
📬 Jane Doe <jane@example.com>
alias: newsletter@yourdomain.com
Subject: Hello from Jane
This is the snippet text…
🔗 https://inbox.yourdomain.com/inbox/01ABC…
```

## Catatan

- Notifikasi bersifat best-effort: kalau Telegram tidak terjangkau, pengiriman
  email tidak terpengaruh dan pesan hanya tidak terkirim.
- Tanpa bot token yang di-deploy, halaman settings memberi peringatan dan tidak
  ada yang terkirim — tidak ada setengah-konfigurasi yang senyap.
- Chat id disimpan di database D1 Anda; token bot hanya pernah hidup sebagai
  Worker secret.
