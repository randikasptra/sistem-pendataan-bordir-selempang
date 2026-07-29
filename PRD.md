# PRD — Sistem Distribusi PO Bordir

> Dokumen ini menjadi sumber kebutuhan utama untuk implementasi oleh Claude Code.  
> Implementasikan secara bertahap sesuai urutan fase. Jangan menambahkan fitur di luar scope tanpa persetujuan.

## 1. Ringkasan Produk

Bangun aplikasi internal untuk menyalurkan Purchase Order (PO) dari pihak internal kepada beberapa vendor bordir.

Masalah saat ini:

- Detail order, gambar referensi, logo, jumlah pcs, dan deadline menumpuk di WhatsApp.
- Vendor sulit mengetahui urutan PO yang masuk.
- Progres produksi tidak tercatat secara kuantitatif.
- Perubahan dan revisi gambar mudah tertukar.
- Tidak ada proses approval formal setelah vendor menyatakan pekerjaan selesai.

Aplikasi harus menjadi sumber data resmi. WhatsApp hanya digunakan untuk membagikan ringkasan, deep link PO, foto opsional, dan komunikasi tambahan.

## 2. Tujuan

- Memusatkan seluruh PO, item, gambar, logo, catatan, deadline, dan progres.
- Menyalurkan satu PO kepada satu vendor.
- Mendukung banyak item/desain dalam satu PO.
- Menampilkan progres per pcs, misalnya `8/15 pcs`.
- Memungkinkan admin mencoret gambar, menambahkan teks, dan menumpuk logo baru.
- Memisahkan status vendor mengajukan selesai dengan approval final.
- Menyimpan riwayat perubahan dan aktivitas penting.
- Dapat digunakan dengan nyaman melalui desktop maupun HP sebagai PWA.

## 3. Di Luar Scope

Jangan implementasikan:

- Customer atau halaman untuk customer.
- Registrasi publik.
- Harga, biaya, invoice, pembayaran, utang, atau laporan keuangan.
- Marketplace vendor.
- Chat real-time pengganti WhatsApp.
- Logistik atau pelacakan pengiriman fisik.
- Editor desain profesional setara CorelDRAW/Illustrator.

## 4. Stack Wajib

- Next.js versi stabil terbaru dengan App Router.
- TypeScript strict mode.
- Tailwind CSS.
- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Supabase Row Level Security.
- Fabric.js untuk editor gambar.
- Zod untuk validasi.
- PWA dengan manifest dan service worker terkontrol.
- Deployment ditargetkan ke Vercel.

Gunakan Server Components secara default. Gunakan Client Components hanya untuk interaksi yang membutuhkannya, termasuk Fabric.js.

## 5. Role dan Hak Akses

### 5.1 Owner

- Akses penuh ke seluruh PO dan vendor.
- Membuat, mengubah, menonaktifkan user.
- Membuat dan mengubah vendor.
- Membuat, mengirim, mengedit, membatalkan, dan membuka kembali PO.
- Approve hasil atau meminta revisi.
- Melihat seluruh riwayat aktivitas.

### 5.2 Admin

- Membuat dan mengirim PO.
- Mengedit PO dan gambar.
- Melihat seluruh vendor dan pekerjaan.
- Approve atau meminta revisi.
- Dapat mengelola user jika permission tersebut diberikan.

### 5.3 Vendor

- Satu vendor dapat mempunyai beberapa akun pegawai.
- Akun vendor wajib terhubung ke `vendor_id`.
- Hanya dapat melihat PO milik `vendor_id` sendiri.
- Mengonfirmasi PO masuk.
- Mengubah progres per item.
- Menambahkan catatan.
- Mengunggah foto hasil secara opsional.
- Mengajukan pekerjaan selesai.
- Tidak dapat mengedit detail utama PO atau desain utama.

### 5.4 Aturan akun

