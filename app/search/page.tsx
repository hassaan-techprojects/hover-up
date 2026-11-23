"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type Product = {
  id: string; name: string; slug: string; sku: string | null;
  price: number | string; images: { url: string; isPrimary: boolean; sortOrder: number }[];
  categories: { category: { name: string } }[];
  attributes: { attributeValue: { value: string; attribute: { name: string } } }[];
};

function Results() {
  const params = useSearchParams();
  const initialQuery = params.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load products.");
        if (active) setProducts(Array.isArray(data.products) ? data.products : []);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load products.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return products.filter((product) => {
      const searchable = [
        product.name,
        product.sku || "",
        ...product.categories.map((item) => item.category.name),
        ...product.attributes.flatMap((item) => [
          item.attributeValue.value,
          item.attributeValue.attribute.name,
        ]),
      ].join(" ").toLocaleLowerCase();
      return searchable.includes(term);
    });
  }, [products, query]);

  return (
    <main className="min-h-[65vh] bg-[#faf9f7] px-5 py-12 text-[#171717] md:py-16">
      <div className="mx-auto max-w-[1100px]">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">FIND YOUR PRODUCT</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Search</h1>
        <form action="/search" method="get" className="mt-7 flex max-w-2xl items-center gap-3 rounded-xl border border-[#e7e1d8] bg-white p-2 shadow-sm">
          <Search size={18} className="ml-2 shrink-0 text-[#9a8b79]" />
          <input name="q" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by product name, category, colour or attribute..." className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <button className="h-11 rounded-lg bg-[#171717] px-5 text-xs font-semibold tracking-wide text-white transition hover:bg-[#b99a76] hover:text-[#171717]">SEARCH</button>
        </form>

        <div className="mt-8 flex items-center justify-between border-b border-[#e8e3dc] pb-4">
          <p className="text-xs text-[#777]">{!query.trim() ? "Enter a search term to find products." : loading ? "Searching products..." : `${matches.length} matching product(s)`}</p>
        </div>
        {error && <p role="alert" className="mt-5 rounded-lg bg-[#fff3f1] p-4 text-sm text-[#a34d4d]">{error}</p>}
        {query.trim() && !loading && !error && matches.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-[#ded7cd] bg-white px-5 py-16 text-center">
            <Search size={28} className="mx-auto text-[#b99a76]" />
            <h2 className="mt-4 text-base font-semibold">No products found</h2>
            <p className="mt-2 text-sm text-[#888]">Try another product name, category, colour or attribute.</p>
          </div>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((product) => {
            const image = [...product.images].sort((a,b) => Number(b.isPrimary)-Number(a.isPrimary) || a.sortOrder-b.sortOrder)[0]?.url;
            return (
              <article key={product.id} className="overflow-hidden rounded-xl border border-[#e9e4dc] bg-white">
                <Link href={`/shop/${product.slug}`} className="block aspect-[4/3] overflow-hidden bg-[#f0ede8]">
                  {image ? <img src={image} alt={product.name} className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs text-[#999]">NO IMAGE</div>}
                </Link>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#9a8b79]">{product.categories.map((item) => item.category.name).join(" · ") || "HOVER UP"}</p>
                  <Link href={`/shop/${product.slug}`} className="mt-2 block text-sm font-semibold hover:text-[#8b7054]">{product.name}</Link>
                  <p className="mt-2 text-sm font-semibold">₹{Number(product.price).toLocaleString("en-IN")}</p>
                  <p className="mt-2 line-clamp-1 text-[10px] text-[#999]">{product.attributes.map((item) => item.attributeValue.value).join(" · ")}</p>
                  <Link href={`/shop/${product.slug}`} className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-[#8b7054]">VIEW PRODUCT <ArrowRight size={13}/></Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return <><StorefrontHeader /><Suspense fallback={<main className="min-h-[65vh] bg-[#faf9f7] px-5 py-16 text-center text-sm text-[#888]">Loading search...</main>}><Results /></Suspense><StorefrontFooter /></>;
}
