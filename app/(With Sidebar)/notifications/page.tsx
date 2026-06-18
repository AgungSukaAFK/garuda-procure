// src/app/(With Sidebar)/notifications/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  Bell,
  CheckCheck,
  MessageSquare,
  CheckCircle2,
  Info,
  Eye,
  Check,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Notification } from "@/type";

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
};

const NotifIcon = ({ type }: { type: Notification["type"] }) => {
  if (type === "mention")
    return (
      <div className="mt-1 rounded-full p-2 bg-orange-100 text-orange-600">
        <MessageSquare className="h-4 w-4" />
      </div>
    );
  if (type === "approval_mr" || type === "approval_po")
    return (
      <div className="mt-1 rounded-full p-2 bg-green-100 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
      </div>
    );
  return (
    <div className="mt-1 rounded-full p-2 bg-blue-100 text-blue-600">
      <Info className="h-4 w-4" />
    </div>
  );
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("notifications")
          .select("*, actor:profiles!actor_id(nama)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        setNotifications(
          (data ?? []).map((item: any) => ({
            ...item,
            actor_name: item.actor?.nama || "System",
            actor_avatar: item.actor?.avatar_url || null,
          })),
        );
      } catch (error: any) {
        toast.error("Gagal memuat notifikasi", { description: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (notif: Notification) => {
    if (notif.is_read) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
    );
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notif.id);
  };

  // View: tandai dibaca lalu buka tautannya (jika ada).
  const handleView = async (notif: Notification) => {
    await markAsRead(notif);
    if (notif.link) router.push(notif.link);
  };

  const handleDelete = async (notif: Notification) => {
    const prev = notifications;
    setNotifications((p) => p.filter((n) => n.id !== notif.id));
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notif.id);
    if (error) {
      setNotifications(prev); // rollback
      toast.error("Gagal menghapus notifikasi", { description: error.message });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      toast.success("Semua notifikasi ditandai sudah dibaca");
    } catch {
      toast.error("Gagal memproses permintaan");
    }
  };

  const handleDeleteAll = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const prev = notifications;
    setNotifications([]);
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);
    if (error) {
      setNotifications(prev); // rollback
      toast.error("Gagal menghapus semua notifikasi", {
        description: error.message,
      });
    } else {
      toast.success("Semua notifikasi dihapus");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="col-span-12 w-full space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="col-span-12 w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} belum dibaca
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Tandai semua dibaca
            </Button>
          )}
          {notifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus semua
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus semua notifikasi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Seluruh notifikasi Anda akan dihapus permanen dan tidak dapat
                    dikembalikan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll}>
                    Ya, Hapus Semua
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">Tidak ada notifikasi.</p>
            <p className="text-sm mt-1">
              Anda akan mendapat notifikasi saat ada aktivitas baru.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                "rounded-xl border bg-card p-4 shadow-sm transition-colors sm:p-5",
                !notif.is_read
                  ? "border-blue-200 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-900/10"
                  : // Sudah dibaca: tampil lebih pudar sebagai penanda.
                    "border-muted bg-muted/20 opacity-70 hover:opacity-100",
              )}
            >
              <div className="flex items-start gap-4">
                <NotifIcon type={notif.type} />

                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!notif.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <p className="text-sm font-semibold leading-snug">
                      {notif.title}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{formatDate(notif.created_at)}</span>
                    {notif.actor_name && notif.actor_name !== "System" && (
                      <>
                        <span>·</span>
                        <span>
                          dari{" "}
                          <span className="font-medium">{notif.actor_name}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tombol aksi */}
              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
                {notif.link && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(notif)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Lihat
                  </Button>
                )}
                {!notif.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead(notif)}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Tandai dibaca
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(notif)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
