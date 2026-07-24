// src/app/auth/sign-up/page.tsx

"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signUpUser } from "@/services/userService";
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

// Minimal 6 karakter, wajib kombinasi huruf dan angka.
const isValidPassword = (password: string): boolean =>
  password.length >= 6 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const repeatPassword = formData.get("repeat-password") as string;

    if (password !== repeatPassword) {
      setError("Konfirmasi password tidak cocok.");
      setLoading(false);
      return;
    }

    if (!isValidPassword(password)) {
      setError(
        "Password minimal 6 karakter dan harus mengandung kombinasi huruf dan angka."
      );
      setLoading(false);
      return;
    }

    try {
      await signUpUser({ email, password });
      setSignupSuccess(true);
    } catch (error: any) {
      setError(error.message);
      toast.error("Pendaftaran Gagal", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
      toast.error("Daftar dengan Google Gagal", { description: error.message });
      setGoogleLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
        <AuthLogo className="mb-6" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Pendaftaran Berhasil ✅
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Akun Anda telah dibuat. Silakan hubungi admin untuk mendapatkan
              NRP dan aktivasi akun agar dapat mengakses sistem.
            </p>
            <Button asChild>
              <Link href="/auth/login">Kembali ke Halaman Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
      <AuthLogo className="mb-6" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Daftar Akun Baru
          </CardTitle>
          <CardDescription className="text-center">
            Buat akun untuk dapat mengakses sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
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
                minLength={6}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Minimal 6 karakter, kombinasi huruf dan angka.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeat-password">Ulangi Password</Label>
              <Input
                id="repeat-password"
                name="repeat-password"
                type="password"
                required
                disabled={loading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Pendaftaran Gagal</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Daftar
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
            onClick={handleGoogleSignUp}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Daftar dengan Google
          </Button>

          <div className="mt-4 text-center text-sm">
            Sudah punya akun?{" "}
            <Link href="/auth/login" className="underline underline-offset-4">
              Login di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
