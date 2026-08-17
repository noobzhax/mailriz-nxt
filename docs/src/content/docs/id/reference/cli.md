---
title: Referensi CLI
description: Setiap perintah mailriz-cli, apa yang diubahnya, dan apa yang dibiarkannya.
---

```sh
bunx mailriz-cli-nxt@latest <command>
```

Menjalankannya tanpa perintah akan memulai `setup`. Perintah yang tidak
dikenali mencetak daftarnya alih-alih galat polos.

## `setup`

Men-deploy semuanya: D1, R2, Worker, custom domain, Email Routing, dan secara
opsional Cloudflare Access. Interaktif.

**Menolak berjalan ketika `~/.mailriz/config.json` sudah ada.** Setup
menyediakan dari awal lalu menulis ulang file itu secara menyeluruh, jadi run
kedua terhadap zone atau hostname yang berbeda akan membuat Worker, custom
domain, dan aplikasi Access instalasi pertama terdampar dengan tidak ada
apa-apa di disk yang menunjuk ke sana. Untuk mengubah sesuatu, gunakan
[`reconfigure`](#reconfigure); untuk memulai dari nol, [`destroy`](#destroy)
lebih dulu.

Ia juga menolak ketika file ada tapi tidak bisa diurai, alih-alih menimpa
catatan instalasi yang mungkin masih berjalan.

Menulis `~/.mailriz/config.json` (mode `600`).

## `status`

Mencetak instalasi dan mengujinya:

```
dashboard    https://inbox.yourdomain.com
inbox        anything@yourdomain.com
admin        you@example.com
auth         Cloudflare Access
worker       mailriz
d1           f4ccc0ee
api token    not saved
installed    16/08/2026, 09:12
✔ health     responding
```

Hanya-baca. Tidak pernah mencetak nilai token, hanya apakah ada yang
tersimpan.

## `update`

Memindahkan Worker ke rilis terbaru. Menerapkan migrasi lebih dulu, lalu
men-deploy ulang, lalu memperbaiki domain alias. **Data D1 dan R2 tidak
disentuh.**

Menolak berjalan pada instalasi mode access tanpa audience tag yang tercatat,
karena men-deploy ulang akan mengunci dashboard. Jalankan `reconfigure`
sebagai gantinya. Lihat [Memperbarui](/mailriz-nxt/id/operations/updating/).

## `reconfigure`

Mengubah instalasi yang ada tanpa menyediakannya ulang. Gunakan untuk beralih
antara Cloudflare Access dan auth password, mengubah email admin, memperbaiki
aplikasi Access yang hilang atau tidak cocok, atau memasang catch-all kembali
setelah diedit di dashboard.

Memakai ulang akun, zone, database, dan bucket yang tercatat — **data D1 dan
R2 tidak disentuh**, dan zone serta hostname bersifat tetap. Mengubah salah
satunya berarti `destroy` lalu `setup`.

Kalau aplikasi Access sudah menjaga hostname, ia dipakai ulang alih-alih
diduplikasi. Ketika email admin berubah, policy yang ada dibiarkan saja dan
perintah menyebutkannya: perbarui di Zero Trust → Access → Applications.

## `destroy`

Menghapus semua yang dibuat MailRiz, dalam urutan yang tidak pernah
meninggalkan email menunjuk ke sesuatu yang sudah hilang: aturan catch-all,
custom domain dan record DNS-nya, Worker, aplikasi Access, setiap objek di
tiga bucket R2 lalu bucket-bucketnya, dan akhirnya database D1.

Sebelum meminta konfirmasi ia membaca akun dan menampilkan apa yang sebenarnya
ada, termasuk berapa objek yang dipegang setiap bucket. Setelahnya ia membaca
akun kembali dan menolak menyebut pembongkaran bersih kalau ada yang
bertahan — dan dalam kasus itu menyimpan `~/.mailriz/config.json`, jadi
sisa-sisanya tetap bisa ditemukan dan perintahnya bisa dijalankan lagi.

Mengharuskan mengetik hostname dashboard untuk konfirmasi. Lihat
[Menghapus MailRiz](/mailriz-nxt/id/operations/destroying/).

## `help`

Juga `--help`, `-h`. Mencetak daftar perintah.

## Autentikasi

`update`, `reconfigure` dan `destroy` butuh API token. Mereka mengambilnya,
secara berurutan, dari:

1. yang Anda ketik di prompt,
2. token yang disimpan saat setup, kalau Anda memilihnya,
3. `$CLOUDFLARE_API_TOKEN`.

Menekan Enter memakai fallback pertama yang tersedia; prompt menyebutkan yang
mana. Entri yang terlalu pendek ditolak bahkan ketika ada fallback — salah
ketik seharusnya tidak diam-diam men-deploy dengan token yang berbeda dari
yang sedang Anda ketik.

## Tempat state berada

`~/.mailriz/config.json`, mode `600`: id akun dan zone, nama worker, hostname,
nama database dan bucket, mode auth, dan API token hanya kalau Anda memilih
menyimpannya.

Ia juga mencatat apakah setup yang mengaktifkan Email Routing di zone, yang
memungkinkan `destroy` memutuskan apakah record MX zone itu milik MailRiz
untuk dihapus.

Menghapus file itu tidak memengaruhi deployment, tapi membuat CLI lupa di
mana deployment berada — dan karena `setup` sekarang menolak berjalan di atas
instalasi yang ada, itu meninggalkan Worker, database, dan bucket tanpa apa
pun yang menunjuk ke sana. Simpan file itu, atau hapus deployment-nya dengan
`destroy` lebih dulu.
