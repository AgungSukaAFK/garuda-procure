"use client";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import useStore from "@/lib/zustand/store";
import { Button } from "./ui/button";

const companyProfileUrl = "https://garudamart.com";

interface NavLink {
  name: string;
  href: string;
}

export default function MenuOpen() {
  const { setMenuOpen, isMenuOpen } = useStore();

  const navLinks: NavLink[] = [
    { name: "Fitur", href: "#fitur" },
    { name: "Alur Kerja", href: "#alur-kerja" },
    { name: "Peran Pengguna", href: "#peran" },
    { name: "Teknologi", href: "#teknologi" },
  ];

  return (
    <div
      className="md:hidden bg-white border-t border-slate-200"
      hidden={!isMenuOpen}
    >
      <nav className="flex flex-col gap-4 p-4">
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="text-slate-600 hover:text-blue-700 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            {link.name}
          </a>
        ))}
        <a
          href={companyProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 transition-colors"
        >
          Profil Perusahaan
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
          <Button
            asChild
            className="bg-blue-700 text-white hover:bg-blue-800"
            onClick={() => setMenuOpen(false)}
          >
            <Link href="/auth/login">Masuk</Link>
          </Button>
        </div>
      </nav>
    </div>
  );
}
