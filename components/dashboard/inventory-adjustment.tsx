"use client";

import { useState } from "react";
import { Save } from "lucide-react";

export default function InventoryAdjustment({ inventoryId, quantity }: { inventoryId: string; quantity: number }) {
  const [nextQuantity, setNextQuantity] = useState(String(quantity));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/dashboard/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inventoryId, quantity: Number(nextQuantity), note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update stock.");
      setMessage("Saved");
      window.location.reload();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update stock."); }
    finally { setSaving(false); }
  }

  return <div className="min-w-[190px] space-y-1"><div className="flex items-center gap-2"><input aria-label="New stock quantity" type="number" min="0" step="1" value={nextQuantity} onChange={event=>setNextQuantity(event.target.value)} className="h-9 w-20 rounded-md border border-[#e5dfd6] px-2 text-sm"/><button type="button" onClick={()=>void save()} disabled={saving||nextQuantity.trim()===""||!Number.isInteger(Number(nextQuantity))||Number(nextQuantity)<0} className="inline-flex h-9 items-center gap-1 rounded-md bg-[#171717] px-3 text-xs font-semibold text-white disabled:opacity-50"><Save size={13}/>{saving?"Saving":"Save"}</button></div><input value={note} onChange={event=>setNote(event.target.value)} placeholder="Adjustment note (optional)" className="h-8 w-full rounded-md border border-[#eee] px-2 text-xs"/>{error&&<p className="text-xs text-red-600">{error}</p>}{message&&<p className="text-xs text-green-700">{message}</p>}</div>;
}