- Tidak ada tombol sign-up.
- Semua akun dibuat oleh owner/admin.
- Akun dapat dinonaktifkan tanpa menghapus riwayat.
- Owner dan admin tidak wajib mempunyai `vendor_id`.

## 6. Struktur PO

- Satu PO hanya boleh ditujukan ke satu vendor.
- Satu PO dapat mempunyai banyak item.
- Satu item mewakili satu desain/spesifikasi selempang.
- Variasi desain berbeda harus dibuat sebagai item berbeda.
- Setiap item mempunyai jumlah pcs dan progres pcs sendiri.

### 6.1 Format nomor PO

Gunakan:

```text
PO-YYYY-MM-DD-NNN
```

Contoh:

```text
PO-2026-07-29-001
PO-2026-07-29-002
```

`NNN` adalah urutan PO pada tanggal tersebut dan kembali ke `001` setiap hari. Pembuatan nomor harus atomic dan tidak boleh menghasilkan duplikasi.

Tampilan ramah pengguna:

```text
PO 29 Juli 2026 — #001
```

## 7. Deadline dan Progres

### 7.1 Deadline

- PO mempunyai `po_deadline`.
- Setiap item mempunyai `item_deadline`.
- Ketika item dibuat, deadline item mengikuti deadline PO secara default.
- Admin boleh mengganti deadline item.
- Jika deadline PO tidak ditentukan manual, gunakan deadline item paling akhir.
- Perubahan deadline setelah vendor menerima PO dianggap perubahan material.

### 7.2 Progres

Setiap item mempunyai:

```text
quantity
completed_quantity
```

Aturan:

- `quantity >= 1`.
- `completed_quantity >= 0`.
- `completed_quantity <= quantity`.
- Progres item = `completed_quantity / quantity * 100`.
- Progres PO = total seluruh `completed_quantity` / total seluruh `quantity`.
- Hitung nilai progres dari data aktual; jangan simpan persentase sebagai sumber kebenaran.

## 8. Status PO

Gunakan enum berikut:

```text
DRAFT
SENT
ACCEPTED
IN_PROGRESS
RECONFIRMATION_REQUIRED
WAITING_APPROVAL
REVISION
COMPLETED
CANCELLED
```

### 8.1 Transisi

```text
DRAFT -> SENT
SENT -> ACCEPTED
ACCEPTED -> IN_PROGRESS
IN_PROGRESS -> WAITING_APPROVAL
WAITING_APPROVAL -> COMPLETED
WAITING_APPROVAL -> REVISION
REVISION -> IN_PROGRESS
IN_PROGRESS/ACCEPTED -> RECONFIRMATION_REQUIRED
RECONFIRMATION_REQUIRED -> IN_PROGRESS
```

Owner/admin dapat membatalkan PO aktif menjadi `CANCELLED` dengan alasan wajib.

### 8.2 Aturan status

- Vendor menekan `Ajukan Selesai`; status menjadi `WAITING_APPROVAL`, bukan `COMPLETED`.
- Secara default, pengajuan selesai hanya tersedia jika semua item mencapai jumlah pcs penuh.
- Owner/admin dapat override progres yang belum penuh, tetapi alasan wajib dicatat.
- `COMPLETED` membutuhkan `approved_by` dan `approved_at`.
- `REVISION` membutuhkan catatan revisi.
- PO selesai hanya dapat dibuka kembali oleh owner dengan alasan.
- PO dibatalkan tetap tersimpan dalam riwayat.

## 9. Alur Utama

### 9.1 Membuat dan mengirim PO

1. Owner/admin membuka halaman Buat PO.
2. Pilih tepat satu vendor.
3. Isi deadline utama dan catatan umum.
4. Tambahkan satu atau lebih item.
5. Isi judul item, jumlah pcs, deadline item, spesifikasi, dan catatan.
6. Upload gambar referensi dan logo.
7. Edit gambar jika diperlukan.
8. Tampilkan preview/ringkasan sebelum dikirim.
9. Saat dikirim, buat nomor PO unik dan ubah status menjadi `SENT`.
10. Buat notifikasi untuk seluruh user aktif pada vendor tujuan.
11. Sediakan tombol berbagi ringkasan/deep link melalui WhatsApp.

