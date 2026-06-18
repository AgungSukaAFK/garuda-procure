"use client";

import { Content } from "@/components/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { formatDateFriendly } from "@/lib/utils";
import { Feedback } from "@/type";
import {
  fetchFeedbacks,
  updateFeedbackStatus,
} from "@/services/feedbackService";
import { Loader2, Eye, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const LIMIT = 20;

const statusVariant: Record<
  Feedback["status"],
  { label: string; className: string }
> = {
  baru: { label: "Baru", className: "bg-blue-100 text-blue-700" },
  dibaca: { label: "Dibaca", className: "bg-amber-100 text-amber-700" },
  selesai: { label: "Selesai", className: "bg-green-100 text-green-700" },
};

export default function FeedbackManagementPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<Feedback | null>(null);

  // Guard: hanya admin (pertahanan tambahan; menu pun hanya muncul utk admin).
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (data?.role !== "admin") {
        toast.error("Halaman ini khusus admin.");
        router.replace("/dashboard");
      }
    })();
  }, [supabase, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await fetchFeedbacks(
        page,
        LIMIT,
        statusFilter || null,
      );
      setItems(data);
      setTotal(count);
    } catch (err: any) {
      toast.error("Gagal memuat feedback", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (
    fb: Feedback,
    status: Feedback["status"],
  ) => {
    try {
      await updateFeedbackStatus(fb.id, status);
      setItems((prev) =>
        prev.map((i) => (i.id === fb.id ? { ...i, status } : i)),
      );
      toast.success("Status feedback diperbarui.");
    } catch (err: any) {
      toast.error("Gagal memperbarui status", { description: err.message });
    }
  };

  const openDetail = (fb: Feedback) => {
    setSelected(fb);
    if (fb.status === "baru") handleStatusChange(fb, "dibaca");
  };

  return (
    <Content title="Feedback Masuk" size="lg" className="col-span-12">
      <div className="mb-4 flex justify-end">
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => {
            setStatusFilter(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="baru">Baru</SelectItem>
            <SelectItem value="dibaca">Dibaca</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              <TableHead>Pengirim</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length > 0 ? (
              items.map((fb, index) => (
                <TableRow key={fb.id}>
                  <TableCell>{(page - 1) * LIMIT + index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{fb.nama || "-"}</div>
                    <div className="text-xs text-muted-foreground">
                      {fb.email || "-"}
                    </div>
                  </TableCell>
                  <TableCell>{fb.whatsapp || "-"}</TableCell>
                  <TableCell>{fb.category}</TableCell>
                  <TableCell>{formatDateFriendly(fb.created_at)}</TableCell>
                  <TableCell>
                    <Badge
                      className={`${statusVariant[fb.status].className} hover:${statusVariant[fb.status].className}`}
                    >
                      {statusVariant[fb.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(fb)}
                    >
                      <Eye className="mr-1 h-3 w-3" /> Lihat
                    </Button>
                    {fb.status !== "selesai" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStatusChange(fb, "selesai")}
                      >
                        Selesai
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  Belum ada feedback.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Total {total} feedback · Halaman {page} dari{" "}
          {Math.max(1, Math.ceil(total / LIMIT))}
        </span>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / LIMIT) || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.category}</DialogTitle>
            <DialogDescription>
              Dari {selected?.nama || "-"} ({selected?.email || "-"}) ·{" "}
              {selected?.whatsapp || "-"}
            </DialogDescription>
          </DialogHeader>
          <div
            className="prose dark:prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: selected?.message || "" }}
          />
          {selected?.attachment_url && (
            <a
              href={selected.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
            >
              <Paperclip className="h-4 w-4" />
              {selected.attachment_name || "Lihat lampiran"}
            </a>
          )}
        </DialogContent>
      </Dialog>
    </Content>
  );
}
