import React from "react";
import { Inter, Poppins } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import {
  FileClock,
  Wallet,
  Workflow,
  ShieldCheck,
  Gauge,
  FileSignature,
  PackageCheck,
  Bot,
  ChevronRight,
  QrCode,
  Users,
  UserCheck,
  ShoppingCart,
  Building2,
  ArrowRight,
  Code2,
  FileCode,
  Database,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/auth-button";
import ToggleMenu from "@/components/toggle-menu";
import MenuOpen from "@/components/menu-open";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

/**
 * Kunci variabel warna shadcn/Tailwind (lihat app/globals.css) di-override
 * di sini agar identitas navy/putih halaman ini tetap tetap sama persis
 * walau pengguna mengganti tema aplikasi (light/dark/system) lewat ThemeSwitcher —
 * komponen bersama seperti AuthButton & tombol ghost ikut memakai token ini.
 */
const landingThemeVars = {
  colorScheme: "light",
  "--background": "0 0% 100%",
  "--foreground": "226 57% 21%",
  "--card": "0 0% 100%",
  "--card-foreground": "226 57% 21%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "226 57% 21%",
  "--primary": "224 76% 48%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "210 40% 96%",
  "--secondary-foreground": "226 57% 21%",
  "--muted": "210 40% 96%",
  "--muted-foreground": "215 16% 47%",
  "--accent": "204 100% 97%",
  "--accent-foreground": "224 76% 48%",
  "--destructive": "0 84.2% 60.2%",
  "--destructive-foreground": "0 0% 98%",
  "--border": "214 32% 91%",
  "--input": "214 32% 91%",
  "--ring": "224 76% 48%",
} as React.CSSProperties;

interface NavLink {
  name: string;
  href: string;
}

const navLinks: NavLink[] = [
  { name: "Fitur", href: "#fitur" },
  { name: "Alur Kerja", href: "#alur-kerja" },
  { name: "Peran Pengguna", href: "#peran" },
  { name: "Teknologi", href: "#teknologi" },
];

const features = [
  {
    icon: Workflow,
    title: "Multi-Level Approval Dinamis",
    description:
      "Jalur persetujuan berjenjang yang dapat dikonfigurasi, dengan empat tipe: Mengetahui, Menyetujui, Payment Approval, dan Payment Validator.",
  },
  {
    icon: ShieldCheck,
    title: "Pre-emptive Budgetary Control",
    description:
      "Saldo cost center diperiksa saat validasi. Jika tidak mencukupi, validasi otomatis diblokir; jika mencukupi, saldo terpotong otomatis dan dikembalikan otomatis bila pengajuan ditolak.",
  },
  {
    icon: Gauge,
    title: "Prioritas Otomatis P0–P4",
    description:
      "Tingkat urgensi setiap pengajuan dihitung otomatis berdasarkan tenggat waktu (due date).",
  },
  {
    icon: FileSignature,
    title: "Digital Validation (TTD + QR Code)",
    description:
      "Tanda tangan digital terenkripsi (bcrypt) dengan kata sandi terpisah dari akun. Dokumen dilengkapi QR Code yang dapat dipindai untuk verifikasi keaslian.",
  },
  {
    icon: PackageCheck,
    title: "Penerimaan Barang Digital (Goods Receipt)",
    description:
      "Checklist kuantitas barang per item saat penerimaan, dilengkapi tanda tangan digital sebagai bukti konfirmasi.",
  },
  {
    icon: Bot,
    title: "Asisten AI",
    description:
      "Chatbot berbasis LLM yang membantu menelusuri status MR/PO melalui percakapan. Bersifat read-only dan aman.",
  },
];

const workflowSteps = [
  { icon: FileClock, label: "Buat MR" },
  { icon: Wallet, label: "Validasi + Cost Center" },
  { icon: Users, label: "Approval Berjenjang" },
  { icon: FileSignature, label: "Buat PO + TTD Digital" },
  { icon: QrCode, label: "Cetak PO + QR Code" },
  { icon: PackageCheck, label: "Penerimaan Barang" },
];

const roles = [
  {
    icon: Users,
    title: "Requester",
    description: "Mengajukan Material Request (MR) dan Petty Cash.",
  },
  {
    icon: UserCheck,
    title: "Approver",
    description:
      "Melakukan persetujuan berjenjang dan pembubuhan tanda tangan digital.",
  },
  {
    icon: ShoppingCart,
    title: "Purchasing",
    description:
      "Membuat Purchase Order (PO) serta mengelola data vendor dan barang.",
  },
  {
    icon: Building2,
    title: "Admin / General Affair",
    description:
      "Memvalidasi MR, mengelola cost center, dan mengonfirmasi penerimaan barang.",
  },
];

const techStack = [
  {
    icon: Code2,
    name: "Next.js",
    caption: "Framework aplikasi web",
  },
  {
    icon: FileCode,
    name: "TypeScript",
    caption: "Bahasa pemrograman",
  },
  {
    icon: Database,
    name: "Supabase (PostgreSQL)",
    caption: "Backend & basis data",
  },
  {
    icon: Sparkles,
    name: "Gemini AI",
    caption: "Model bahasa Asisten AI",
  },
];

const companyProfileUrl = "https://garudamart.com";

const App = async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  return (
    <div
      style={landingThemeVars}
      className={`${inter.className} bg-white text-slate-700 antialiased`}
    >
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <a href="#" className="flex items-center">
            <Image
              src="/logo-gmi-lanscape.webp"
              alt="Garuda Procure — PT Garuda Mart Indonesia"
              width={1920}
              height={231}
              priority
              className="h-8 w-auto sm:h-9"
            />
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-slate-600 transition-colors hover:text-blue-700"
              >
                {link.name}
              </a>
            ))}
            <a
              href={companyProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-700 transition-colors hover:text-blue-800"
            >
              Profil Perusahaan
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <AuthButton />
          </div>
          <ToggleMenu />
        </div>
        <MenuOpen />
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 to-blue-900 py-20 md:py-28">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>
          <div className="container relative mx-auto px-4 text-center md:px-6">
            <h1
              className={`${poppins.className} text-4xl font-extrabold tracking-tight text-white md:text-6xl`}
            >
              Garuda Procure
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-xl font-semibold text-sky-300 md:text-2xl">
              Sistem E-Procurement Terintegrasi dengan Validasi Digital
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-base text-blue-100/80 md:text-lg">
              Mempercepat alur pengadaan dari pengajuan hingga penerimaan
              barang, menggantikan proses manual berbasis dokumen kertas
              dengan alur digital yang tercatat dan dapat divalidasi.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-white text-blue-950 hover:bg-blue-50"
              >
                <Link href={isLoggedIn ? "/dashboard" : "/auth/login"}>
                  {isLoggedIn ? "Dashboard" : "Masuk"}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <a
                href={companyProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Kunjungi profil lengkap PT Garuda Mart Indonesia"
                className="inline-flex items-center rounded-md bg-white p-1 transition-transform hover:scale-105"
              >
                <Image
                  src="/gmi-logo.webp"
                  alt="PT Garuda Mart Indonesia"
                  width={150}
                  height={150}
                  className="h-7 w-7 object-contain"
                />
              </a>
              <a
                href={companyProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-100/80 hover:text-white"
              >
                Lihat profil lengkap perusahaan
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="relative mx-auto mt-16 max-w-4xl">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl">
                <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                </div>
                <Image
                  src="/dashboard.png"
                  alt="Tampilan dashboard aplikasi Garuda Procure"
                  className="w-full object-cover"
                  width={1920}
                  height={1080}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Fitur Utama */}
        <section id="fitur" className="bg-slate-50 py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                Fitur Utama
              </h2>
              <p
                className={`${poppins.className} mt-2 text-3xl font-extrabold tracking-tight text-blue-950 md:text-4xl`}
              >
                Kapabilitas Inti Garuda Procure
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-950 text-white">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-blue-950">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Alur Kerja Singkat */}
        <section id="alur-kerja" className="bg-white py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                Alur Kerja Singkat
              </h2>
              <p
                className={`${poppins.className} mt-2 text-3xl font-extrabold tracking-tight text-blue-950 md:text-4xl`}
              >
                Dari Pengajuan hingga Penerimaan Barang
              </p>
            </div>
            <div className="mt-14 flex items-start gap-1 overflow-x-auto pb-4 md:justify-center md:gap-1.5 md:overflow-visible">
              {workflowSteps.map((step, index) => (
                <React.Fragment key={step.label}>
                  <div className="flex w-28 shrink-0 flex-col items-center text-center md:w-32">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-blue-950 md:text-sm">
                      {step.label}
                    </p>
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <ChevronRight className="mt-5 h-5 w-5 shrink-0 text-slate-300" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* Peran Pengguna */}
        <section id="peran" className="bg-slate-50 py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                Peran Pengguna
              </h2>
              <p
                className={`${poppins.className} mt-2 text-3xl font-extrabold tracking-tight text-blue-950 md:text-4xl`}
              >
                Empat Aktor Utama dalam Sistem
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map((role) => (
                <div
                  key={role.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-950 text-white">
                    <role.icon className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="mt-4 font-bold text-blue-950">
                    {role.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {role.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Teknologi */}
        <section id="teknologi" className="bg-white py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                Teknologi
              </h2>
              <p
                className={`${poppins.className} mt-2 text-3xl font-extrabold tracking-tight text-blue-950 md:text-4xl`}
              >
                Dibangun di Atas Teknologi Modern
              </p>
            </div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {techStack.map((tech) => (
                <div
                  key={tech.name}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <tech.icon className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-950 text-sm">
                      {tech.name}
                    </p>
                    <p className="text-xs text-slate-500">{tech.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="kontak" className="bg-blue-950 text-blue-100">
        <div className="container mx-auto px-4 py-14 text-center md:px-6">
          <a href="#" className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-950 font-bold text-lg">
              G
            </div>
            <span className={`${poppins.className} text-lg font-bold text-white`}>
              Garuda Procure
            </span>
          </a>
          <p className="mt-4 text-sm text-blue-200/80">
            Dikembangkan untuk PT Garuda Mart Indonesia
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <a
              href={companyProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Kunjungi profil lengkap PT Garuda Mart Indonesia"
              className="inline-flex items-center rounded-md bg-white px-2 py-1 transition-transform hover:scale-105"
            >
              <Image
                src="/logo-gmi-lanscape.webp"
                alt="PT Garuda Mart Indonesia"
                width={110}
                height={13}
                className="h-3.5 w-auto"
              />
            </a>
            <a
              href={companyProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-200/80 hover:text-white"
            >
              Profil Perusahaan
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="mx-auto mt-8 h-px w-16 bg-white/10" />
          <p className="mt-8 text-sm text-blue-200/80">
            Dibangun oleh{" "}
            <span className="font-semibold text-white">
              Muhamad Agung Maulana
            </span>
            <br className="sm:hidden" /> — Teknik Informatika, FILKOM UNBAJA
          </p>
          <p className="mt-6 text-xs text-blue-300/60">
            &copy; {new Date().getFullYear()} Garuda Procure. Seluruh hak
            cipta dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