### 9.2 Vendor mengerjakan PO

1. Vendor melihat PO baru berdasarkan waktu masuk.
2. Vendor membuka detail dan mengonfirmasi penerimaan.
3. Status berubah menjadi `ACCEPTED`.
4. Saat pekerjaan dimulai/progres diperbarui, status menjadi `IN_PROGRESS`.
5. Vendor mengubah `completed_quantity` per item.
6. Vendor dapat memberi catatan dan upload foto hasil opsional.
7. Vendor menekan `Ajukan Selesai`.

### 9.3 Approval

1. Owner/admin melihat antrean `WAITING_APPROVAL`.
2. Periksa progres, catatan, dan foto hasil jika tersedia.
3. Pilih `Approve` untuk mengubah status menjadi `COMPLETED`.
4. Pilih `Minta Revisi` untuk mengubah status menjadi `REVISION`.
5. Catatan revisi wajib.
6. Catatan revisi dapat menyertakan gambar hasil anotasi.

### 9.4 Edit PO setelah diterima

1. Admin mengubah data dan mengisi alasan perubahan.
2. Naikkan `version_number`.
3. Simpan ringkasan before/after untuk perubahan material.
4. Ubah status menjadi `RECONFIRMATION_REQUIRED`.
5. Beri tahu user vendor mengenai bagian yang berubah.
6. Vendor wajib mengonfirmasi versi baru.

Perubahan material meliputi:

- Vendor tujuan.
- Penambahan/penghapusan item.
- Jumlah pcs.
- Deadline.
- Spesifikasi.
- Gambar/desain final.

Vendor tujuan tidak boleh diubah setelah PO diterima. Jika salah vendor, batalkan PO dan buat PO baru.

## 10. Editor Gambar

Gunakan Fabric.js.

### 10.1 Fitur minimum

- Upload gambar referensi sebagai background.
- Freehand brush.
- Pilihan warna dan ketebalan brush.
- Teks.
- Garis dan panah.
- Kotak dan lingkaran.
- Tanda silang.
- Upload gambar/logo tambahan sebagai layer.
- Drag, resize, rotate, duplicate, reorder, dan delete layer.
- Undo dan redo.
- Zoom dan reset view.
- Preview sebelum simpan.
- Export ke WebP atau PNG.
- Buka dan edit kembali dari JSON canvas.

### 10.2 File yang disimpan

Untuk setiap desain, simpan terpisah:

1. Gambar asli.
2. Aset overlay/logo.
3. Fabric canvas JSON.
4. Preview final WebP/PNG.

Gambar asli bersifat immutable dan tidak boleh ditimpa.

### 10.3 Aturan editor

- Editor utama hanya dapat digunakan owner/admin.
- Vendor melihat preview final dan file yang diizinkan.
- Editor yang sama dapat digunakan untuk memberi anotasi revisi pada foto hasil vendor.
- Muat Fabric.js dengan dynamic import.
- Batasi resolusi canvas untuk mencegah penggunaan memori berlebihan di HP.
- Kompres preview sebelum upload.

## 11. Foto Hasil

- Upload foto hasil oleh vendor bersifat opsional.
- Vendor tetap dapat mengajukan selesai tanpa foto.
- Jika foto diunggah, owner/admin dapat melihat dan memberi anotasi revisi.
- Batasi file awal maksimal 5 MB.
- Format: JPEG, PNG, dan WebP.

## 12. WhatsApp

Jangan membuat integrasi yang membaca chat WhatsApp.

Sediakan:

- `Salin Ringkasan PO`.
- `Bagikan ke WhatsApp`.
- `Salin Link PO`.

Contoh ringkasan:

