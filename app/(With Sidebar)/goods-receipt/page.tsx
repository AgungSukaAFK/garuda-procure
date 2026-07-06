"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isGADepartment } from "@/lib/constants/departments";
import { Content } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { PackageCheck, Eye } from "lucide-react";
import { formatCurrency, formatDateFriendly } from "@/lib/utils";
import {
  fetchPendingGoodsReceiptPOs,
  saveGoodsReceipt,
} from "@/services/purchaseOrderService";
import { ReceiptChecklistDialog } from "@/components/po/receipt-checklist-dialog";
import { POItem, GoodsReceiptData } from "@/type";

type GRPurchaseOrder = {
  id: number;
  kode_po: string;
  total_price: number;
  created_at: string;
  mr_id: number | null;
  items: POItem[];
  users_with_profiles: { nama: string } | null;
  material_requests: { kode_mr: string; level: string | null } | null;
};

export default function GoodsReceiptPage() {
  const router = useRouter();
  const s = createClient();
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<GRPurchaseOrder[]>([]);
  const [me, setMe] = useState<{ id: string; nama: string } | null>(null);
  const [grTarget, setGrTarget] = useState<GRPurchaseOrder | null>(null);
  const [savingGR, setSavingGR] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await s.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const { data: profile } = await s
        .from("profiles")
        .select("role, department, nama")
        .eq("id", user.id)
        .single();
      setMe({ id: user.id, nama: profile?.nama || "GA" });

      // Hanya GA (atau admin) yang boleh mengakses Goods Receipt.
      if (!isGADepartment(profile?.department) && profile?.role !== "admin") {
        toast.error("Halaman ini khusus untuk Departemen GA.");
        router.push("/dashboard");
        return;
      }

      setPos(
        (await fetchPendingGoodsReceiptPOs()) as unknown as GRPurchaseOrder[],
      );
    } catch (e: any) {
      toast.error("Gagal memuat data", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleConfirmGR = async (payload: {
    items: GoodsReceiptData["items"];
    signature: { image_url: string; printed_name: string };
  }) => {
    if (!grTarget || !grTarget.mr_id || !me) return;
    setSavingGR(true);
    try {
      const data: GoodsReceiptData = {
        items: payload.items,
        received_by: me.id,
        received_by_name: me.nama,
        signature_url: payload.signature.image_url,
        printed_name: payload.signature.printed_name,
        received_at: new Date().toISOString(),
      };
      await saveGoodsReceipt(grTarget.id, grTarget.mr_id, data);
      toast.success(`Goods Receipt ${grTarget.kode_po} tersimpan.`);
      setPos((prev) => prev.filter((p) => p.id !== grTarget.id));
      setGrTarget(null);
    } catch (e: any) {
      toast.error("Gagal menyimpan Goods Receipt", { description: e.message });
    } finally {
      setSavingGR(false);
    }
  };

  if (loading) {
    return (
      <Content className="col-span-12">
        <Skeleton className="h-64 w-full" />
      </Content>
    );
  }

  return (
    <Content
      title="Goods Receipt"
      description="Daftar Purchase Order yang sudah dibayar dan menunggu penerimaan barang di warehouse oleh GA."
      className="col-span-12"
    >
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Kode PO</TableHead>
              <TableHead>Ref. MR</TableHead>
              <TableHead>Pembuat</TableHead>
              <TableHead>Total Harga</TableHead>
              <TableHead>Tanggal Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pos.length > 0 ? (
              pos.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.kode_po}</TableCell>
                  <TableCell>
                    {po.material_requests?.kode_mr || "-"}
                  </TableCell>
                  <TableCell>{po.users_with_profiles?.nama || "N/A"}</TableCell>
                  <TableCell>{formatCurrency(po.total_price)}</TableCell>
                  <TableCell>{formatDateFriendly(po.created_at)}</TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/purchase-order/${po.id}`}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Detail
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setGrTarget(po)}
                    >
                      <PackageCheck className="mr-1 h-3.5 w-3.5" />
                      Terima Barang
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Tidak ada PO yang menunggu penerimaan barang.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ReceiptChecklistDialog
        open={!!grTarget}
        onOpenChange={(o) => !o && setGrTarget(null)}
        title={`Goods Receipt — ${grTarget?.kode_po ?? ""}`}
        description="Checklist barang yang diterima di warehouse, lalu tanda tangani untuk menyimpan Goods Receipt."
        items={grTarget?.items ?? []}
        saving={savingGR}
        confirmLabel="Tanda Tangani & Terima"
        onConfirm={handleConfirmGR}
      />
    </Content>
  );
}
