// src/app/(With Sidebar)/feedback/page.tsx

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Content } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Bold,
  Italic,
  List,
  ListOrdered,
  Paperclip,
  X,
} from "lucide-react";
import { User } from "@/type";
import { createFeedback } from "@/services/feedbackService";

// Import TipTap
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

const kategoriFeedback = [
  "Laporan Bug",
  "Saran Fitur",
  "Masalah Tampilan (UI/UX)",
  "Performa Lambat",
  "Pertanyaan Umum",
  "Lainnya",
];

// Komponen Toolbar untuk TipTap Editor
const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border border-input bg-transparent rounded-t-md p-1 flex gap-1">
      <Button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="sm"
        type="button"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="sm"
        type="button"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        size="sm"
        type="button"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        size="sm"
        type="button"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function FeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [whatsapp, setWhatsapp] = useState("");
  const [category, setCategory] = useState("");
  const [otherCategory, setOtherCategory] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure(),
      Placeholder.configure({
        placeholder: "Tuliskan detail pesan Anda di sini...",
      }),
    ],
    content: message,
    onUpdate({ editor }) {
      setMessage(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert prose-sm sm:prose-base focus:outline-none",
      },
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users_with_profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setCurrentUser(profile);
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const finalCategory = category === "Lainnya" ? otherCategory : category;
    if (!whatsapp.trim() || !finalCategory.trim() || editor?.isEmpty) {
      toast.error("Nomor WhatsApp, Kategori, dan Pesan wajib diisi.");
      return;
    }
    // Validasi nomor HP Indonesia: harus diawali 08 dan 10-13 digit angka.
    if (!/^08\d{8,11}$/.test(whatsapp.trim())) {
      toast.error("Nomor WhatsApp harus nomor Indonesia, diawali 08 (mis. 081234567890).");
      return;
    }
    if (!currentUser) {
      toast.error(
        "Gagal mendapatkan data user. Silakan coba muat ulang halaman."
      );
      return;
    }

    if (attachment && attachment.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file lampiran tidak boleh melebihi 5MB.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Mengirim feedback...");

    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (attachment) {
        const supabase = createClient();
        const fileExt = attachment.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;
        const filePath = `feedback/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("mr")
          .upload(filePath, attachment);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("mr")
          .getPublicUrl(filePath);
        attachmentUrl = publicUrlData.publicUrl;
        attachmentName = attachment.name;
      }

      await createFeedback({
        user_id: currentUser.id,
        nama: currentUser.nama ?? null,
        email: currentUser.email ?? null,
        whatsapp,
        category: finalCategory,
        message,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      });

      toast.success("Terima kasih! Feedback Anda telah terkirim.", {
        id: toastId,
      });
      setWhatsapp("");
      setCategory("");
      setOtherCategory("");
      setAttachment(null);
      editor?.commands.clearContent();
    } catch (error: any) {
      toast.error("Gagal mengirim feedback", {
        id: toastId,
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Content
        title="Kirim Feedback"
        description="Punya saran, laporan bug, atau pertanyaan? Beri tahu kami di sini."
        className="col-span-12 md:col-span-8 md:col-start-3"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Anda</Label>
              <Input value={currentUser?.nama || "Memuat..."} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={currentUser?.email || "Memuat..."} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">Nomor WhatsApp Aktif</Label>
            <Input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              value={whatsapp}
              onChange={(e) =>
                // Hanya terima angka (buang huruf/karakter lain saat mengetik).
                setWhatsapp(e.target.value.replace(/\D/g, ""))
              }
              placeholder="081234567890"
              required
              disabled={loading}
              aria-invalid={whatsapp.length > 0 && !/^08\d{8,11}$/.test(whatsapp)}
              className={
                whatsapp.length > 0 && !/^08\d{8,11}$/.test(whatsapp)
                  ? "border-red-500 focus-visible:ring-red-500"
                  : undefined
              }
            />
            {whatsapp.length > 0 && !/^08\d{8,11}$/.test(whatsapp) && (
              <p className="text-xs text-red-500">
                Nomor harus diawali 08 dan terdiri dari 10–13 digit angka.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Kategori Feedback</Label>
            <Select
              onValueChange={setCategory}
              value={category}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori feedback..." />
              </SelectTrigger>
              <SelectContent>
                {kategoriFeedback.map((kat) => (
                  <SelectItem key={kat} value={kat}>
                    {kat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category === "Lainnya" && (
            <div className="space-y-2 animate-in fade-in">
              <Label htmlFor="otherCategory">Sebutkan Kategori Lainnya</Label>
              <Input
                id="otherCategory"
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
                placeholder="Contoh: Masalah Keamanan"
                required={category === "Lainnya"}
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Pesan Anda</Label>
            <div className="rounded-md border border-input">
              <Toolbar editor={editor} />
              <EditorContent editor={editor} className="p-1" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachment">Lampiran (Opsional)</Label>
            {!attachment ? (
              <Input
                id="attachment"
                type="file"
                onChange={(e) =>
                  setAttachment(e.target.files ? e.target.files[0] : null)
                }
                disabled={loading}
              />
            ) : (
              <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50 text-sm">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <Paperclip className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => setAttachment(null)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Sertakan screenshot atau dokumen jika perlu. Maksimal 5MB.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !currentUser}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Kirim Feedback
          </Button>
        </form>
      </Content>
    </>
  );
}
