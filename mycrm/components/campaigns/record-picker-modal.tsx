"use client";
import { useEffect, useState } from "react";
import { Search, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface RecordRow { id: string; data: Record<string, any>; [key: string]: any }

export function RecordPickerModal({ open, onClose, moduleId, displayField, initialSelected, onConfirm }: {
  open: boolean;
  onClose: () => void;
  moduleId: string;
  displayField?: string;
  initialSelected: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  useEffect(() => {
    if (!open || !moduleId) return;
    setLoading(true);
    api.get(`/modules/${moduleId}/records`, { params: { page: 1, limit: 500, search } })
      .then(r => setRecords(r.data?.data ?? []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [open, moduleId, search]);

  useEffect(() => { if (open) setSelected(new Set(initialSelected)); }, [open]); // eslint-disable-line

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const label = (r: RecordRow) => {
    if (displayField && r.data?.[displayField]) return String(r.data[displayField]);
    const firstValue = Object.values(r.data ?? {}).find(v => typeof v === "string" && v);
    return firstValue ? String(firstValue) : r.id;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select records ({selected.size} selected)</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-9 h-9" />
        </div>

        <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : records.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">No records found</p>
          ) : records.map(r => {
            const isSelected = selected.has(r.id);
            return (
              <button key={r.id} onClick={() => toggle(r.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                  isSelected ? "bg-brand border-brand" : "border-gray-300"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-gray-700 truncate">{label(r)}</span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onConfirm([...selected]); onClose(); }}>
            Use {selected.size} record{selected.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
