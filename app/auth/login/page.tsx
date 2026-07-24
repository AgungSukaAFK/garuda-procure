// src/app/auth/login/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signInWithEmailOrNrp } from "@/services/userService";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthLogo } from "@/components/auth-logo";
import { GoogleIcon } from "@/components/google-icon";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tampilkan pesan jika user diarahkan ke sini karena akunnya dinonaktifkan.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "deactivated") {
      const message =
        "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.";
      setError(message);
      toast.error("Akses Ditolak", { description: message });
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const identifier = formData.get("identifier") as string;
    const password = formData.get("password") as string;

    try {
      await signInWithEmailOrNrp(identifier, password);

      toast.success("Login berhasil! Mengarahkan ke dashboard...");
      // Refresh state server dan arahkan ke root (middleware akan handle sisanya)
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      setError(error.message);
      toast.error("Login Gagal", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      // Jika berhasil, browser akan di-redirect ke Google (kode di bawah
      // tidak tercapai). Baris ini hanya jalan bila gagal memulai alur.
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      toast.error("Login Google Gagal", { description: error.message });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <AuthLogo className="mb-6" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Masukkan Email atau NRP Anda untuk masuk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email atau NRP</Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                required
                placeholder="email@example.com atau 123456"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
              />
            </div>
            <p className="text-end text-xs text-muted-foreground">
              Lupa password? Hubungi admin untuk reset.
            </p>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Login Gagal</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ATAU</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Masuk dengan Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Belum punya akun?{" "}
            <Link href="/auth/sign-up" className="underline underline-offset-4">
              Daftar di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
