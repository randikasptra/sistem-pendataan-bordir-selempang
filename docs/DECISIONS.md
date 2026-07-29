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
