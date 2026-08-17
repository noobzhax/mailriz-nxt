---
title: Autentikasi
description: Cloudflare Access atau password — cara kerja keduanya, dan mana yang Anda dapatkan.
---

MailRiz bersifat single-user. Tepat satu alamat, `ADMIN_EMAIL`, yang boleh
membaca kotak masuk.

## Dua mode

Mode mana yang Anda dapatkan diputuskan saat setup, berdasarkan apakah API
token Anda bisa membuat aplikasi Cloudflare Access.

### Cloudflare Access (`AUTH_MODE=access`)

Cloudflare menantang pengunjung di edge, sebelum request apa pun sampai ke
Worker. Anda masuk dengan identity provider apa pun yang dipakai organisasi
Zero Trust Anda; Worker kemudian memvalidasi audience tag pada token yang
dihasilkan.

Setup membuat aplikasi Access **sebelum** men-deploy Worker, karena audience
tag yang dihasilkannya adalah sebuah variabel Worker — men-deploy lebih dulu
akan membuat `ACCESS_AUD` kosong, dan Worker dengan audience kosong menolak
setiap request.

Sign out membawa Anda ke `/cdn-cgi/access/logout`; session itu milik
Cloudflare, bukan MailRiz.

### Session password (`AUTH_MODE=session`)

Sebuah password yang Anda tentukan saat setup. Worker tidak pernah melihatnya —
hanya hash-nya, dan sebuah key terpisah yang dipakainya untuk menandatangani
session cookie:

```
email.signature.expiry     HttpOnly, Secure, SameSite=Lax, 30 hari
```

Keduanya adalah Worker **secrets**, bukan variabel, jadi tidak ada yang muncul
di pengaturan teks-biasa dashboard Cloudflare.

**Password** disimpan sebagai PBKDF2-HMAC-SHA256 dengan salt acak:

```
pbkdf2:100000:<salt>:<hash>
```

Work factor hidup di dalam nilai itu sendiri, jadi bisa dinaikkan belakangan
tanpa membuat password yang sudah tersimpan jadi tidak valid.

**Cookie ditandatangani dengan `SESSION_SIGNING_KEY`** — 32 byte acak, HMAC
-SHA256, dibuat saat setup dan tidak berhubungan dengan password. Pemisahan
itulah intinya: rilis sebelumnya menandatangani dengan hash password itu
sendiri, yang berarti siapa pun yang bisa membaca nilai itu bisa membuat
session tanpa pernah tahu password-nya. Merotasi signing key mengakhiri semua
session; mengubah password, dengan sendirinya, tidak.

Perbandingan tanda tangan dilakukan dalam constant-time.

`Secure` hanya dihilangkan ketika request berasal dari `localhost`, karena
cookie Secure tidak pernah dikirim lewat `http://` dan pengembangan lokal
disajikan tanpa TLS.

Sign out mengakhiri masa berlaku cookie.

**Login diberi rate limit** — beberapa percobaan per menit per IP, lewat
binding rate-limiting Cloudflare. Penebakan online berubah dari secepat Worker
menjawab menjadi sesuatu yang bisa dikalahkan oleh password.

**`ADMIN_EMAIL` ditegakkan di kedua jalur.** Cookie hanya diterima untuk
alamat itu, meski login adalah satu-satunya yang menerbitkannya — tanda tangan
yang valid untuk alamat orang lain ditolak dengan 403.

**Kredensial yang hilang atau tidak bisa dibaca ditolak mentah-mentah.** Jika
salah satu secret kosong, atau hash tersimpan bukan dalam format di atas,
Worker menjawab 500 untuk setiap request termasuk login — alih-alih mundur ke
key yang diketahui semua orang. Deployment dari sebelum skema ini membawa
SHA-256 polos dan berakhir tepat di sini; `mailriz-cli update` akan meminta
password sekali lagi dan memperbaikinya.

## Mana yang akan Anda dapatkan

Setup memeriksa Zero Trust segera setelah Anda memilih akun. Jika token tidak
bisa membuat aplikasi Access, ia akan menyatakannya **sebelum men-deploy apa
pun** dan menawarkan autentikasi password. Anda tidak akan pernah ditinggalkan
dengan instalasi setengah jadi yang tidak bisa dibuka siapa pun.

Untuk memakai Access, tambahkan **Account → Access: Apps and Policies → Edit**
ke token Anda dan jalankan `mailriz-cli reconfigure`. Ia mengalihkan instalasi
yang ada tanpa menyentuh database atau bucket.

## API

Setiap rute `/api/*` berada di balik guard yang sama, dengan dua pengecualian
yang disengaja: `login` dan `logout`. Keduanya berada di luarnya — login belum
punya cookie, dan logout harus tetap berfungsi ketika cookie sudah basi.

`/healthz` tidak memerlukan autentikasi by design; setup wizard dan uptime
checks memakainya, dan ia tidak mengungkap apa pun selain liveness.

## Verifikasi JWT Access

Worker memverifikasi **tanda tangan** JWT Access terhadap public keys (JWKS)
team domain, diambil dari `https://<team-domain>/cdn-cgi/access/certs` dan
di-cache. Ia juga memeriksa audience, issuer, expiry, dan klaim email.

Ini berarti token palsu ditolak oleh Worker itu sendiri, bahkan jika aplikasi
Access dihapus atau salah konfigurasi — pemeriksaan Worker tidak bergantung
pada edge challenge.

Verifikasi tanda tangan dilakukan dengan [`jose`](https://github.com/panva/jose),
library yang direkomendasikan Cloudflare. JWKS diambil secara lazy dan
di-cache berdasarkan key ID. Ketika token tiba ditandatangani dengan key yang
tidak ada di cache, key set diambil ulang — dengan cooldown singkat, sehingga
rotasi terdeteksi dengan sendirinya tanpa redeploy.

Algoritma dikunci ke RS256, yang memang dipakai Access untuk menandatangani.

Jika `ACCESS_TEAM_DOMAIN` kosong, tidak ada key set untuk diverifikasi, dan
setiap request ditolak. `mailriz-cli status` menyatakannya secara eksplisit,
karena dashboard yang menjawab 401 untuk semuanya tidak memberi petunjuk apa
pun.