```text
PO baru: PO-2026-07-29-001
Vendor: Gradmine
Total: 15 pcs
Deadline: 4 Agustus 2026
Detail: https://domain-aplikasi/po/{id}
```

Gunakan deep link yang setelah login mengarahkan pengguna ke detail PO.

## 13. Notifikasi

### 13.1 In-app notification

Buat notifikasi ketika:

- PO baru dikirim.
- Vendor menerima PO.
- PO diperbarui dan membutuhkan konfirmasi ulang.
- Deadline H-1.
- Deadline terlewati.
- Vendor mengajukan selesai.
- Admin meminta revisi.
- Admin melakukan approval.

Notifikasi harus mempunyai status sudah/belum dibaca dan link ke entitas terkait.

### 13.2 Push notification

Push notification PWA dapat dikerjakan setelah in-app notification stabil.

Aturan:

- Harus meminta permission.
- Aplikasi tetap berfungsi jika permission ditolak.
- Jangan mengirim notifikasi berulang yang mengganggu.
- Deadline cukup H-1 dan saat terlewati.

## 14. Halaman

### Semua role

- `/login`
- `/forgot-password`
- `/profile`
- `/notifications`

### Owner/Admin

- `/dashboard`
- `/po`
- `/po/new`
- `/po/[id]`
- `/po/[id]/edit`
- `/po/[id]/history`
- `/approvals`
- `/vendors`
- `/vendors/[id]`
- `/users`
- `/settings`

### Vendor

- `/vendor/dashboard`
- `/vendor/po`
- `/vendor/po/[id]`
- `/vendor/history`

Gunakan middleware/server-side authorization. Menyembunyikan menu saja tidak cukup.

## 15. Dashboard

### Owner/Admin

Tampilkan:

- Jumlah PO aktif.
- Total pcs belum selesai.
- Jumlah PO menunggu approval.
- Jumlah PO/item terlambat.
- PO dan pcs selesai pada periode terpilih.
- Deadline terdekat.
- Aktivitas terbaru.
- Beban aktif per vendor.

### Vendor

Tampilkan:

- PO baru.
- PO aktif.
- Total pcs belum selesai.
- Deadline terdekat.
- PO revisi.
- PO menunggu approval.

## 16. Database Konseptual

Nama tabel boleh disesuaikan jika ada alasan teknis kuat, tetapi relasi dan aturan bisnis tidak boleh hilang.

### `profiles`

```text
id uuid PK -> auth.users.id
full_name text
role enum(owner, admin, vendor)
vendor_id uuid nullable FK vendors.id
can_manage_users boolean default false
is_active boolean default true
created_at timestamptz
updated_at timestamptz
```

### `vendors`

```text
id uuid PK
code text unique
name text
whatsapp text nullable
notes text nullable
is_active boolean default true
created_at timestamptz
updated_at timestamptz
```

### `purchase_orders`

```text
id uuid PK
po_number text unique
vendor_id uuid FK vendors.id
status po_status
po_deadline timestamptz
version_number integer default 1
notes text nullable
created_by uuid FK profiles.id
approved_by uuid nullable FK profiles.id
approved_at timestamptz nullable
cancelled_by uuid nullable FK profiles.id
cancelled_at timestamptz nullable
cancellation_reason text nullable
created_at timestamptz
updated_at timestamptz
```

### `po_items`

```text
id uuid PK
po_id uuid FK purchase_orders.id
title text
quantity integer
completed_quantity integer default 0
item_deadline timestamptz
specifications jsonb
notes text nullable
sort_order integer
created_at timestamptz
updated_at timestamptz
```

### `attachments`

```text
id uuid PK
po_id uuid FK purchase_orders.id
item_id uuid nullable FK po_items.id
type enum(reference, overlay, preview, vendor_result, revision_annotation)
storage_path text
mime_type text
original_name text
size_bytes bigint
uploaded_by uuid FK profiles.id
created_at timestamptz
```

### `design_versions`

