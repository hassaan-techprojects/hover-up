"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

type Product = {
  id: string; name: string; slug: string; sku: string | null; description: string | null;
  price: string | number; comparePrice: string | number | null; status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isActive: boolean; images: { id: string; url: string; altText: string | null; isPrimary: boolean }[];
  categories: { category: { id: string; name: string } }[];
};

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [status, setStatus] = useState<Product["status"]>("DRAFT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/dashboard/products/${params.id}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load product.");
        if (!active) return;
        const item = data.product as Product;
        setProduct(item);
        setName(item.name);
        setSlug(item.slug);
        setSku(item.sku ?? "");
        setDescription(item.description ?? "");
        setPrice(String(item.price));
        setComparePrice(item.comparePrice == null ? "" : String(item.comparePrice));
        setStatus(item.status);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load product.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [params.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, sku, description, price, comparePrice, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save product.");
      router.push("/dashboard/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard/products" className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black">
          <ArrowLeft size={16} /> Back to Products
        </Link>
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Catalogue Management</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#171717]">Edit Product</h1>
          <p className="mt-2 text-sm text-gray-500">Update product information, pricing and visibility.</p>
        </div>

        {loading ? <div className="rounded-xl border border-[#e9e7e2] bg-white p-8 text-sm text-gray-500">Loading product details...</div>
        : error && !product ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        : product && <form onSubmit={save} className="space-y-6">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-7">
            <h2 className="mb-5 text-base font-semibold text-[#171717]">Product information</h2>
            {product.images.length > 0 && <div className="mb-6 flex flex-wrap gap-3">{product.images.map(image => <img key={image.id} src={image.url} alt={image.altText || name} className="h-24 w-24 rounded-lg border border-gray-200 object-contain bg-white" />)}</div>}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm text-gray-700">Product name
                <input required value={name} onChange={e => setName(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-gray-500" />
              </label>
              <label className="block text-sm text-gray-700">Product URL / slug
                <input required value={slug} onChange={e => setSlug(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-gray-500" />
              </label>
              <label className="block text-sm text-gray-700">SKU
                <input value={sku} onChange={e => setSku(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-gray-500" />
              </label>
              <label className="block text-sm text-gray-700">Selling price (₹)
                <input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-gray-500" />
              </label>
              <label className="block text-sm text-gray-700">Regular / compare-at price (₹)
                <input type="number" min="0" step="0.01" value={comparePrice} onChange={e => setComparePrice(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-gray-500" />
                <span className="mt-1 block text-xs text-gray-400">Leave blank if there is no discounted price.</span>
              </label>
              <label className="block text-sm text-gray-700">Status
                <select value={status} onChange={e => setStatus(e.target.value as Product["status"])} className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 outline-none focus:border-gray-500">
                  <option value="DRAFT">Draft</option><option value="ACTIVE">Published</option><option value="ARCHIVED">Archived</option>
                </select>
              </label>
            </div>
            <label className="mt-5 block text-sm text-gray-700">Description
              <textarea rows={8} value={description} onChange={e => setDescription(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-200 p-3 outline-none focus:border-gray-500" />
            </label>
          </section>
          {product.categories.length > 0 && <p className="text-xs text-gray-500">Current categories: {product.categories.map(item => item.category.name).join(", ")}</p>}
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/products" className="inline-flex h-11 items-center rounded-lg border border-gray-300 bg-white px-5 text-sm">Cancel</Link>
            <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#171717] px-6 text-sm font-medium text-white hover:bg-black disabled:opacity-50">
              <Save size={16} /> {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>}
      </div>
    </main>
  );
}
