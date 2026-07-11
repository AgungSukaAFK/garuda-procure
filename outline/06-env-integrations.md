# 🔌 06. Environment & External Integrations

Dokumen ini menjelaskan integrasi pihak ketiga dan variabel lingkungan yang diperlukan agar sistem berjalan dengan benar.

## 1. Environment Variables (`.env`)

**Source:** `.env.example`

| Variable                        | Kegunaan                            | Critical Level |
| :------------------------------ | :---------------------------------- | :------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Endpoint API Supabase.              | **High**       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Key untuk client-side fetch. | **High**       |

## 2. External Services

### A. Database & Auth (Supabase)

**Instance:** `lib/supabase/client.ts` & `server.ts`

- **Auth:** Menggunakan Supabase Auth — login Google OAuth dan email/password. **Alur "lupa password via email" TIDAK dipakai/tidak wired** — lihat catatan di bawah.
- **Storage:** Bucket `mr` (untuk lampiran Material Request) dan `avatars`.

> **Catatan (per audit terbaru)**: revisi dokumen sebelumnya sempat mencantumkan integrasi "Email Service (AWS SES)" lewat `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` dan file `lib/amazon_ses/index.ts`. Setelah dicek langsung ke kode, **file tersebut tidak pernah ada**, tidak ada dependency `nodemailer` di `package.json`, dan tidak ada route `send-email` di `app/api/`. Sistem ini tidak mengirim email dari kode aplikasi sendiri. Variabel `SMTP_PORT`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SES_FROM` sudah dihapus dari `.env.example` karena tidak pernah dipakai di kode manapun.
>
> **Koreksi soal "lupa password"**: sistem ini **tidak** memakai alur reset password berbasis email Supabase (`supabase.auth.resetPasswordForEmail()` — nol pemanggilan di seluruh kode). Halaman login (`app/auth/login/page.tsx`) hanya menampilkan teks "Lupa password? Hubungi admin untuk reset." Reset password yang benar-benar berjalan adalah **admin-manual**: endpoint `app/api/v1/admin/reset-password/route.ts` memakai Supabase *service-role* admin API (`admin.auth.admin.updateUserById`) untuk langsung mengganti password user tanpa mengirim email apa pun — UI-nya ada di `app/(With Sidebar)/user-management/[userid]/page.tsx`. Jadi kebutuhan email aplikasi ini sebenarnya hanya untuk **login Google OAuth** (yang tidak butuh pengiriman email kustom) — bukan untuk password recovery.