```text
id uuid PK
item_id uuid FK po_items.id
version integer
canvas_json jsonb
preview_attachment_id uuid FK attachments.id
created_by uuid FK profiles.id
created_at timestamptz
```

### `approval_requests`

```text
id uuid PK
po_id uuid FK purchase_orders.id
requested_by uuid FK profiles.id
status enum(pending, approved, revision_requested)
vendor_note text nullable
review_note text nullable
reviewed_by uuid nullable FK profiles.id
requested_at timestamptz
reviewed_at timestamptz nullable
```

### `revision_notes`

```text
id uuid PK
po_id uuid FK purchase_orders.id
item_id uuid nullable FK po_items.id
note text
annotated_attachment_id uuid nullable FK attachments.id
created_by uuid FK profiles.id
created_at timestamptz
```

### `po_versions`

```text
id uuid PK
po_id uuid FK purchase_orders.id
version_number integer
change_reason text
changed_fields jsonb
snapshot jsonb
created_by uuid FK profiles.id
created_at timestamptz
```

### `notifications`

```text
id uuid PK
user_id uuid FK profiles.id
type text
title text
body text
entity_type text
entity_id uuid
read_at timestamptz nullable
created_at timestamptz
```

### `activity_logs`

```text
id uuid PK
po_id uuid nullable FK purchase_orders.id
actor_id uuid FK profiles.id
action text
metadata jsonb
created_at timestamptz
```

Activity log bersifat append-only dan tidak dapat diubah dari client.

## 17. Supabase RLS

Aktifkan RLS untuk seluruh tabel bisnis.

Aturan minimum:

- Owner dapat mengakses semua data.
- Admin dapat mengakses semua PO/vendor sesuai permission.
- Vendor hanya dapat membaca PO dengan `purchase_orders.vendor_id = profiles.vendor_id`.
- Vendor hanya dapat mengubah field progres/status yang diizinkan pada PO miliknya.
- Vendor tidak dapat mengubah quantity, deadline, spesifikasi, vendor_id, atau desain utama.
- Vendor hanya dapat upload foto hasil ke path PO miliknya.
- Storage file tidak public permanen.
- Gunakan signed URL atau authenticated access.
- Jangan mempercayai role dari client; baca role dari database/session server.

## 18. Activity Log

Catat minimal:

- PO dibuat.
- PO dikirim.
- PO diterima vendor.
- Pekerjaan dimulai.
- Progres item diubah.
- PO diedit.
- Versi PO berubah.
- Vendor mengonfirmasi ulang.
- Vendor mengajukan selesai.
- Revisi diminta.
- PO disetujui.
- PO dibatalkan.
- PO selesai dibuka kembali.

Simpan actor, waktu, action, dan metadata perubahan yang relevan.

## 19. PWA

- Sediakan `manifest.webmanifest`.
- `start_url` harus `/`.
- Gunakan `display: standalone`.
- Sediakan ikon 192x192 dan 512x512.
- Root menentukan tujuan berdasarkan status login dan role.
- Navigasi menggunakan strategi network-first.
- API, Server Actions, payload Next.js, dan data PO tidak boleh cache-first.
- Cache-first hanya untuk aset statis berversi.
- Saat offline, tampilkan indikator koneksi.
- Jangan izinkan mutasi progres, approval, atau edit PO saat offline.
- Jangan tampilkan data cache seolah-olah pasti terbaru.
- Bersihkan cache versi lama saat service worker aktif.

## 20. UX dan Validasi

- Mobile-first dan responsif.
- Aksi utama vendor mudah dijangkau dengan satu tangan.
- Gunakan loading, empty, success, dan error state.
- Konfirmasi untuk aksi sensitif: kirim PO, batalkan, approve, dan buka kembali.
- Gunakan Bahasa Indonesia pada UI.
- Tanggal tampil dalam locale Indonesia.
- Simpan timestamp dalam UTC.
- Form divalidasi di client dan server.
- Error harus menjelaskan field yang perlu diperbaiki.
- Gunakan pagination atau infinite loading pada daftar besar.
- Gambar menggunakan thumbnail dan lazy loading.

