---
title: Menghapus MailRiz
description: Merobohkan deployment — apa yang dihapus, apa yang diverifikasi, dan apa yang bertahan.
---

```sh
mailriz-cli destroy
```

:::danger
Ini menghapus permanen setiap pesan tersimpan, termasuk salinan mentah di R2.
Tidak ada undo, dan tidak ada backup yang diambil.
:::

## Sebelum melakukan apa pun

`destroy` memverifikasi API token, lalu membaca akun Cloudflare Anda dan
menampilkan apa yang **sebenarnya ada** — bukan apa yang diklaim
`~/.mailriz/config.json` pernah dibuat. Keduanya menyimpang setiap kali ada
yang dihapus dengan tangan atau pembongkaran sebelumnya berhenti di tengah
jalan:

```
This will permanently delete

worker         mailriz
dns            inbox.yourdomain.com — custom domain and its record
d1             f4ccc0ee — every stored email
r2             mailriz-raw — 1,284 objects
r2             mailriz-attachments — 96 objects
r2             mailriz-html — 1000+ objects
access         application 8f21ab3c
state          ~/.mailriz/config.json

R2 data will be erased. Every raw message, attachment and HTML
body is deleted from the buckets before the buckets themselves go.
That is the complete archive — nothing is exported first.
```

Apa pun yang sudah hilang ditampilkan sebagai demikian alih-alih dihitung
sebagai penghapusan.

Lalu ia meminta Anda **mengetik hostname dashboard**. Bukan ya/tidak — prompt
konfirmasi kedua bisa diabaikan karena refleks, dan yang satu ini tidak.

## Yang dihapusnya

Dalam urutan ini, dan urutannya penting:

1. **Aturan catch-all**, lebih dulu. Begitu Worker hilang, catch-all yang
   masih menunjuk ke sana menelan setiap pesan yang diterima domain — lubang
   hitam yang dari luar terlihat seperti email yang berfungsi.
2. **Custom domain**, yang memiliki record DNS untuk
   `inbox.yourdomain.com`. Ia resource terpisah dari Worker, jadi menghapus
   script tidak dijamin ikut membawanya.
3. **Script Worker.**
4. **Aplikasi Cloudflare Access**, kalau ada yang menjaga hostname. Ditemukan
   lewat audience tag-nya, atau lewat hostname pada instalasi dari sebelum
   application id dicatat.
5. **Setiap objek di tiga bucket R2, lalu bucket-bucketnya.** Cloudflare
   menolak menghapus bucket yang masih menyimpan objek, jadi mengosongkannya
   bukan pilihan — itu satu-satunya cara bucket benar-benar hilang.
6. **Database D1.**

### Email Routing

Apakah Email Routing itu sendiri dimatikan bergantung pada siapa yang
menyalakannya:

- **Setup yang menyalakannya** — ia dimatikan, dan Cloudflare menghapus record
  MX, SPF dan DKIM yang ditambahkannya ke domain root Anda.
- **Sudah menyala sebelumnya** — ia tetap menyala. Hanya catch-all yang
  dilepas, karena record-record itu mungkin membawa email yang tidak ada
  hubungannya dengan MailRiz.
- **Tidak diketahui** — instalasi dari sebelum ini dicatat akan ditanya
  langsung, dengan bawaan membiarkan routing tetap menyala.

## Ia memeriksa pekerjaannya sendiri

Setelah penghapusan, `destroy` membaca akun kembali dan membandingkan. Kalau
ada yang bertahan, ia menyebutkannya dengan nama dan **menyimpan
`~/.mailriz/config.json`**:

```
✘ Teardown incomplete — nothing was assumed deleted.

· r2 bucket mailriz-raw: The bucket you tried to delete is not empty
· still present: bucket mailriz-raw
```

Menyimpan file itu memang disengaja. Ia satu-satunya catatan tentang Worker,
database, dan bucket mana yang milik instalasi ini — menghapusnya selagi masih
ada sisa akan membuat sisa-sisa itu tak bisa ditemukan. Perbaiki penyebabnya,
biasanya token yang kehilangan scope atau sudah dicabut, lalu jalankan
`destroy` lagi.

Suatu run hanya melaporkan sukses ketika akun kembali bersih.

## Yang bertahan dengan sengaja

- **Edge certificate** untuk hostname dashboard. Cloudflare tidak menghapusnya
  bersama custom domain, dan scope API yang diminta MailRiz tidak mencakup
  sertifikat. Hapus di **SSL/TLS → Edge Certificates** kalau ingin
  menghilangkannya; membiarkannya tidak mengorbankan apa pun selain kerapian.
- **Aturan Email Routing individual** yang Anda buat sendiri. Hanya catch-all
  yang dipasang MailRiz yang disentuh.

## Menyimpan email Anda dulu

Belum ada perintah ekspor. Untuk menyimpan pesan, unduh dulu sebelum
menghancurkan:

- `.eml` asli setiap pesan dari panel baca, atau
- bucket R2 secara langsung dengan `wrangler r2 object get`, atau dashboard
  Cloudflare.

Bucket mentah menyimpan setiap pesan persis seperti saat tiba, jadi ia arsip
yang lengkap — dan `destroy` mengosongkannya.

## Memulai dari nol

`destroy` lalu `setup` menghasilkan instalasi bersih. `setup` menolak berjalan
selama `~/.mailriz/config.json` ada, jadi pembongkaran total memang satu-satunya
jalan — dan karena destroy menghapus database D1 dan bucket-bucketnya alih-alih
membiarkannya dipakai ulang, ia benar-benar mulai kosong.

Kalau Anda hanya ingin mengubah mode auth, email admin, atau memperbaiki
aplikasi Access yang rusak, gunakan [`reconfigure`](/mailriz-nxt/id/reference/cli/#reconfigure)
sebagai gantinya. Ia tetap menyimpan email Anda.
