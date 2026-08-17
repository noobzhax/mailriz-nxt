---
title: Notifikasi Telegram
description: Dapatkan pesan Telegram begitu email tiba — dengan tombol langsung ke pesannya, dan /refresh untuk memaksa dashboard memuat ulang.
---

Ketika email baru mendarat, MailRiz mengirim notifikasi ke **setiap chat
Telegram yang dikonfigurasi**: pengirim, subjek, snippet pendek, dan tombol
yang membuka pesan di dashboard. Opsional, body teks polos lengkap ikut
serta (dibatasi 4096 karakter, batas pesan Telegram).

## Yang Anda perlukan

- Bot Telegram — buat satu dengan **@BotFather** dan simpan token yang
  diberikannya
- Chat id dari chat-chat tempat bot harus menulis (lihat di bawah)
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
untuk chat pribadi, negatif untuk grup. Ulangi untuk setiap chat (chat
pribadi Anda, grup keluarga, channel kantor…) dan kumpulkan id-nya.

## Nyalakan

Buka **Settings → Telegram** di dashboard:

1. Tempel chat id, **dipisah koma** (mis. `123456789, -1001234567890`), lalu
   tekan **Save**
2. Nyalakan **Receive new-mail notifications**
3. Tekan **Send test message** — pesan tes akan muncul di setiap chat yang
   dikonfigurasi segera

Kalau tes gagal, halaman settings menampilkan teks error Telegram sendiri —
penyebab umumnya adalah salah ketik chat id, atau bot tidak bisa mengirim
pesan ke chat itu (grup perlu bot ditambahkan sebagai anggota dulu).

## Refresh inbox dari Telegram

Bot memahami satu perintah: **`/refresh`**. Kirim dari chat mana pun yang
dikonfigurasi dan tab dashboard yang terbuka langsung memuat ulang inbox-nya —
berguna saat Anda di ponsel dan desktop sedang menampilkan tampilan basi.

Untuk mengaktifkannya:

1. Di **Settings → Telegram**, tekan **Register webhook** (menu "/" bot lalu
   menampilkan perintahnya)
2. Kirim **`/refresh`** ke bot — ia membalas "🔄 Memeriksa inbox…" dan
   dashboard memuat ulang

Webhook berada di `https://{dashboard}/api/telegram/webhook`, diverifikasi
oleh secret token yang dibuat Worker saat registrasi pertama. Pada instalasi
dengan Cloudflare Access, `reconfigure` juga membuat aplikasi Access
path-scoped agar server Telegram bisa menjangkaunya tanpa sesi.

## Penyesuaian

- **Include full message body** — menambahkan body teks polos ke setiap
  notifikasi, jadi ringkasannya bisa dibaca tanpa membuka dashboard
- **Per-alias mute** — lonceng di samping alias di sidebar dashboard
  mem-bisukan alias itu saja. Berguna untuk newsletter berisik: bisukan alias
  newsletter-nya, biarkan yang lain tetap nyaring. Mute berlaku untuk semua
  chat sekaligus.
- **Bahasa** — Settings → Language memilih bahasa UI untuk dashboard
  *dan* pesan Telegram (label, tombol buka, balasan /refresh). Bahasa Inggris
  adalah baseline saat ini; Bahasa Indonesia menyusul kemudian.

## Seperti apa notifikasinya

```
📬 Jane Doe <jane@example.com>
alias: newsletter@yourdomain.com
Subject: Hello from Jane
🕐 2026-08-17 10:20 UTC
──────────────────
This is the snippet text…

[ Buka di Dashboard ]   ← tombol, membuka pesannya
```

Pesan memakai format HTML Telegram; apa pun yang ditulis pengirim di-escape,
jadi `<script>` di subjek tidak akan pernah tampil sebagai markup. Waktu
kedatangan memakai UTC agar semua chat menampilkan momen yang sama.

## Catatan

- Notifikasi bersifat best-effort: kalau Telegram tidak terjangkau, pengiriman
  email tidak terpengaruh dan pesan hanya tidak terkirim. Satu chat yang gagal
  tidak pernah menghalangi yang lain.
- Tanpa bot token yang di-deploy, halaman settings memberi peringatan dan tidak
  ada yang terkirim — tidak ada setengah-konfigurasi yang senyap.
- Chat id dan secret webhook disimpan di database D1 Anda; token bot hanya
  pernah hidup sebagai Worker secret.
- Aksi cepat (tombol tandai-dibaca / arsipkan) sengaja di luar lingkup untuk
  sekarang.