## 21. Acceptance Criteria MVP

- [ ] Owner/admin dapat membuat PO untuk tepat satu vendor.
- [ ] Satu PO dapat berisi minimal dua item.
- [ ] Nomor PO unik dibuat otomatis berdasarkan tanggal dan urutan harian.
- [ ] Deadline tersedia pada level PO dan item.
- [ ] Vendor hanya dapat melihat PO vendor sendiri.
- [ ] Vendor dapat menerima PO dan memperbarui progres per pcs.
- [ ] `completed_quantity` tidak dapat melebihi `quantity`.
- [ ] Progres total PO dihitung otomatis.
- [ ] Admin dapat upload gambar referensi dan logo.
- [ ] Admin dapat mencoret, menambahkan teks, menumpuk logo, resize, rotate, dan menyimpan desain.
- [ ] Desain dapat dibuka dan diedit ulang dari canvas JSON.
- [ ] Gambar asli tidak berubah setelah anotasi disimpan.
- [ ] Vendor dapat mengajukan selesai tanpa wajib upload foto.
- [ ] Pengajuan vendor menghasilkan `WAITING_APPROVAL`.
- [ ] Owner/admin dapat approve atau meminta revisi.
- [ ] Catatan wajib ketika meminta revisi.
- [ ] Perubahan material meningkatkan versi PO dan meminta konfirmasi ulang.
- [ ] Riwayat mencatat actor dan waktu untuk aksi penting.
- [ ] PO dapat dibagikan melalui ringkasan dan deep link WhatsApp.
- [ ] Tidak ada customer, harga, invoice, pembayaran, atau registrasi publik.
- [ ] Aplikasi dapat dipasang sebagai PWA.
- [ ] Mutasi ditolak atau dinonaktifkan saat offline.
- [ ] RLS vendor tervalidasi melalui pengujian.

## 22. Urutan Implementasi

Kerjakan berurutan. Setiap fase harus lolos lint, type-check, build, dan pengujian yang relevan sebelum lanjut.

### Fase 1 — Fondasi

- Inisialisasi Next.js + TypeScript + Tailwind.
- Setup environment validation.
- Setup Supabase client server/browser.
- Auth, protected route, dan role.
- Struktur layout desktop/mobile.
- Migration awal dan seed development.

### Fase 2 — Vendor dan User

- CRUD vendor.
- Pembuatan user internal.
- Penonaktifan user.
- Hubungan user vendor.
- RLS dasar.

### Fase 3 — PO

- Schema PO dan item.
- Generator nomor PO atomic.
- CRUD draft.
- Kirim dan terima PO.
- Daftar/filter/detail.
- Deadline dan progres.
- Activity log.

### Fase 4 — Editor

- Supabase Storage policy.
- Upload dan kompresi gambar.
- Fabric.js editor.
- Canvas JSON dan design version.
- Preview WebP/PNG.
- Anotasi revisi.

### Fase 5 — Approval

- Ajukan selesai.
- Antrean approval.
- Approve dan revisi.
- Edit PO dan reconfirmation.
- Pembatalan dan pembukaan kembali.

### Fase 6 — Notifikasi dan WhatsApp

- In-app notification.
- Badge unread.
- Ringkasan PO.
- WhatsApp share dan deep link.

### Fase 7 — PWA dan Hardening

- Manifest dan icon.
- Service worker.
- Offline state.
- Mobile QA.
- Security/RLS testing.
- Performance dan image optimization.

## 23. Pengujian Minimum

