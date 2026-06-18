// src/app/(With Sidebar)/purchase-order/BarangSearchCombobox.tsx

"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchBarang } from "@/services/purchaseOrderService";
import { Barang } from "@/type";

interface BarangSearchComboboxProps {
  onSelect: (barang: Barang) => void;
}

export function BarangSearchCombobox({ onSelect }: BarangSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<Barang[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      searchBarang(searchQuery).then(setResults);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Tutup saat klik di luar.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Dropdown dirender INLINE (bukan portal) agar tidak terblokir scroll-lock
  // Dialog — sehingga daftar barang bisa di-scroll meski di dalam dialog.
  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        Cari Part Number / Nama Barang...
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Ketik untuk mencari..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              autoFocus
            />
            <CommandList className="max-h-[260px] overflow-y-auto">
              <CommandEmpty>Barang tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                {results.map((barang) => (
                  <CommandItem
                    key={barang.id}
                    value={`${barang.part_number} - ${barang.part_name}`}
                    onSelect={() => {
                      onSelect(barang);
                      setSearchQuery("");
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{barang.part_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {barang.part_number}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
