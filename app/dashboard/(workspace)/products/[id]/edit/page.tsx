"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Save, Trash2, X } from "lucide-react";

type ProductImage = { id: string; url: string; altText: string | null; isPrimary: boolean; sortOrder: number };
type Category = { id: string; name: string; slug: string };
type Product = {
  id: string; name: string; slug: string; description: string | null; sku: string | null;
  price: string; comparePrice: string; stock: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  metaTitle: string | null; metaDescription: string | null; isFeatured: boolean;
  images: ProductImage[]; categoryIds: string[]; hasVariants: boolean;
};
type NewImage = { file: File; preview: string; altText: string };

const inputClass = "mt-2 h-11 w-full rounded-lg border border-[#e7e4de] bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#9a8b78]";
const labelClass = "block text-sm font-medium text-[#292929]";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("0");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">("DRAFT");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [productResponse, categoryResponse] = await Promise.all([
          fetch(`/api/dashboard/products/${productId}`, { cache: "no-store" }),
          fetch("/api/dashboard/categories", { cache: "no-store" }),
        ]);
        const [productData, categoryData] = await Promise.all([productResponse.json(), categoryResponse.json()]);
        if (!productResponse.ok) throw new Error(productData.error || "Unable to load this product.");
        if (!categoryResponse.ok) throw new Error(categoryData.error || "Unable to load categories.");
        if (!active) return;
        const item: Product = productData.product;
        setProduct(item);
        setCategories(categoryData.categories ?? []);
        setName(item.name);
        setSlug(item.slug);
        setDescription(item.description ?? "");
        setSku(item.sku ?? "");
        setRegularPrice(item.comparePrice || item.price);
        setSalePrice(item.comparePrice ? item.price : "");
        setStock(String(item.stock ?? 0));
        setStatus(item.status);
        setMetaTitle(item.metaTitle ?? "");
        setMetaDescription(item.metaDescription ?? "");
        setIsFeatured(Boolean(item.isFeatured));
        setSelectedCategories(item.categoryIds ?? []);
        setImages(item.images ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load product.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [productId]);

  const totalImages = images.length + newImages.length;
  const formattedPrice = useMemo(() => {
    const amount = Number(salePrice || regularPrice || 0);
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
  }, [regularPrice, salePrice]);

  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (files.some((file) => !allowed.includes(file.type))) {
      setError("Only JPG, PNG and WEBP images are allowed.");
      event.target.value = "";
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) {
      setError("Each image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    if (totalImages + files.length > 20) {
      setError("You can keep a maximum of 20 product images.");
      event.target.value = "";
      return;
    }
    setError("");
    setNewImages((current) => [...current, ...files.map((file) => ({
      file, preview: URL.createObjectURL(file), altText: file.name.replace(/\.[^/.]+$/, ""),
    }))]);
    event.target.value = "";
  }

  function removeNewImage(index: number) {
    setNewImages((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function toggleCategory(id: string) {
    setSelectedCategories((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !slug.trim()) return setError("Product title and permalink are required.");
    if (!regularPrice || Number(regularPrice) < 0) return setError("Enter a valid regular price.");
    if (salePrice && (Number(salePrice) < 0 || Number(salePrice) > Number(regularPrice))) return setError("Sale price cannot exceed regular price.");
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) return setError("Enter a valid stock quantity.");

    setSaving(true);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("slug", slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""));
      form.set("description", description);
      form.set("sku", sku);
      form.set("regularPrice", regularPrice);
      form.set("salePrice", salePrice);
      form.set("stock", stock);
      form.set("status", status);
      form.set("categoryIds", JSON.stringify(selectedCategories));
      form.set("existingImages", JSON.stringify(images.map((image, index) => ({
        id: image.id, altText: image.altText ?? "", isPrimary: image.isPrimary, sortOrder: index,
      }))));
      form.set("newImages", JSON.stringify(newImages.map((image) => ({ altText: image.altText }))));
      form.set("metaTitle", metaTitle);
      form.set("metaDescription", metaDescription);
      form.set("isFeatured", String(isFeatured));
      newImages.forEach((image) => form.append("productImages", image.file));

      const response = await fetch(`/api/dashboard/products/${productId}`, { method: "PUT", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update product.");
      router.push("/dashboard/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update product.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#f8f7f4] p-8"><div className="mx-auto max-w-5xl animate-pulse rounded-xl bg-white p-8"><div className="h-7 w-48 rounded bg-gray-200" /><div className="mt-8 h-64 rounded bg-gray-100" /></div></div>;
  if (!product && error) return <main className="min-h-screen bg-[#f8f7f4] p-6"><div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6"><p className="text-sm text-red-700">{error}</p><Link href="/dashboard/products" className="mt-4 inline-flex text-sm underline">Back to Products</Link></div></main>;

  return (
    <main className="min-h-screen bg-[#f8f7f4] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Link href="/dashboard/products" className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"><ArrowLeft size={16} /> Back to Products</Link>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Catalogue Management</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#171717]">Edit Product</h1>
            <p className="mt-2 text-sm text-gray-500">Update the existing product. Your changes will replace its current store details.</p>
          </div>
          <div className="rounded-lg border border-[#e8e4dc] bg-white px-4 py-3 text-sm"><span className="text-gray-500">Current display price</span><p className="mt-1 text-lg font-semibold">{formattedPrice}</p></div>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <form onSubmit={save} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold">Product information</h2>
              <p className="mt-1 text-xs text-gray-500">Edit the product title, permalink and description.</p>
              <div className="mt-5 space-y-5">
                <label className={labelClass}>Product title<input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></label>
                <label className={labelClass}>Permalink<div className="mt-2 flex h-11 overflow-hidden rounded-lg border border-[#e7e4de]"><span className="flex items-center border-r border-[#e7e4de] bg-[#faf9f7] px-3 text-xs text-gray-500">/products/</span><input className="min-w-0 flex-1 px-3 text-sm outline-none" value={slug} onChange={(e) => setSlug(e.target.value)} required /></div></label>
                <label className={labelClass}>SKU<input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Product SKU" /></label>
                <label className={labelClass}>Description<textarea className="mt-2 min-h-40 w-full rounded-lg border border-[#e7e4de] p-3 text-sm outline-none focus:border-[#9a8b78]" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
              </div>
            </section>

            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold">Pricing and inventory</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>Regular price (₹)<input className={inputClass} type="number" min="0" step="0.01" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} required /></label>
                <label className={labelClass}>Sale price (₹)<input className={inputClass} type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Leave blank for no sale" /></label>
                <label className={labelClass}>Stock quantity<input className={inputClass} type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} disabled={product?.hasVariants} /></label>
                {product?.hasVariants && <p className="self-end text-xs text-amber-700">This product has variations. Variant stock is preserved and must be managed in the variations section.</p>}
              </div>
            </section>

            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Product images</h2><p className="mt-1 text-xs text-gray-500">Existing images stay attached unless you remove them.</p></div><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#e7e4de] px-3 text-sm hover:bg-gray-50"><ImagePlus size={16} /> Add images<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages} /></label></div>
              {totalImages === 0 ? <div className="mt-5 rounded-lg border border-dashed border-[#dcd8d0] p-10 text-center text-sm text-gray-500">No product images. Add images to display this product in your store.</div> : <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {images.map((image) => <div key={image.id} className="overflow-hidden rounded-lg border border-[#e9e7e2]">
                  <div className="relative aspect-square bg-[#f7f6f3]"><img src={image.url} alt={image.altText || name} className="h-full w-full object-contain" /><button type="button" onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))} className="absolute right-2 top-2 rounded-full bg-white p-2 text-red-600 shadow" aria-label="Remove image"><X size={15} /></button>{image.isPrimary && <span className="absolute bottom-2 left-2 rounded bg-black px-2 py-1 text-[10px] text-white">Primary</span>}</div>
                  <div className="p-2"><button type="button" onClick={() => setImages((current) => current.map((item) => ({ ...item, isPrimary: item.id === image.id })))} className="text-xs text-gray-600 underline">Set as primary</button></div>
                </div>)}
                {newImages.map((image, index) => <div key={image.preview} className="overflow-hidden rounded-lg border border-[#e9e7e2]"><div className="relative aspect-square bg-[#f7f6f3]"><img src={image.preview} alt={image.altText} className="h-full w-full object-contain" /><button type="button" onClick={() => removeNewImage(index)} className="absolute right-2 top-2 rounded-full bg-white p-2 text-red-600 shadow" aria-label="Remove image"><X size={15} /></button></div><div className="p-2"><input className="w-full text-xs outline-none" value={image.altText} onChange={(e) => setNewImages((current) => current.map((item, i) => i === index ? { ...item, altText: e.target.value } : item))} placeholder="Image alt text" /></div></div>)}
              </div>}
              <p className="mt-3 text-xs text-gray-400">JPG, PNG or WEBP · Maximum 5 MB each · Up to 20 images</p>
            </section>

            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold">Search engine details</h2>
              <div className="mt-5 space-y-5">
                <label className={labelClass}>Meta title<input className={inputClass} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} /></label>
                <label className={labelClass}>Meta description<textarea className="mt-2 min-h-24 w-full rounded-lg border border-[#e7e4de] p-3 text-sm outline-none focus:border-[#9a8b78]" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} /></label>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5">
              <h2 className="text-base font-semibold">Publish</h2>
              <label className={labelClass + " mt-5"}>Product status<select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as Product["status"])}><option value="DRAFT">Draft</option><option value="ACTIVE">Published</option><option value="ARCHIVED">Archived</option></select></label>
              <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 accent-black" /> Featured product</label>
              <button type="submit" disabled={saving} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white hover:bg-black disabled:opacity-60"><Save size={16} />{saving ? "Updating..." : "Update Product"}</button>
              <Link href="/dashboard/products" className="mt-3 flex h-10 items-center justify-center rounded-lg border border-[#e7e4de] text-sm text-gray-600 hover:bg-gray-50">Cancel</Link>
            </section>

            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5">
              <h2 className="text-base font-semibold">Categories</h2>
              <p className="mt-1 text-xs text-gray-500">Choose where this product appears.</p>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
                {categories.length === 0 ? <p className="text-sm text-gray-400">No categories available.</p> : categories.map((category) => <label key={category.id} className="flex cursor-pointer items-center gap-3 text-sm text-gray-700"><input type="checkbox" checked={selectedCategories.includes(category.id)} onChange={() => toggleCategory(category.id)} className="h-4 w-4 accent-black" />{category.name}</label>)}
              </div>
            </section>
          </aside>
        </form>
      </div>
    </main>
  );
}