- Unit test generator nomor PO.
- Unit test kalkulasi progres.
- Unit test validasi transisi status.
- Unit test validasi quantity.
- Integration test create/send/accept PO.
- Integration test approval dan revisi.
- Integration test version/reconfirmation.
- RLS test: vendor A tidak dapat membaca atau mengubah PO vendor B.
- E2E happy path owner/admin.
- E2E happy path vendor.
- E2E editor: upload, annotate, save, reopen.
- PWA installability check.
- Production build harus berhasil.

## 24. Aturan Eksekusi untuk Claude Code

1. Audit repository terlebih dahulu sebelum membuat atau mengubah file.
2. Jika project sudah ada, ikuti pola, dependency manager, dan konvensi yang sudah digunakan.
3. Jangan menghapus perubahan user yang tidak berkaitan.
4. Jangan menaruh service-role key Supabase di browser.
5. Buat migration SQL yang dapat direproduksi; jangan hanya mengubah database manual.
6. Gunakan RLS sebagai lapisan keamanan utama, bukan sekadar filter UI.
7. Jangan implementasikan seluruh fase sekaligus tanpa verifikasi.
8. Setelah setiap fase, jalankan lint, type-check, test, dan build.
9. Laporkan file yang diubah, migration yang dibuat, pengujian yang dijalankan, dan sisa pekerjaan.
10. Jika menemukan keputusan produk yang belum tercantum dan berdampak besar, berhenti dan minta klarifikasi. Untuk keputusan kecil, gunakan pilihan paling sederhana dan dokumentasikan asumsi.

## 25. Definition of Done

MVP selesai ketika:

- Owner/admin dapat membuat PO multi-item dan mengirimkannya ke satu vendor.
- Vendor dapat menerima PO dan memperbarui progres per pcs.
- Gambar dapat dianotasi dan ditumpuk logo tanpa merusak file asli.
- Vendor dapat mengajukan selesai.
- Owner/admin dapat approve atau meminta revisi.
- Perubahan material terlacak melalui versi dan konfirmasi ulang.
- Seluruh akses dibatasi sesuai role melalui RLS.
- Aplikasi nyaman digunakan melalui HP dan dapat dipasang sebagai PWA.
- Lint, type-check, test utama, dan production build berhasil.

## 26. Struktur Dokumentasi dan Tracking Fase

Jangan membuat folder bernama `skill` untuk tracking proyek. Gunakan struktur berikut:

```text
project-root/
├── CLAUDE.md
├── PRD.md
├── README.md
├── docs/
│   ├── PROGRESS.md
│   ├── DECISIONS.md
│   └── phases/
│       ├── phase-01-foundation.md
│       ├── phase-02-users-vendors.md
│       ├── phase-03-purchase-orders.md
│       ├── phase-04-image-editor.md
│       ├── phase-05-approval.md
│       ├── phase-06-notifications-whatsapp.md
│       └── phase-07-pwa-hardening.md
└── supabase/
    └── migrations/
```

### 26.1 Fungsi setiap file

- `CLAUDE.md`: aturan kerja tetap untuk Claude Code di repository.
- `PRD.md`: sumber kebutuhan produk dan aturan bisnis.
- `docs/PROGRESS.md`: dashboard progres seluruh fase.
- `docs/DECISIONS.md`: keputusan teknis penting dan alasannya.
- `docs/phases/phase-XX-*.md`: detail pekerjaan, hasil, pengujian, dan sisa pekerjaan pada satu fase.
- `supabase/migrations/`: seluruh perubahan database yang dapat dijalankan ulang.

### 26.2 Format `docs/PROGRESS.md`

Claude Code harus membuat file berikut pada awal pengerjaan:

```md
# Project Progress

Last updated: YYYY-MM-DD HH:mm
Current phase: Phase 1 — Foundation
Overall status: IN_PROGRESS

## Phase Status

| Phase | Status | Progress | Verification |
|---|---|---:|---|
| 1. Foundation | IN_PROGRESS | 0% | Not run |
| 2. Users & Vendors | NOT_STARTED | 0% | Not run |
| 3. Purchase Orders | NOT_STARTED | 0% | Not run |
| 4. Image Editor | NOT_STARTED | 0% | Not run |
| 5. Approval | NOT_STARTED | 0% | Not run |
| 6. Notifications & WhatsApp | NOT_STARTED | 0% | Not run |
| 7. PWA & Hardening | NOT_STARTED | 0% | Not run |

## Current Work

- Current task:
- Blocker:
- Next action:

## Latest Verification

- Lint:
- Type-check:
- Tests:
- Production build:
```

