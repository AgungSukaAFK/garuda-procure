// services/signatureService.ts
//
// Wrapper client untuk endpoint Signature Manager (semua logika sensitif di
// server: lihat app/api/v1/signatures/*). Hash tidak pernah ada di sini.

import { UserSignature } from "@/type";

export async function fetchMySignatures(): Promise<UserSignature[]> {
  const res = await fetch("/api/v1/signatures");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal memuat tanda tangan.");
  return json.data as UserSignature[];
}

export async function createSignature(input: {
  imageFile: File;
  label: string;
  accountPassword: string;
  signaturePassword: string;
}): Promise<UserSignature> {
  const fd = new FormData();
  fd.append("image", input.imageFile);
  fd.append("label", input.label);
  fd.append("accountPassword", input.accountPassword);
  fd.append("signaturePassword", input.signaturePassword);
  const res = await fetch("/api/v1/signatures", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal membuat tanda tangan.");
  return json.data as UserSignature;
}

export async function updateSignature(
  id: string,
  patch: { label?: string; is_hidden?: boolean },
): Promise<void> {
  const res = await fetch(`/api/v1/signatures/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal memperbarui tanda tangan.");
}

export async function updateSignatureImage(
  id: string,
  imageFile: File,
): Promise<void> {
  const fd = new FormData();
  fd.append("image", imageFile);
  const res = await fetch(`/api/v1/signatures/${id}/image`, {
    method: "POST",
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal mengganti gambar.");
}

export async function deleteSignature(id: string): Promise<void> {
  const res = await fetch(`/api/v1/signatures/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Gagal menghapus tanda tangan.");
}

export interface VerifyResult {
  image_url: string;
  printed_name: string;
}

// Mengembalikan hasil bila sukses; melempar Error (dengan pesan sisa percobaan /
// lockout) bila gagal.
export async function verifySignature(
  signatureId: string,
  password: string,
): Promise<VerifyResult> {
  const res = await fetch("/api/v1/signatures/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signatureId, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Verifikasi gagal.");
  return { image_url: json.image_url, printed_name: json.printed_name };
}
