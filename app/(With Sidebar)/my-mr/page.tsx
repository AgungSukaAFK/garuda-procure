"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Content } from "@/components/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateFriendly } from "@/lib/utils";

type MyMR = {
  id: string;
  kode_mr: string;
  status: string;
  level: string | null;
  prioritas: string | null;
  department: string | null;
  cost_estimation: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  "Pending Validation",
  "Pending Approval",
  "On Process",
  "On Hold",
  "Pending BAST",
  "Completed",
  "Rejected",
];

const statusBadge = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("reject"))
    return <Badge variant="destructive">{status}</Badge>;
  if (s.includes("completed"))
    return <Badge className="bg-green-500 text-white">{status}</Badge>;
  if (s.includes("hold"))
    return <Badge className="bg-orange-500 text-white">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

export default function MyMrPage() {
  const router = useRouter();
  const s = createClient();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MyMR[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
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
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(profile?.role ?? null);

      let q = s
        .from("material_requests")
        .select(
          "id, kode_mr, status, level, prioritas, department, cost_estimation, created_at",
        )
        .eq("userid", user.id)
        .order("created_at", { ascending: false });

      if (search) q = q.ilike("kode_mr", `%${search}%`);
      if (statusFilter) q = q.eq("status", statusFilter);

      const { data, error } = await q.limit(100);
      if (error) throw error;
      setRows((data ?? []) as MyMR[]);
    } catch (e: any) {
      toast.error("Gagal memuat MR Anda", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [s, router, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce pencarian.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <Content
      title="MR Saya"
      description="Daftar Material Request yang Anda buat."
      size="lg"
      className="col-span-12"
      cardAction={
        role === "requester" && (
          <Button asChild size="sm">
            <Link href="/material-request/buat">
              <Plus className="mr-2 h-4 w-4" /> Buat MR
            </Link>
          </Button>
        )
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari kode MR..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUS_OPTIONS.map((st) => (
              <SelectItem key={st} value={st}>
                {st}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">No</TableHead>
              <TableHead>Kode MR</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Departemen</TableHead>
              <TableHead>Estimasi</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : rows.length > 0 ? (
              rows.map((mr, i) => (
                <TableRow key={mr.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{mr.kode_mr}</TableCell>
                  <TableCell>{statusBadge(mr.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{mr.level || "OPEN 1"}</Badge>
                  </TableCell>
                  <TableCell>{mr.prioritas || "-"}</TableCell>
                  <TableCell>{mr.department || "-"}</TableCell>
                  <TableCell>
                    {formatCurrency(Number(mr.cost_estimation) || 0)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateFriendly(mr.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/material-request/${mr.id}`}>
                        <Eye className="mr-1 h-3.5 w-3.5" /> Detail
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  {loading ? (
                    <Skeleton className="h-6 w-full" />
                  ) : (
                    "Belum ada Material Request."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Content>
  );
}