Gunakan status berikut secara konsisten:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
NEEDS_REVIEW
COMPLETED
```

Jangan menandai fase `COMPLETED` hanya karena kode sudah ditulis. Fase baru dianggap selesai jika acceptance criteria fase terpenuhi dan verifikasi yang relevan berhasil.

### 26.3 Format file setiap fase

Setiap file `docs/phases/phase-XX-*.md` harus menggunakan format:

```md
# Phase X — Nama Fase

Status: NOT_STARTED
Started at:
Completed at:

## Objective

Tujuan singkat fase.

## Scope

- [ ] Task pertama
- [ ] Task kedua

## Acceptance Criteria

- [ ] Kriteria pertama
- [ ] Kriteria kedua

## Files Changed

- Belum ada.

## Database Changes

- Belum ada.

## Verification

- [ ] Lint
- [ ] Type-check
- [ ] Unit/integration tests
- [ ] Production build

## Decisions

- Belum ada.

## Blockers

- Tidak ada.

## Handoff / Next Step

- Belum ada.
```

### 26.4 Aturan update progres

Claude Code wajib:

1. Membaca `PRD.md`, `CLAUDE.md`, dan `docs/PROGRESS.md` sebelum mulai bekerja.
2. Memperbarui status fase menjadi `IN_PROGRESS` sebelum mengubah kode.
3. Memperbarui checklist fase setelah task benar-benar selesai.
4. Mencatat migration dan file penting yang dibuat.
5. Menjalankan verifikasi sebelum menyatakan fase selesai.
6. Menulis hasil command verifikasi secara ringkas, bukan hanya “sudah dites”.
7. Mengubah fase menjadi `BLOCKED` jika membutuhkan keputusan user.
8. Menulis handoff agar sesi Claude berikutnya dapat melanjutkan tanpa mengulang audit dari awal.
9. Memperbarui `Last updated`, `Current phase`, dan `Next action` pada `docs/PROGRESS.md` setiap selesai sesi.
10. Tidak mengerjakan fase berikutnya sebelum user menyetujui kelanjutan, kecuali user secara eksplisit memerintahkan pengerjaan otomatis seluruh fase.

### 26.5 Isi awal `CLAUDE.md`

Claude Code harus membuat atau menggabungkan aturan berikut ke `CLAUDE.md` tanpa menghapus instruksi repository yang sudah ada:

```md
# Project Instructions

## Source of Truth

- Read `PRD.md` before planning or implementing features.
- Read `docs/PROGRESS.md` to determine the current phase.
- Read the current file in `docs/phases/` before making changes.
- Record important technical decisions in `docs/DECISIONS.md`.

## Workflow

- Work on one phase at a time.
- Do not silently expand product scope.
- Preserve unrelated user changes.
- Update progress documents before ending every work session.
- A phase is not complete until its verification succeeds.
- Stop and ask for clarification when a missing decision materially changes product behavior.

## Quality Gate

- Run lint.
- Run TypeScript type-check.
- Run tests relevant to the phase.
- Run the production build.
- Report failures honestly and leave the phase as `BLOCKED` or `NEEDS_REVIEW`.

## Security

- Never expose Supabase service-role keys to the browser.
- Enforce authorization with Supabase RLS and server-side checks.
- Never rely only on hidden UI elements for access control.
```

Jika `CLAUDE.md` sudah ada, jangan menimpanya. Gabungkan instruksi baru secara hati-hati dan pertahankan aturan lama yang tidak bertentangan.
