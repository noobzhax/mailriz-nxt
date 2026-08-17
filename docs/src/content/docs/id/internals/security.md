---
title: Keamanan
description: Apa yang dianggap MailRiz sebagai ancaman, dan apa yang dilakukannya terhadap hal itu.
---

Email adalah konten yang dikendalikan penyerang yang Anda minta untuk
ditampilkan. Desainnya mengasumsikan setiap pesan bersifat bermusuhan.

## Menampilkan pesan tidak bisa menjalankannya

Body disimpan **sebagaimana dikirim** — CSS, tabel, dan layoutnya utuh, karena
merusaknya itulah yang membuat email client self-hosted terasa tidak enak
dipakai. Keamanan datang dari membatasi apa yang boleh dilakukan halaman,
bukan dari menulis ulang isinya.

Setiap body disajikan di bawah:

```
Content-Security-Policy:
  default-src 'none';
  style-src 'unsafe-inline';
  img-src 'self' data:;      ← diperlebar hanya saat Anda menampilkan gambar
  font-src data:;
  sandbox
```

- **`sandbox`** memberi dokumen origin unik dan menonaktifkan scripting. Ia
  berlaku bahkan jika URL dibuka langsung di tab, bukan hanya di dalam frame.
- Reading pane membingkainya dengan **atribut `sandbox` kosong**, sehingga
  pesan tidak pernah berbagi origin dengan dashboard.
- **`img-src`** itulah yang menahan gambar jarak jauh. Pemblokiran adalah
  urusan header, persis itulah yang membuat markup bisa dibiarkan apa adanya.

Konten aktif yang mencolok juga dibuang saat ingest — blok `<script>`, handler
`on*` polos, dan URL `javascript:`/`vbscript:` — yang tidak mengorbankan
fidelitas karena tidak ada satu pun yang memengaruhi tampilan pesan.

**Anggap itu sebagai perapian, bukan pertahanan.** Itu regex di atas HTML, dan
HTML punya lebih banyak cara menulis event handler daripada yang bisa
didaftarkan sebuah regex: `/` menggantikan spasi sebelum `onerror`, skema
terenkode entity, tab di dalam `javascript:`, `srcdoc`,
`<meta http-equiv=refresh>`. Semua itu lolos darinya.

CSP di atas itulah yang benar-benar menghentikan script berjalan, dan ia tidak
bergantung pada stripper yang bekerja menyeluruh. Versi halaman ini sebelumnya
mengklaim stripper tetap menahan jika CSP salah konfigurasi; itu keliru, dan
mengatakannya lebih penting daripada bunyi kalimatnya.

## Lampiran

Selalu disajikan dengan `Content-Disposition: attachment` dan
`X-Content-Type-Options: nosniff`. Tidak ada yang terbuka di tempat.

Gambar tertanam di-inline sebagai URI `data:` saat body disajikan, dibatasi
per file dan total. **SVG dikecualikan** — ia bisa membawa script, dan
meng-inline-nya akan memberinya origin dokumen.

## Backpressure spam

Alamat tak dikenal yang gagal melewati guard catch-all ditolak dengan
`setReject()` di tingkat SMTP, sehingga tidak pernah sampai ke penyimpanan.
Budget harian untuk alias yang dibuat otomatis berarti spammer yang menebak
alamat tidak bisa mencetak baris tanpa batas, dan budget itu hanya menghitung
yang dibuat otomatis — alias yang Anda buat manual tidak pernah memakainya.

Di atas batas, pengirim mendapat kegagalan *sementara* dan mencoba lagi,
jadi pesan asli yang terjebak dalam ledakan kiriman orang lain tertunda,
bukan hilang.

## Secrets

- Password session hanya disimpan sebagai hash PBKDF2 bersalted — teks
  polosnya tidak pernah meninggalkan mesin Anda. Ia dan cookie signing key
  adalah Worker **secrets**, jadi tidak ada yang muncul di pengaturan
  teks-biasa Worker.
- Keduanya adalah nilai terpisah dengan sengaja. Menandatangani cookie dengan
  hash password, seperti yang dilakukan rilis sebelumnya, berarti membaca
  hash-nya saja sudah cukup untuk membuat session.
- API token Cloudflare **tidak** disimpan kecuali Anda memilihnya saat setup;
  jika disimpan, ia masuk ke `~/.mailriz/config.json` dengan mode `600`.
- `mailriz-cli status` melaporkan apakah ada token di disk, tidak pernah
  nilainya.

## Yang tidak dilindungi

- **Siapa pun yang memegang akun Cloudflare Anda** bisa membaca kotak masuk
  langsung lewat D1 dan R2. MailRiz melindungi dashboard, bukan login
  Cloudflare Anda — perlakukan keamanan akun itu sebagai perimeter yang
  sebenarnya.
- **Email dalam perjalanan** tunduk pada apa pun yang dinegosiasikan pengirim.
  MailRiz menerima apa yang Cloudflare terima.
- **JWT Access diverifikasi tanda tangannya** oleh Worker terhadap JWKS team
  domain, plus audience, issuer, dan expiry. Lihat
  [Autentikasi](/mailriz-nxt/id/internals/auth/#access-jwt-verification).
