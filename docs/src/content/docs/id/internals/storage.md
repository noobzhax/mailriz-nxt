---
title: Storage
description: Apa yang hidup di D1, apa yang hidup di R2, dan mengapa pemisahannya jatuh di tempat itu.
---

## Pemisahannya

**D1** menyimpan yang Anda query. **R2** menyimpan yang Anda ambil berdasarkan
key.

Body pesan tidak pernah dicari oleh database — teks untuk pencarian diekstrak
saat ingest dan disimpan terpisah — dan ukurannya besar. Menyimpannya di R2
menjaga D1 cukup kecil untuk tetap cepat di dalam free tier 500 MB, dan R2
tidak mengenakan biaya apa pun untuk egress.

## Tabel D1

| Tabel | Menyimpan |
|---|---|
| `aliases` | local part, domain, label, note, enabled, `is_auto` |
| `emails` | pengirim, subjek, snippet, flag, timestamp, key R2, `blocked_images` |
| `attachments` | nama file, content type, ukuran, key R2, `content_id` |
| `labels`, `email_labels` | label dan penugasannya |
| `emails_fts` | indeks FTS5, disinkronkan trigger |
| `schema_migrations` | migrasi mana yang sudah diterapkan |

`emails` menyimpan `body_text` untuk pencarian dan pratinjau, tapi body yang
dirender hidup di R2.

### Indeks yang penting

- `(alias_id, received_at DESC)` — email satu alias
- `(is_trashed, is_archived, received_at DESC)` — kotak masuk, dan query yang
  di-polling oleh stream live-update
- `(is_trashed, trashed_at)` — sapuan retensi

## Bucket R2

| Bucket | Isi |
|---|---|
| `mailriz-raw` | `.eml` asli lengkap |
| `mailriz-attachments` | setiap lampiran sebagaimana diterima |
| `mailriz-html` | body HTML, konten aktif dibuang |

Key berbentuk `<alias-id>/<email-id>…`, jadi semua milik satu pesan berbagi
prefix.

### Mengapa menyimpan `.eml` mentah

Ia adalah sumber kebenaran. Parsing itu lossy dan perilaku parser berubah;
yang asli memungkinkan Anda menurunkan ulang apa pun nanti, meneruskan pesan
dengan utuh, atau memverifikasi tanda tangan. Ia bisa diunduh per pesan dari
reading pane.

## Retensi

Cron harian memurnikan email di trash yang lebih tua dari
`TRASH_RETENTION_DAYS` (30 secara bawaan). Tidak ada lagi yang dihapus
otomatis — email terarsip dan di kotak masuk disimpan sampai Anda
menghapusnya.

## Migrasi

Diterapkan oleh CLI pada `setup` dan `update`, dan dicatat di
`schema_migrations` sehingga masing-masing dijalankan sekali. Instalasi yang
dibuat sebelum tabel itu ada diadopsi otomatis: migrasi yang gagal karena
perubahannya sudah ada dicatat, bukan diperlakukan sebagai error.

Itu penting karena SQLite tidak punya `ADD COLUMN IF NOT EXISTS` —
memutar ulang `ALTER` gagal dengan `duplicate column name`, persis itulah
yang dulu membuat `update` kedua pada deployment mana pun rusak.
