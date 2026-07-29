# Architectural Decisions & Technical Log

Dokumen ini mencatat keputusan arsitektural dan teknis penting selama pengembangan Sistem Distribusi PO Bordir.

## [2026-07-29] Inisialisasi Proyek & Struktur Dokumentasi

### Konteks
Implementasi awal sistem berdasarkan PRD.md versi 1.0.

### Keputusan
1. Mengikuti pola penamaan file dan direktori sesuai Bagian 26 PRD.md.
2. Setup environment validation menggunakan Zod untuk menjamin integritas konfigurasi saat build dan runtime.
3. Menggunakan Supabase client wrapper yang memisahkan client-side (`@supabase/ssr` / `@supabase/supabase-js` sesuai Next.js) dan server-side (Server Components dan Route Handlers/Actions).
