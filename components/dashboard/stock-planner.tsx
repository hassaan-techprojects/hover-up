"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Minus, Save, Trash2, Package, RefreshCw } from "lucide-react";

const SIZE_KEYS = ["S", "M", "L", "XL", "XXL"] as const;
type SizeKey = (typeof SIZE_KEYS)[number];
type Sizes = Record<SizeKey, number>;
type Sheet = {
  id: string;
  name: string;
  packSize: number;
  sizes: Sizes;
  totalAmount: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const emptySizes = (): Sizes => ({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
const numberValue = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

function Summary({ sizes, packSize }: { sizes: Sizes; packSize: number }) {
  const total = SIZE_KEYS.reduce((sum, size) => sum + sizes[size], 0);
  const packs = Math.floor(total / packSize);
  const loose = total % packSize;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div className="rounded-xl bg-[#f7f4ef] p-3"><p className="text-[11px] text-[#82786d]">Total pieces</p><p className="mt-1 text-xl font-semibold tabular-nums">{total.toLocaleString("en-IN")}</p></div>
    <div className="rounded-xl bg-[#f7f4ef] p-3"><p className="text-[11px] text-[#82786d]">Pack total</p><p className="mt-1 text-xl font-semibold tabular-nums">{packs.toLocaleString("en-IN")} <span className="text-xs font-medium text-[#82786d]">packs of {packSize}</span></p></div>
    <div className="rounded-xl bg-[#f7f4ef] p-3"><p className="text-[11px] text-[#82786d]">Loose pieces</p><p className="mt-1 text-xl font-semibold tabular-nums">{loose.toLocaleString("en-IN")}</p></div>
    <div className="rounded-xl bg-[#f7f4ef] p-3"><p className="text-[11px] text-[#82786d]">Size breakdown</p><p className="mt-1 text-sm font-semibold tabular-nums">S {sizes.S} · M {sizes.M} · L {sizes.L} · XL {sizes.XL} · XXL {sizes.XXL}</p></div>
  </div>;
}

function SizeCounter({ size, value, onChange }: { size: SizeKey; value: number; onChange: (value: number) => void }) {
  return <div className="rounded-xl border border-[#eae4dc] bg-white p-3">
    <div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold">{size}</span><span className="text-xs text-[#8a8177]">pieces</span></div>
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Remove one ${size}`} onClick={() => onChange(Math.max(0, value - 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e8e1d8] text-[#554a3e] hover:bg-[#f7f4ef]"><Minus size={14}/></button>
      <input type="number" min="0" max="1000000" value={value} onChange={event => onChange(numberValue(event.target.value))} className="h-9 min-w-0 w-full rounded-lg border border-[#e8e1d8] text-center text-sm font-semibold outline-none focus:border-[#a98d6d]" />
      <button type="button" aria-label={`Add one ${size}`} onClick={() => onChange(Math.min(1000000, value + 1))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#171717] text-white hover:bg-[#4b4035]"><Plus size={14}/></button>
    </div>
  </div>;
}

export default function StockPlanner() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [packSize, setPackSize] = useState(2);
  const [sizes, setSizes] = useState<Sizes>(emptySizes());
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");

  const loadSheets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/stock-plans", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load stock sheets.");
      setSheets(data.sheets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load stock sheets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSheets(); }, [loadSheets]);

  const totalPieces = useMemo(() => SIZE_KEYS.reduce((sum, key) => sum + sizes[key], 0), [sizes]);

  async function createSheet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError("Enter a name for this stock sheet."); return; }
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/stock-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), packSize, sizes, totalAmount, notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create stock sheet.");
      setSheets(current => [data.sheet, ...current]);
      setName("");
      setPackSize(2);
      setSizes(emptySizes());
      setTotalAmount("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create stock sheet.");
    } finally {
      setCreating(false);
    }
  }

  async function saveSheet(sheet: Sheet) {
    setSavingId(sheet.id);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/stock-plans/${sheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sheet),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save stock sheet.");
      setSheets(current => current.map(item => item.id === sheet.id ? data.sheet : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save stock sheet.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteSheet(sheet: Sheet) {
    if (!window.confirm(`Delete the internal stock sheet "${sheet.name}"? This will not affect website inventory or orders.`)) return;
    setDeletingId(sheet.id);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/stock-plans/${sheet.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete stock sheet.");
      setSheets(current => current.filter(item => item.id !== sheet.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete stock sheet.");
    } finally {
      setDeletingId(null);
    }
  }

  function updateSheet(id: string, update: Partial<Sheet>) {
    setSheets(current => current.map(sheet => sheet.id === id ? { ...sheet, ...update } : sheet));
  }

  return <div className="space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold tracking-[0.2em] text-[#a18c75]">ADMIN ONLY · INTERNAL TOOL</p><h2 className="mt-2 text-3xl font-semibold">Stock Calculator</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#777]">A private stock-counting workspace for rough calculations. These numbers are separate from website inventory, product availability and customer orders.</p></div>
      <div className="flex items-center gap-2 rounded-full border border-[#eae4dc] bg-white px-3 py-2 text-xs font-medium text-[#756b60]"><Package size={14}/> Internal stock notes</div>
    </header>

    {error && <div role="alert" className="rounded-xl border border-[#f0d8d5] bg-[#fff7f5] px-4 py-3 text-sm text-[#a34d4d]">{error}</div>}

    <form onSubmit={createSheet} className="space-y-5 rounded-2xl border border-[#e9e2d8] bg-white p-5 sm:p-6">
      <div><h3 className="text-lg font-semibold">Create stock sheet</h3><p className="mt-1 text-xs text-[#82786d]">Create a separate sheet for a product, colour, batch or stock count.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-medium text-[#655b50]">Sheet name / product / batch
          <input value={name} onChange={event => setName(event.target.value)} maxLength={100} placeholder="e.g. Black Round Neck — November" className="h-11 w-full rounded-xl border border-[#e8e1d8] px-3 text-sm text-[#171717] outline-none focus:border-[#a98d6d]" />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[#655b50]">Pack size
          <select value={packSize} onChange={event => setPackSize(Number(event.target.value))} className="h-11 w-full rounded-xl border border-[#e8e1d8] bg-white px-3 text-sm text-[#171717] outline-none focus:border-[#a98d6d]">
            {Array.from({ length: 99 }, (_, index) => index + 2).map(value => <option key={value} value={value}>Pack of {value}</option>)}
          </select>
        </label>
      </div>
      <div><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Enter quantities by size</h4><span className="text-xs text-[#82786d]">Use + / − or type the exact quantity</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{SIZE_KEYS.map(size => <SizeCounter key={size} size={size} value={sizes[size]} onChange={value => setSizes(current => ({ ...current, [size]: value }))}/>)}</div>
      </div>
      <Summary sizes={sizes} packSize={packSize}/>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-medium text-[#655b50]">Total amount (₹) — optional
          <input type="number" min="0" step="0.01" value={totalAmount} onChange={event => setTotalAmount(event.target.value)} placeholder="0.00" className="h-11 w-full rounded-xl border border-[#e8e1d8] px-3 text-sm text-[#171717] outline-none focus:border-[#a98d6d]" />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[#655b50]">Notes — optional
          <input value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} placeholder="Any rough calculation notes" className="h-11 w-full rounded-xl border border-[#e8e1d8] px-3 text-sm text-[#171717] outline-none focus:border-[#a98d6d]" />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee9e2] pt-4">
        <p className="text-xs text-[#82786d]">Current count: <span className="font-semibold text-[#171717]">{totalPieces.toLocaleString("en-IN")} pieces</span></p>
        <button type="submit" disabled={creating} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#171717] px-5 text-sm font-semibold text-white transition hover:bg-[#4b4035] disabled:opacity-50"><Plus size={15}/>{creating ? "Creating..." : "Add stock sheet"}</button>
      </div>
    </form>

    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Saved stock sheets</h3><p className="mt-1 text-xs text-[#82786d]">Edit counts, adjust individual sizes, save changes or delete a sheet.</p></div><button type="button" onClick={() => void loadSheets()} className="inline-flex items-center gap-2 rounded-lg border border-[#e8e1d8] px-3 py-2 text-xs font-semibold text-[#62584d] hover:bg-white"><RefreshCw size={13}/> Refresh</button></div>
      {loading ? <div className="rounded-2xl border border-[#e9e2d8] bg-white p-10 text-center text-sm text-[#82786d]">Loading saved stock sheets...</div> : sheets.length === 0 ? <div className="rounded-2xl border border-dashed border-[#dcd3c7] bg-white p-10 text-center"><Package size={24} className="mx-auto text-[#a18c75]"/><p className="mt-3 text-sm font-semibold">No stock sheets yet</p><p className="mt-1 text-xs text-[#82786d]">Create your first internal stock sheet above.</p></div> : <div className="grid gap-4 xl:grid-cols-2">
        {sheets.map(sheet => <article key={sheet.id} className="space-y-4 rounded-2xl border border-[#e9e2d8] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[180px] flex-1"><label className="text-[11px] font-medium text-[#82786d]">Sheet name</label><input value={sheet.name} onChange={event => updateSheet(sheet.id, { name: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[#e8e1d8] px-3 text-sm font-semibold outline-none focus:border-[#a98d6d]"/></div>
            <label className="text-[11px] font-medium text-[#82786d]">Pack size<select value={sheet.packSize} onChange={event => updateSheet(sheet.id, { packSize: Number(event.target.value) })} className="mt-1 block h-10 rounded-lg border border-[#e8e1d8] bg-white px-3 text-sm">{Array.from({ length: 99 }, (_, index) => index + 2).map(value => <option key={value} value={value}>Pack of {value}</option>)}</select></label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{SIZE_KEYS.map(size => <SizeCounter key={size} size={size} value={sheet.sizes[size]} onChange={value => updateSheet(sheet.id, { sizes: { ...sheet.sizes, [size]: value } })}/>)}</div>
          <Summary sizes={sheet.sizes} packSize={sheet.packSize}/>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-medium text-[#82786d]">Total amount (₹)<input type="number" min="0" step="0.01" value={sheet.totalAmount ?? ""} onChange={event => updateSheet(sheet.id, { totalAmount: event.target.value || null })} className="mt-1 h-10 w-full rounded-lg border border-[#e8e1d8] px-3 text-sm text-[#171717] outline-none focus:border-[#a98d6d]"/></label>
            <label className="text-[11px] font-medium text-[#82786d]">Notes<input value={sheet.notes ?? ""} onChange={event => updateSheet(sheet.id, { notes: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-[#e8e1d8] px-3 text-sm text-[#171717] outline-none focus:border-[#a98d6d]"/></label>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-[#eee9e2] pt-3">
            <span className="self-center text-[11px] text-[#91877c]">Updated {new Date(sheet.updatedAt).toLocaleString("en-IN")}</span>
            <div className="flex gap-2"><button type="button" onClick={() => void deleteSheet(sheet)} disabled={deletingId === sheet.id || savingId === sheet.id} className="inline-flex items-center gap-1.5 rounded-lg border border-[#f0d8d5] px-3 py-2 text-xs font-semibold text-[#a34d4d] hover:bg-[#fff5f3] disabled:opacity-50"><Trash2 size={13}/>{deletingId === sheet.id ? "Deleting..." : "Delete"}</button><button type="button" onClick={() => void saveSheet(sheet)} disabled={savingId === sheet.id || deletingId === sheet.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[#171717] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4b4035] disabled:opacity-50"><Save size={13}/>{savingId === sheet.id ? "Saving..." : "Save changes"}</button></div>
          </div>
        </article>)}
      </div>}
    </section>
    <p className="text-center text-[11px] text-[#92887e]">Internal admin calculation only. Changes here never update website stock, product variants, storefront availability or customer orders.</p>
  </div>;
}
