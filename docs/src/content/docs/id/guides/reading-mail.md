---
title: Membaca email
description: Pesan dirender sebagaimana dikirim — dan apa yang MailRiz tahan sampai Anda memintanya.
---

Pesan ditampilkan sebagaimana pengirim menulisnya: CSS mereka, tabel mereka,
layout mereka. Tidak ada yang dihilangkan demi tampilan.

![Email pernyataan di panel baca, dengan warna, tabel, dan tombol milik
pengirim yang utuh](../../../../assets/screenshots/reading-a-message.png)

## Gambar jarak jauh ditahan

Tracking pixel memberi tahu pengirim bahwa Anda membuka pesan, kapan, dan dari
kira-kira mana. Jadi gambar yang di-host di tempat lain tidak dimuat. Kalau
sebuah pesan merujuk salah satunya, muncul garis di atasnya:

![Newsletter dengan pemberitahuan gambar diblokir di atasnya; gambarnya tampil
sebagai bingkai kosong sampai diizinkan](../../../../assets/screenshots/blocked-images.png)

Menekannya memuat ulang pesan itu dengan gambar diizinkan. Pilihan itu berlaku
untuk pesan yang sedang Anda baca, bukan permanen untuk pengirimnya.

Tidak ada apa pun yang mencapai server pihak ketiga sebelum Anda menekannya.

## Gambar tertanam langsung berfungsi

Gambar yang melekat pada pesan itu sendiri — logo, tanda tangan — adalah bagian
dari pesan alih-alih panggilan ke server orang lain, jadi mereka langsung
dirender tanpa peringatan. Mereka tidak mengorbankan privasi.

Mereka juga tetap ada di daftar lampiran, jadi Anda bisa mengunduh file
aslinya.

**SVG adalah pengecualian**: ia bisa membawa script, jadi selalu diunduh dan
tidak pernah dirender inline.

Ada juga batas ukuran — kira-kira 1 MB per gambar dan 5 MB per pesan. Di atas
itu, gambar tetap sebagai unduhan alih-alih tertanam, yang membuat satu pesan
raksasa tidak mahal untuk dibuka.

## Lampiran

Terdaftar di bawah header pesan dengan nama file dan ukurannya. Memilih salah
satunya mengunduhnya — lampiran tidak pernah dibuka di tempat.

`.eml` asli juga bisa diunduh, dari ikon dokumen di toolbar pesan. Itu pesan
persis seperti saat tiba, lengkap dengan header, yang Anda perlukan untuk
meneruskan laporan atau memeriksa tanda tangan.

## Bagaimana ini dijaga aman

Body disajikan dalam frame bersandbox di bawah Content-Security-Policy ketat
yang menolak script sepenuhnya — jadi merender pesan sebagaimana dikirim bukan
berarti menjalankan apa pun yang dikandungnya.
[Keamanan](/mailriz-nxt/id/internals/security/) memuat detailnya.

## Pesan mempertahankan latar belakangnya sendiri

Dalam dark mode dashboard jadi gelap, tetapi body pesan tidak. HTML di dalamnya
milik pengirim dan ditulis untuk latar terang — mengubah warnanya akan merusak
kontras dengan cara yang tidak pernah mereka uji.

![Dashboard dalam dark mode, dengan body pesan tetap di latar terangnya
sendiri](../../../../assets/screenshots/dark-mode.jpg)

## Pesan teks biasa

Pesan tanpa bagian HTML dirender sebagai teks. Kalau sebuah pesan punya
keduanya, HTML yang ditampilkan — keduanya adalah dua render dari hal yang
sama, dan menampilkan keduanya akan mencetaknya dua kali.
