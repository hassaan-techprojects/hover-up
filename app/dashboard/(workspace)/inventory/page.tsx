import Link from "next/link";
import { prisma } from "@/lib/prisma";
import InventoryAdjustment from "@/components/dashboard/inventory-adjustment";
import InventoryDelete from "@/components/dashboard/inventory-delete";

export default async function InventoryPage() {
  const inventory = await prisma.inventory.findMany({
    include: {
      product: { select: { name: true, sku: true, slug: true } },
      variant: { select: { name: true, sku: true } },
      movements: { take: 1, orderBy: { createdAt: "desc" }, select: { type: true, quantity: true, createdAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStock = inventory.filter(item => item.quantity - item.reserved <= item.lowStockThreshold).length;
  return <div className="space-y-7">
    <header><p className="text-xs font-semibold tracking-[0.2em] text-[#a18c75]">CATALOGUE MANAGEMENT</p><h2 className="mt-2 text-3xl font-semibold">Inventory</h2><p className="mt-2 text-sm text-[#777]">Current stock levels and recent inventory activity.</p></header>
    <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><p className="text-sm text-[#777]">Inventory records</p><p className="mt-2 text-2xl font-semibold">{inventory.length}</p></div><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><p className="text-sm text-[#777]">Units on hand</p><p className="mt-2 text-2xl font-semibold">{totalUnits.toLocaleString("en-IN")}</p></div><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><p className="text-sm text-[#777]">Low stock items</p><p className="mt-2 text-2xl font-semibold">{lowStock.toLocaleString("en-IN")}</p></div></section>
    <section className="overflow-hidden rounded-2xl border border-[#ebe6de] bg-white"><div className="border-b border-[#eee] p-5"><h3 className="text-lg font-semibold">Stock overview</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#faf8f5] text-xs text-[#777]"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">On hand</th><th className="px-5 py-3">Reserved</th><th className="px-5 py-3">Available</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Adjust stock</th><th className="px-5 py-3">Actions</th></tr></thead><tbody className="divide-y divide-[#eee]">{inventory.map(item=>{const available=item.quantity-item.reserved;const low=available<=item.lowStockThreshold;return <tr key={item.id}><td className="px-5 py-4"><Link href={"/shop/"+item.product.slug} target="_blank" className="font-semibold hover:underline">{item.product.name}</Link>{item.variant?.name&&<p className="mt-1 text-xs text-[#888]">{item.variant.name}</p>}</td><td className="px-5 py-4 font-bold">{item.variant?.sku||item.product.sku||"—"}</td><td className="px-5 py-4">{item.quantity}</td><td className="px-5 py-4">{item.reserved}</td><td className="px-5 py-4 font-semibold">{available}</td><td className="px-5 py-4"><span className={"rounded-full px-3 py-1 text-xs font-semibold "+(low?"bg-[#fff1e8] text-[#a45b31]":"bg-[#edf5ed] text-[#47724b]")}>{low?"Low stock":"In stock"}</span></td><td className="px-5 py-4"><InventoryAdjustment inventoryId={item.id} quantity={item.quantity}/></td><td className="px-5 py-4"><InventoryDelete inventoryId={item.id} productName={item.product.name} variantName={item.variant?.name ?? null}/></td></tr>})}{inventory.length===0&&<tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[#888]">No inventory records have been created yet. New products will create stock records automatically.</td></tr>}</tbody></table></div></section>
  </div>;
}
