"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, Trash2 } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  images: { url: string; isPrimary: boolean; sortOrder: number }[];
};

const WISHLIST_STORAGE_KEY = "hover-up-wishlist";

function money(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function readWishlistIds(): string[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]"
    );
    return Array.isArray(stored)
      ? [...new Set(stored.filter((id): id is string => typeof id === "string"))]
      : [];
  } catch {
    return [];
  }
}

export default function WishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const ids = readWishlistIds();
      if (!ids.length) {
        setProducts([]);
        return;
      }

      const response = await fetch("/api/products", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load wishlist products.");
      }

      const availableProducts = (data.products as Product[]) ?? [];
      const productsById = new Map(
        availableProducts.map((product) => [product.id, product])
      );

      // Preserve the exact order in which the customer saved products.
      setProducts(
        ids
          .map((id) => productsById.get(id))
          .filter((product): product is Product => Boolean(product))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load wishlist products."
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWishlist();

    const refresh = () => void loadWishlist();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("hover-up-wishlist-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("hover-up-wishlist-updated", refresh);
    };
  }, [loadWishlist]);

  function remove(productId: string) {
    const updated = readWishlistIds().filter((id) => id !== productId);
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    setProducts((current) =>
      current.filter((product) => product.id !== productId)
    );
    window.dispatchEvent(new Event("hover-up-wishlist-updated"));
  }

  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-[#faf9f7] px-5 py-12 text-[#171717] md:px-10 md:py-16">
        <div className="mx-auto max-w-[1250px]">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">
            SAVED FOR LATER
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">My wishlist</h1>
              <p className="mt-2 text-sm text-[#888]">
                {products.length} saved product(s)
              </p>
            </div>
            <Link
              href="/shop"
              className="hidden text-xs font-semibold text-[#8b7054] underline sm:block"
            >
              Continue shopping
            </Link>
          </div>

          {loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="aspect-[3/4] animate-pulse rounded-2xl bg-[#efede9]"
                />
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="mt-8 rounded-2xl border border-red-200 bg-white px-6 py-12 text-center"
            >
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => void loadWishlist()}
                className="mt-5 rounded-lg bg-[#171717] px-5 py-3 text-xs font-semibold text-white"
              >
                TRY AGAIN
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[#e9e4dc] bg-white px-6 py-16 text-center">
              <Heart size={32} className="mx-auto text-[#b99a76]" />
              <h2 className="mt-4 text-lg font-semibold">Your wishlist is empty</h2>
              <p className="mt-2 text-sm text-[#888]">
                Tap the heart on a product to save it here.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#171717] px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#b99a76] hover:text-[#171717]"
              >
                EXPLORE PRODUCTS <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const image = [...product.images].sort(
                  (a, b) =>
                    Number(b.isPrimary) - Number(a.isPrimary) ||
                    a.sortOrder - b.sortOrder
                )[0]?.url;

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-[#e9e4dc] bg-white"
                  >
                    <Link
                      href={`/shop/${product.slug}`}
                      className="block aspect-[4/5] bg-[#f2f0ec]"
                    >
                      {image && (
                        <img
                          src={image}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                        />
                      )}
                    </Link>
                    <div className="p-4">
                      <Link
                        href={`/shop/${product.slug}`}
                        className="line-clamp-2 text-sm font-semibold hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-2 text-sm font-bold">
                        {money(product.price)}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <Link
                          href={`/shop/${product.slug}`}
                          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#171717] px-3 text-[10px] font-semibold tracking-wide text-white transition hover:bg-[#b99a76] hover:text-[#171717]"
                        >
                          VIEW PRODUCT <ArrowRight size={13} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(product.id)}
                          aria-label={`Remove ${product.name} from wishlist`}
                          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e8e3dc] text-[#999] transition hover:border-[#d7b7a7] hover:text-[#a34d4d]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
