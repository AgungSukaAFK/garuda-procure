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
import { Loader2, PenLine } from "lucide-react";
import { SignatureSelector } from "@/components/signature/signature-selector";
import { POItem, ReceiptItem } from "@/type";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: POItem[];
  saving?: boolean;
  confirmLabel?: string;
  // Item referensi (mis. hasil GR) untuk dibandingkan saat BAST.
  referenceItems?: ReceiptItem[];
  referenceLabel?: string;
  onConfirm: (payload: {
    items: ReceiptItem[];
    signature: { image_url: string; printed_name: string };
  }) => void;
}

export function ReceiptChecklistDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  saving,
  confirmLabel = "Tanda Tangani & Simpan",
  referenceItems,
  referenceLabel = "Diterima GA",
  onConfirm,
}: Props) {
  const [checks, setChecks] = useState<Record<string, ReceiptItem>>({});
  const [sigOpen, setSigOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, ReceiptItem> = {};
    items.forEach((it) => {
      const ref = referenceItems?.find((r) => r.part_number === it.part_number);
      init[it.part_number] = {
        part_number: it.part_number,
        name: it.name,
        qty: it.qty,
        qty_received: ref ? ref.qty_received : it.qty,
        received: ref ? ref.received : true,
        note: "",
      };
    });
    setChecks(init);
  }, [open, items, referenceItems]);

  const update = (pn: string, patch: Partial<ReceiptItem>) =>
    setChecks((prev) => ({ ...prev, [pn]: { ...prev[pn], ...patch } }));

  const handleVerified = (sig: {
    image_url: string;
    printed_name: string;
  }) => {
    onConfirm({ items: Object.values(checks), signature: sig });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Checklist barang diterima
            </p>
            {Object.values(checks).map((it) => {
              const ref = referenceItems?.find(
                (r) => r.part_number === it.part_number,
              );
              return (
                <div key={it.part_number} className="rounded-md border p-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={it.received}
                      onChange={(e) =>
                        update(it.part_number, { received: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {it.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {it.part_number}
                      </p>
                      {ref && (
                        <p className="text-xs text-blue-600">
                          {referenceLabel}: {ref.qty_received} (
                          {ref.received ? "diterima" : "tidak"})
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Input
                        type="number"
                        min={0}
                        value={it.qty_received}
                        onChange={(e) =>
                          update(it.part_number, {
                            qty_received: Number(e.target.value),
                          })
                        }
                        className="h-7 w-16"
                      />
                      <span className="whitespace-nowrap text-muted-foreground">
                        / {it.qty}
                      </span>
                    </div>
                  </div>
                  <Input
                    placeholder="Catatan (opsional)"
                    value={it.note ?? ""}
                    onChange={(e) =>
                      update(it.part_number, { note: e.target.value })
                    }
                    className="mt-2 h-7 text-xs"
                  />
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Tidak ada item pada PO ini.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={() => setSigOpen(true)}
              disabled={saving || items.length === 0}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="mr-2 h-4 w-4" />
              )}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignatureSelector
        open={sigOpen}
        onOpenChange={setSigOpen}
        onVerified={handleVerified}
      />
    </>
  );
}
