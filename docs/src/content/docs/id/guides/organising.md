---
title: Folder, search, dan pembaruan langsung
description: Berkeliling di kotak surat — kotak surat dan folder, search dengan prefix, dan email yang datang sendiri.
---

## Kotak surat dan folder itu terpisah

Sidebar memilih **kotak surat**: semua email, satu alias, atau satu label. Rail
di dalamnya memilih **folder**: Inbox, Starred, Archived, Trash.

Keduanya bisa digabungkan. Memilih `@news` lalu **Starred** menampilkan email
berstar milik alias itu — bukan milik semua orang. Breadcrumb menyebut
keduanya:

```
MailRiz / @news · Starred
```

![Kotak surat yang dibatasi ke satu alias: hanya email alias itu yang
ditampilkan, dan breadcrumb-nya berbunyi MailRiz / @bank · Inbox](../../../../assets/screenshots/alias-scope.jpg)

**All mail** di bagian atas sidebar kembali ke tampilan tanpa batasan.

## URL-nya mengikuti

Semua yang ada di layar tercermin di address bar, jadi muat ulang, bookmark,
dan tombol kembali semuanya mendarat di tempat Anda berada:

```
/inbox                      semua email, inbox
/starred                    semua email, starred
/alias/:aliasId/inbox       satu alias
/label/:labelId/trash       satu label
…/:emailId                  dengan pesan terbuka
?q=…                        search
```

Bookmark `/alias/<id>/inbox` untuk langsung membuka satu alamat.

## Search cocok dengan prefix

Mengetik `jan` menemukan `jane` — Anda tidak perlu melengkapi kata itu. Setiap
istilah harus cocok, masing-masing sebagai prefix, jadi `jan doe` mempersempit
alih-alih memperluas.

![Search "pine" mencocokkan dua pesan — satu pengirimnya Pine Press, satu lagi
hanya menyebutkannya di subjek](../../../../assets/screenshots/search.jpg)

Search berjalan atas subjek, pengirim, dan teks body, dan dibatasi ke kotak
surat dan folder yang sedang Anda buka.

Mengganti kotak surat menghapus search-nya. Mendarat di Trash yang tampak kosong
karena filter yang terbawa terbaca sebagai bug, jadi ia tidak ikut.

## Email datang sendiri

Email baru muncul di daftar tanpa refresh, biasanya dalam sekitar empat detik.
Tidak ada yang perlu diaktifkan.

Titik kecil di tombol refresh menunjukkan status koneksi itu:

| Titik | Arti |
|---|---|
| Hijau | terhubung — email baru akan muncul sendiri |
| Abu-abu | terputus — tekan refresh untuk memeriksa manual |

Sebentar berwarna abu-abu setiap beberapa menit itu wajar: koneksi sengaja
dibuat berumur pendek dan browser menyambung ulang. Abu-abu terus-menerus
berarti pembaruan langsung tidak berfungsi — lihat
[Pemecahan masalah](/mailriz-nxt/id/operations/troubleshooting/).

Email baru diurutkan ke paling atas, jadi muncul di sana. Kalau Anda sudah
menekan **Load more**, kedatangan baru mengembalikan daftar ke halaman pertama.

## Label

Berwarna-warni dan terdaftar di sidebar. Memilih salah satunya membatasi kotak
surat ke label itu, persis seperti memilih alias, dan rail folder tetap
berfungsi di dalamnya.
