"use client";

import { useEffect, useState } from "react";
import { Content } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  FileSignature,
  Crop,
} from "lucide-react";
import { UserSignature } from "@/type";
import {
  fetchMySignatures,
  createSignature,
  updateSignature,
  updateSignatureImage,
  deleteSignature,
} from "@/services/signatureService";
import {
  SignatureCropper,
  type CropData,
} from "@/components/signature/signature-cropper";
import { getCroppedImg } from "@/lib/cropImage";

export default function SignaturesPage() {
  const [items, setItems] = useState<UserSignature[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [cropData, setCropData] = useState<CropData | null>(null);
  const [label, setLabel] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [signaturePassword, setSignaturePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Edit gambar tanda tangan yang sudah ada.
  const [editTarget, setEditTarget] = useState<UserSignature | null>(null);
  const [editPreview, setEditPreview] = useState<string>("");
  const [editCropData, setEditCropData] = useState<CropData | null>(null);
  const [savingImage, setSavingImage] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await fetchMySignatures());
    } catch (e: any) {
      toast.error("Gagal memuat tanda tangan", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setFile(null);
    setPreview("");
    setCropData(null);
    setLabel("");
    setAccountPassword("");
    setSignaturePassword("");
    setConfirmPassword("");
  };

  const onPickFile = (f: File | null) => {
    setFile(f);
    setCropData(null);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const handleCreate = async () => {
    if (!file) return toast.error("Pilih gambar tanda tangan dulu.");
    if (!label.trim()) return toast.error("Label wajib diisi.");
    if (signaturePassword.length < 6)
      return toast.error("Password signature minimal 6 karakter.");
    if (signaturePassword !== confirmPassword)
      return toast.error("Konfirmasi password signature tidak cocok.");

    setSaving(true);
    try {
      // Pakai hasil crop bila tersedia, jika tidak pakai gambar asli.
      const imageFile =
        cropData && preview
          ? await getCroppedImg(
              preview,
              cropData.croppedAreaPixels,
              cropData.rotation,
            )
          : file;
      await createSignature({
        imageFile,
        label: label.trim(),
        accountPassword,
        signaturePassword,
      });
      toast.success("Tanda tangan berhasil ditambahkan.");
      setOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error("Gagal menambah tanda tangan", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const onPickEditFile = (f: File | null) => {
    setEditPreview(f ? URL.createObjectURL(f) : "");
    setEditCropData(null);
  };

  const handleSaveImage = async () => {
    if (!editTarget) return;
    if (!editPreview || !editCropData)
      return toast.error("Pilih gambar baru dan atur bingkainya dulu.");
    setSavingImage(true);
    try {
      const cropped = await getCroppedImg(
        editPreview,
        editCropData.croppedAreaPixels,
        editCropData.rotation,
      );
      await updateSignatureImage(editTarget.id, cropped);
      toast.success("Gambar tanda tangan diperbarui.");
      setEditTarget(null);
      setEditPreview("");
      setEditCropData(null);
      load();
    } catch (e: any) {
      toast.error("Gagal mengganti gambar", { description: e.message });
    } finally {
      setSavingImage(false);
    }
  };

  const toggleHidden = async (s: UserSignature) => {
    try {
      await updateSignature(s.id, { is_hidden: !s.is_hidden });
      setItems((prev) =>
        prev.map((i) => (i.id === s.id ? { ...i, is_hidden: !i.is_hidden } : i)),
      );
    } catch (e: any) {
      toast.error("Gagal mengubah visibilitas", { description: e.message });
    }
  };

  const renameLabel = async (s: UserSignature) => {
    const next = window.prompt("Label baru:", s.label);
    if (!next || !next.trim() || next.trim() === s.label) return;
    try {
      await updateSignature(s.id, { label: next.trim() });
      setItems((prev) =>
        prev.map((i) => (i.id === s.id ? { ...i, label: next.trim() } : i)),
      );
    } catch (e: any) {
      toast.error("Gagal mengubah label", { description: e.message });
    }
  };

  const handleDelete = async (s: UserSignature) => {
    try {
      await deleteSignature(s.id);
      setItems((prev) => prev.filter((i) => i.id !== s.id));
      toast.success("Tanda tangan dihapus.");
    } catch (e: any) {
      toast.error("Gagal menghapus", { description: e.message });
    }
  };

  return (
    <Content
      title="Tanda Tangan Saya"
      description="Kelola tanda tangan elektronik Anda. Dipakai saat menyetujui dokumen, diverifikasi dengan password signature terpisah."
      size="lg"
      className="col-span-12"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Memuat…" : `${items.length} dari 6 tanda tangan`}
        </p>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          disabled={items.length >= 6}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
          <FileSignature className="h-8 w-8" />
          Belum ada tanda tangan. Klik “Tambah” untuk membuat.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className="flex flex-col rounded-lg border p-3">
              <div className="flex h-28 items-center justify-center rounded bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image_url}
                  alt={s.label}
                  className="max-h-24 max-w-full object-contain"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="truncate font-medium">{s.label}</span>
                {s.is_hidden && <Badge variant="secondary">Disembunyikan</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {s.printed_name}
              </p>
              <div className="mt-3 flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => renameLabel(s)}
                >
                  <Pencil className="mr-1 h-3 w-3" /> Label
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditTarget(s);
                    setEditPreview("");
                    setEditCropData(null);
                  }}
                  aria-label="Ganti gambar"
                  title="Ganti / edit gambar"
                >
                  <Crop className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleHidden(s)}
                  aria-label={s.is_hidden ? "Tampilkan" : "Sembunyikan"}
                >
                  {s.is_hidden ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" aria-label="Hapus">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus tanda tangan ini?</AlertDialogTitle>
                      <AlertDialogDescription>
                        “{s.label}” akan dihapus permanen. Dokumen yang sudah
                        ditandatangani sebelumnya tidak terpengaruh.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(s)}>
                        Ya, Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog tambah */}
      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Tanda Tangan</DialogTitle>
            <DialogDescription>
              Unggah gambar TTD, beri label, lalu set password signature (terpisah
              dari password login). Nama tercetak diambil otomatis dari profil Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sig-img">Gambar Tanda Tangan (maks 2MB)</Label>
              <Input
                id="sig-img"
                type="file"
                accept="image/*"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                disabled={saving}
              />
              {preview && (
                <SignatureCropper imageSrc={preview} onChange={setCropData} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sig-label">Label</Label>
              <Input
                id="sig-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder='mis. "TTD Formal"'
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sig-acc">
                Password Akun (opsional, kosongkan jika login via Google)
              </Label>
              <Input
                id="sig-acc"
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Verifikasi tambahan (boleh dikosongkan)"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sig-pwd">Password Signature (baru, min 6)</Label>
              <Input
                id="sig-pwd"
                type="password"
                value={signaturePassword}
                onChange={(e) => setSignaturePassword(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sig-pwd2">Konfirmasi Password Signature</Label>
              <Input
                id="sig-pwd2"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog edit / ganti gambar */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !savingImage && !o && setEditTarget(null)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ganti Gambar Tanda Tangan</DialogTitle>
            <DialogDescription>
              Unggah gambar baru lalu atur bingkai, zoom, dan rotasinya. Label dan
              password tetap sama.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sig-edit-img">Gambar Baru (maks 2MB)</Label>
              <Input
                id="sig-edit-img"
                type="file"
                accept="image/*"
                onChange={(e) => onPickEditFile(e.target.files?.[0] ?? null)}
                disabled={savingImage}
              />
            </div>
            {editPreview ? (
              <SignatureCropper
                imageSrc={editPreview}
                onChange={setEditCropData}
              />
            ) : (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Gambar saat ini:</span>
                <div className="flex h-24 items-center justify-center rounded border bg-muted/40">
                  {editTarget && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editTarget.image_url}
                      alt={editTarget.label}
                      className="max-h-20 max-w-full object-contain"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={savingImage}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveImage}
              disabled={savingImage || !editPreview}
            >
              {savingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Gambar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Content>
  );
}
