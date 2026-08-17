---
title: Alias
description: Bagaimana alamat-alamat tercipta — catch-all, dibuat manual, subaddressing, dan mematikan salah satunya.
---

Sebuah alias adalah satu alamat di domain Anda. Anda tidak pernah perlu membuatnya
sebelum menggunakannya.

## Catch-all: tinggal ciptakan alamatnya

Alamat apa pun di mail domain Anda diterima, dan aliasnya muncul di dashboard
begitu pesan pertama tiba. Ketik `netflix@yourdomain.com` di formulir pendaftaran
dan alamat itu sudah ada saat email tiba.

Alias yang dibuat otomatis ditandai **auto** di sidebar, jadi alamat yang tidak
Anda kenali bisa dijelaskan, bukan misterius.

### Penjaganya

Email Routing menyerahkan setiap alamat yang mau ditebak spammer ke Worker, jadi
jalur penerimaannya dibatasi:

| Penjaga | Perilaku |
|---|---|
| Domain | hanya mail domain Anda; apa pun selain itu ditolak mentah-mentah |
| Local part | harus berupa alias yang valid (`[a-z0-9._-]`, hingga 64 karakter) |
| Volume | 50 alamat baru per hari berjalan |
| Alias nonaktif | tetap ditolak — catch-all tidak akan menghidupkannya lagi |

Anggaran harian hanya menghitung **alias yang dibuat otomatis**, jadi yang Anda
buat manual tidak pernah menghabiskannya. Setelah melewati batas, pengirim
mendapat kegagalan *sementara* dan mencoba lagi, alih-alih bounce yang
menghilangkan pesan sungguhan yang tertangkap dalam serbuan kiriman orang lain.

## Membuatnya manual

**New Alias** di sidebar, kalau Anda ingin alamatnya sudah ada sebelum pesan
pertama tiba — misalnya saat mencetaknya di suatu tempat, atau memilih ejaan
yang persis.

- **Random** — awalan plus empat karakter heksadesimal, mis. `news-4f2a`.
- **Custom** — Anda yang memilih local part-nya.

Saat dibuat, alamatnya disalin ke clipboard Anda.

## Subaddressing

`news+netflix@yourdomain.com` dikirimkan ke alias `news`. `+tag` adalah label
untuk penyaringan Anda sendiri; ia tidak membuat alias kedua.

## Mematikan salah satunya

Nonaktifkan alias kalau ia mulai menerima spam. Email untuknya lalu ditolak di
level SMTP, sebelum apa pun disimpan — pengirim mendapat bounce dan Anda tidak
membayar biaya penyimpanan.

Penonaktifan bersifat permanen: catch-all tidak akan diam-diam membuat ulang
alamat yang Anda matikan.

Pesan yang sudah ada tetap di kotak surat Anda; penonaktifan menghentikan
kedatangan baru, bukan menghapus riwayat.

## Di mana alias berada

Alias milik **mail domain** Anda — apex zone, mis. `yourdomain.com` — bukan
hostname dashboard (`inbox.yourdomain.com`). Catch-all Email Routing terikat ke
apex, jadi itulah domain yang bisa menerima.
