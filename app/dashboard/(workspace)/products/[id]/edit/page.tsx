"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowUp, Save, RefreshCw, Image as ImageIcon } from "lucide-react";

type ProductImage = { id: string; url: string; altText: string | null; isPrimary: boolean; sortOrder: number };
type Category = { id: string; name: string };
type Product = {
  id: string; name: string; slug: string; sku: string | null;
  price: string | number; comparePrice: string | number | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; isActive: boolean;
  images: ProductImage[];
  categories: { category: Category }[];
  variants: { id: string }[];
  inventories: { quantity: number }[];
};

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("0");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">("DRAFT");
  const [isActive, setIsActive] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        fetch(`/api/dashboard/products/${id}`, { cache: "no-store" }),
        fetch("/api/dashboard/categories", { cache: "no-store" }),
      ]);
      const [productData, categoryData] = await Promise.all([productResponse.json(), categoryResponse.json()]);
      if (!productResponse.ok) throw new Error(productData.error || "Unable to load product.");
      if (!categoryResponse.ok) throw new Error(categoryData.error || "Unable to load categories.");
      const item = productData.product as Product;
      setProduct(item);
      setCategories(categoryData.categories ?? []);
      setName(item.name);
      setSlug(item.slug);
      setSku(item.sku ?? "");
      setRegularPrice(String(item.comparePrice ?? item.price));
      setSalePrice(Number(item.price) < Number(item.comparePrice ?? item.price) ? String(item.price) : "");
      setStock(String(item.inventories?.[0]?.quantity ?? 0));
      setStatus(item.status);
      setIsActive(item.isActive);
      setCategoryIds(item.categories.map((entry) => entry.category.id));
      setImages(item.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load product.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const next = index + direction;
      if (next < 0 || next >= current.length) return current;
      const updated = [...current];
      [updated[index], updated[next]] = [updated[next], updated[index]];
      return updated.map((image, order) => ({ ...image, sortOrder: order, isPrimary: order === 0 }));
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/dashboard/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, slug, sku, regularPrice: Number(regularPrice),
          salePrice: salePrice ? Number(salePrice) : null,
          stock: product?.variants.length ? undefined : Number(stock),
          status, isActive, categoryIds, imageOrder: images.map((image) => image.id),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update product.");
      setProduct((current) => current ? { ...current, ...data.product, images } : current);
      setSuccess("Product updated successfully. The storefront will show the updated information.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update product.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-[1500px] animate-pulse space-y-4"><div className="h-10 w-64 rounded bg-[#eae6df]" /><div className="h-96 rounded-2xl bg-white" /></div>;
  if (!product) return <div className="rounded-2xl border border-[#ebe6de] bg-white p-8 text-sm text-[#777]">{error || "Product not found."}</div>;

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/products" className="mb-4 inline-flex items-center gap-2 text-xs text-[#817b72] hover:text-[#171717]"><ArrowLeft size={14} /> Back to products</Link>
          <p className="text-[10px] tracking-[0.2em] text-[#a18c75]">CATALOGUE MANAGEMENT</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#171717]">Edit product</h1>
          <p className="mt-1 text-xs text-[#888]">Update this product without creating a duplicate listing.</p>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#171717] px-5 text-xs font-semibold text-white hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50"><Save size={15} />{saving ? "Saving changes..." : "Update product"}</button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg border border-[#dce9dc] bg-[#f1f7f0] p-3 text-xs text-[#47724b]">{success}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-7">
            <h2 className="text-sm font-semibold text-[#171717]">Product information</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-[#6f675e] sm:col-span-2">Product name<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#e8e3dc] px-3 text-sm text-[#171717] outline-none focus:border-[#b99a76]" /></label>
              <label className="text-xs text-[#6f675e] sm:col-span-2">Permalink / slug<input value={slug} onChange={(e) => setSlug(e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} className="mt-2 h-11 w-full rounded-lg border border-[#e8e3dc] px-3 text-sm text-[#171717] outline-none focus:border-[#b99a76]" /><span className="mt-1 block text-[10px] text-[#aaa]">Storefront URL: /shop/{slug}</span></label>
              <label className="text-xs text-[#6f675e]">Product SKU<input value={sku} onChange={(e) => setSku(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#e8e3dc] px-3 text-sm text-[#171717] outline-none focus:border-[#b99a76]" /></label>
              <label className="text-xs text-[#6f675e]">Regular price (₹)<input type="number" min="0" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#e8e3dc] px-3 text-sm text-[#171717] outline-none focus:border-[#b99a76]" /></label>
              <label className="text-xs text-[#6f675e]">Sale price (₹)<input type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Leave blank for no sale" className="mt-2 h-11 w-full rounded-lg border border-[#e8e3dc] px-3 text-sm text-[#171717] outline-none focus:border-[#b99a76]" /></label>
              {!product.variants.length && <label className="text-xs text-[#6f675e]">Available stock<input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#e8e3dc] px-3 text-sm text-[#171717] outline-none focus:border-[#b99a76]" /></label>}
            </div>
            <div className="mt-5 rounded-xl bg-[#faf8f5] p-4"><p className="text-xs font-semibold text-[#51483f]">Shared product description</p><p className="mt-1 text-[11px] leading-5 text-[#888]">The common SEO description is automatically rendered on every product page, including this product. Edit the shared template once in the storefront component rather than rewriting it here.</p></div>
          </section>

          <section className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#171717]">Product images</h2><p className="mt-1 text-xs text-[#888]">Move images to change their display order and main image.</p></div><ImageIcon size={19} className="text-[#a18c75]" /></div>
            {images.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{images.map((image, index) => <div key={image.id} className="overflow-hidden rounded-xl border border-[#ebe6de]"><div className="relative aspect-square bg-[#f8f6f2]"><img src={image.url} alt={image.altText || name} className="h-full w-full object-contain" />{index === 0 && <span className="absolute left-2 top-2 rounded-full bg-[#171717] px-2.5 py-1 text-[9px] text-white">Main image</span>}</div><div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-[10px] text-[#777]">{image.altText || `Image ${index + 1}`}</span><div className="flex gap-1"><button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Move image earlier" className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e8e3dc] disabled:opacity-30"><ArrowUp size={13}/></button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} aria-label="Move image later" className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e8e3dc] disabled:opacity-30"><ArrowDown size={13}/></button></div></div></div>)}</div> : <p className="mt-5 text-xs text-[#999]">No product images have been uploaded.</p>}
          </section>

          <section className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-7">
            <h2 className="text-sm font-semibold text-[#171717]">Categories</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <label key={category.id} className="flex items-center gap-3 rounded-lg border border-[#eee9e2] p-3 text-xs text-[#51483f]"><input type="checkbox" checked={categoryIds.includes(category.id)} onChange={() => setCategoryIds((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])} className="h-4 w-4 accent-[#171717]" />{category.name}</label>)}</div>
            {!categories.length && <p className="mt-3 text-xs text-[#999]">No active categories are available.</p>}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#ebe6de] bg-white p-5">
            <h2 className="text-sm font-semibold text-[#171717]">Publish status</h2>
            <label className="mt-4 block text-xs text-[#6f675e]">Product status<select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="mt-2 h-11 w-full rounded-lg border border-[#e8e3dc] bg-white px-3 text-xs outline-none focus:border-[#b99a76]"><option value="DRAFT">Draft</option><option value="ACTIVE">Published</option><option value="ARCHIVED">Archived</option></select></label>
            <label className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-[#faf8f5] p-3 text-xs text-[#51483f]"><span>Visible on website</span><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[#171717]" /></label>
            <p className="mt-3 text-[10px] leading-5 text-[#999]">A product appears in the shop only when its status is Published and visibility is turned on.</p>
          </section>
          <section className="rounded-2xl border border-[#ebe6de] bg-white p-5">
            <h2 className="text-sm font-semibold text-[#171717]">Other product settings</h2>
            <Link href={`/dashboard/products/${id}/pricing`} className="mt-4 block rounded-lg border border-[#e8e3dc] px-3 py-3 text-xs text-[#51483f] hover:border-[#b99a76]">Configure pack pricing →</Link>
            <Link href="/dashboard/attributes" className="mt-2 block rounded-lg border border-[#e8e3dc] px-3 py-3 text-xs text-[#51483f] hover:border-[#b99a76]">Manage attributes and terms →</Link>
          </section>
          <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 text-xs font-semibold text-white hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50"><Save size={15}/>{saving ? "Saving..." : "Update product"}</button>
          <button type="button" onClick={() => void load()} disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#e8e3dc] text-xs text-[#6f675e] hover:border-[#b99a76]"><RefreshCw size={13}/> Reset changes</button>
        </aside>
      </div>
    </div>
  );
}
