"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserSignature } from "@/type";
import {
  fetchMySignatures,
  verifySignature,
  type VerifyResult,
} from "@/services/signatureService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Dipanggil setelah verifikasi password signature sukses.
  onVerified: (result: VerifyResult) => void;
}

export function SignatureSelector({ open, onOpenChange, onVerified }: Props) {
  const [signatures, setSignatures] = useState<UserSignature[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setPassword("");
    setLoading(true);
    fetchMySignatures()
      .then((all) => setSignatures(all.filter((s) => !s.is_hidden)))
      .catch((e) =>
        toast.error("Gagal memuat tanda tangan", { description: e.message }),
      )
      .finally(() => setLoading(false));
  }, [open]);

  const handleVerify = async () => {
    if (!selectedId) return toast.error("Pilih salah satu tanda tangan dulu.");
    if (!password) return toast.error("Masukkan password signature.");
    setVerifying(true);
    try {
      const result = await verifySignature(selectedId, password);
      onVerified(result);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Verifikasi gagal", { description: e.message });
      setPassword("");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !verifying && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tanda Tangani Persetujuan</DialogTitle>
          <DialogDescription>
            Pilih tanda tangan, lalu masukkan password signature Anda untuk
            mengesahkan persetujuan ini.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : signatures.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Anda belum punya tanda tangan. Buat dulu di menu{" "}
            <span className="font-medium">Tanda Tangan Saya</span>.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {signatures.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "relative flex flex-col items-center rounded-lg border p-2 transition",
                    selectedId === s.id
                      ? "border-primary ring-1 ring-primary"
                      : "hover:bg-accent",
                  )}
                >
                  {selectedId === s.id && (
                    <Check className="absolute right-1 top-1 h-4 w-4 text-primary" />
                  )}
                  <div className="flex h-16 items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.image_url}
                      alt={s.label}
                      className="max-h-14 max-w-full object-contain"
                    />
                  </div>
                  <span className="mt-1 w-full truncate text-center text-xs">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-2 space-y-1.5">
              <Label htmlFor="sig-verify-pwd">Password Signature</Label>
              <Input
                id="sig-verify-pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                disabled={verifying}
                autoFocus
              />
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={verifying}
          >
            Batal
          </Button>
          <Button
            onClick={handleVerify}
            disabled={verifying || loading || signatures.length === 0 || !selectedId}
          >
            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verifikasi & Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
