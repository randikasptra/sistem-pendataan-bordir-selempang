# Architectural Decisions & Technical Log

Dokumen ini mencatat keputusan arsitektural dan teknis penting selama pengembangan Sistem Distribusi PO Bordir.

## [2026-07-29] Inisialisasi Proyek & Struktur Dokumentasi

### Konteks
Implementasi awal sistem berdasarkan PRD.md versi 1.0.

### Keputusan
1. Mengikuti pola penamaan file dan direktori sesuai Bagian 26 PRD.md.
2. Setup environment validation menggunakan Zod untuk menjamin integritas konfigurasi saat build dan runtime.
3. Menggunakan Supabase client wrapper yang memisahkan client-side (`@supabase/ssr` / `@supabase/supabase-js` sesuai Next.js) dan server-side (Server Components dan Route Handlers/Actions).

## [2026-07-29] Verifikasi Cloud Fase 1 dan RLS tanpa rekursi

### Konteks
Schema awal diterapkan di Supabase Cloud untuk smoke test Auth dan role-based access.

### Keputusan
1. Menambahkan grant API minimum untuk `authenticated` dan `service_role`; RLS tetap menentukan baris yang dapat diakses.
2. Mengganti policy yang membaca `public.profiles` secara langsung dengan fungsi `SECURITY DEFINER` yang hanya mengembalikan role atau `vendor_id` pengguna saat ini, untuk menghindari recursive policy evaluation.
3. Menggunakan `proxy.ts` sesuai konvensi Next.js 16 untuk refresh session dan redirect optimistis.
4. Menyediakan seed dan smoke test yang membaca seluruh akun development dari environment tanpa hard-code credential.

## [2026-07-29] Manajemen user dan isolasi vendor Fase 2

### Keputusan
1. Pembuatan user memakai Supabase invitation email agar password selalu dibuat penerima, bukan oleh aplikasi.
2. Akses manajemen user memerlukan owner atau admin dengan `can_manage_users`; akses vendor management tersedia bagi owner/admin.
3. Vendor hanya dapat membaca record vendor dan profile yang terhubung pada `vendor_id` sendiri. Pengujian integration membuat data sementara dan membersihkannya kembali.

## [2026-07-29] Purchase Orders dan Progress Tracking Fase 3

### Konteks
Implementasi penuh schema PO, items, activity logs, notifications, dan workflow status untuk mendukung distribusi PO ke vendor.

### Keputusan
1. **Atomic PO Number Generation**: Menggunakan PostgreSQL sequence (`po_number_sequence`) dengan trigger `assign_po_number()` untuk menghasilkan nomor PO unik format `PO-YYYY-MM-DD-NNN` secara atomic. Menghindari race condition tanpa memerlukan application-level locking.

2. **Granular Progress Tracking**: Menyimpan `quantity` dan `completed_quantity` terpisah pada level item untuk memungkinkan tracking progres per-pcs. Progres PO dihitung dari agregasi seluruh item, bukan disimpan sebagai kolom terpisah.

3. **Append-Only Activity Logs**: Table `activity_logs` menggunakan RLS policy `system_insert_logs` dengan `with check (true)` agar server dapat mencatat aktivitas tanpa bypass RLS. Log tidak memiliki update/delete policy untuk menjaga integritas audit trail.

4. **System Notifications**: Table `notifications` menggunakan policy `system_create_notifications` yang memungkinkan server-side notification creation untuk semua user. Policy `mark_own_as_read` membatasi update hanya pada notifikasi milik user sendiri.

5. **Vendor Isolation via RLS**: Vendor hanya dapat membaca dan mengubah PO dengan `vendor_id = current_user_vendor_id()`. RLS policy `vendor_update_own_po_progress` membatasi update vendor hanya pada field `status`, `completed_quantity`, dan `notes` (tidak dapat mengubah `quantity`, `deadline`, `vendor_id`, atau data inti lainnya).

6. **Flexible JSONB Fields**: Menggunakan `Record<string, unknown>` untuk field JSONB seperti `specifications`, `changed_fields`, dan `metadata`. Memberikan fleksibilitas tanpa over-specify schema di TypeScript layer.

7. **Status Workflow Enforcement**: Status transisi PO divalidasi di application layer (utility `canTransitionStatus`) dan RLS policies. Status terminal (`COMPLETED`, `CANCELLED`) tidak dapat diubah kecuali melalui aksi khusus owner (reopen dengan alasan).

8. **Versioning Strategy**: Table `po_versions` menyimpan snapshot lengkap PO saat terjadi perubahan material. Field `changed_fields` mencatat diff untuk quick reference. Vendor harus mengkonfirmasi ulang (`RECONFIRMATION_REQUIRED`) jika PO diubah setelah acceptance.

9. **Test Infrastructure**: Unit test untuk utility functions (progress calculation, status transitions, formatting) dijalankan dengan Node.js `--experimental-strip-types`. Integration test RLS menggunakan temporary vendor/user yang dibuat dan dihapus otomatis untuk isolasi test.

10. **UI Implementation Strategy**: Form PO creation sementara mendukung single item (MVP). Multi-item dynamic form memerlukan client-side JavaScript dan dapat ditambahkan pada fase hardening. Fokus pada server-side validation dan RLS enforcement terlebih dahulu.

### Alasan
- Atomic sequence lebih reliable dan performant dibanding application-level distributed lock untuk PO number generation.
- Calculated progress dari raw data mencegah data inconsistency antara stored percentage dengan actual quantities.
- Append-only logs dengan system insert policy menjaga audit trail integrity tanpa bypass RLS completely.
- RLS policies dengan SECURITY DEFINER functions menghindari recursive policy evaluation yang dapat menyebabkan infinite loop.
- JSONB flexibility berguna untuk specifications yang dapat berbeda per client/vendor tanpa schema migration.

### Trade-offs
- Single-item form creation: Memerlukan multiple create untuk multi-item PO (acceptable untuk MVP, dapat ditingkatkan kemudian).
- Test requires migration deployment: RLS integration test memerlukan migration diterapkan ke Supabase Cloud sebelum dapat dijalankan (expected, bukan blocker).
