"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function InventoryDelete({ inventoryId, productName, variantName }: { inventoryId: string; productName: string; variantName: string | null }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const label = variantName ? `${productName} — ${variantName}` : productName;
    if (!window.confirm(`Delete the inventory record for ${label}? This removes only this stock record and its movement history, not the product. This action cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete inventory record.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete inventory record.");
    } finally {
      setDeleting(false);
    }
  }

  return <div className="flex flex-col items-start gap-1.5">
    <button type="button" onClick={() => void handleDelete()} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg border border-[#f0d8d5] px-3 py-2 text-xs font-semibold text-[#a34d4d] transition hover:bg-[#fff5f3] disabled:opacity-50">
      <Trash2 size={13} /> {deleting ? "Deleting..." : "Delete"}
    </button>
    {error && <p role="alert" className="max-w-[180px] text-[10px] leading-4 text-[#a34d4d]">{error}</p>}
  </div>;
}
