import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AuthLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali ke Beranda
      </Link>
      <Link href="/">
        <Image
          src="/logo-gmi-lanscape.webp"
          alt="Garuda Procure — PT Garuda Mart Indonesia"
          width={1920}
          height={231}
          priority
          className="h-8 w-auto dark:brightness-0 dark:invert"
        />
      </Link>
    </div>
  );
}
