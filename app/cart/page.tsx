"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type CartEntry = {
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  variantName: string | null;
  packSize?: number;
  color?: string;
  sizeBreakdown?: { size: string; quantity: number; variantId: string | null }[];
  frontImageUrl?: string;
  backImageUrl?: string;
  textOnlyDesign?: boolean;
  customizationNotes?: string;
};

const CART_STORAGE_KEY = "hover-up-cart";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CartPage() {
  const [items, setItems] = useState<CartEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      setItems(stored ? JSON.parse(stored) as CartEntry[] : []);
    } catch {
      setItems([]);
    } finally {
      setReady(true);
    }
  }, []);

  function save(next: CartEntry[]) {
    setItems(next);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  }

  function removeItem(index: number) {
    save(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function updatePackCount(index: number, change: number) {
    const next = [...items];
    const item = next[index];
    const current = item.packSize ?? item.quantity;
    const updated = Math.max(1, current + change);
    next[index] = { ...item, packSize: updated, quantity: updated };
    save(next);
  }

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + Number(item.price) * (item.packSize ? 1 : item.quantity), 0),
    [items]
  );

  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-[#faf9f7] px-5 py-12 text-[#171717] md:px-10 md:py-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="mb-9 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#a18c75]">YOUR SELECTION</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Shopping bag</h1>
              <p className="mt-2 text-sm text-[#777]">{ready ? `${items.length} configured item(s)` : "Loading your bag..."}</p>
            </div>
            <Link href="/shop" className="hidden items-center gap-2 text-xs text-[#6d6257] transition hover:text-black sm:inline-flex">
              <ArrowLeft size={15} /> Continue shopping
            </Link>
          </div>

          {!ready ? (
            <div className="h-48 animate-pulse rounded-2xl bg-[#efede9]" />
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-[#e9e4dc] bg-white px-6 py-16 text-center">
              <ShoppingBag className="mx-auto text-[#b99a76]" size={34} strokeWidth={1.4} />
              <h2 className="mt-5 text-xl font-semibold">Your bag is empty</h2>
              <p className="mt-2 text-sm text-[#777]">Explore the collection and add a product to get started.</p>
              <Link href="/shop" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#171717] px-6 py-3 text-xs font-semibold tracking-wide text-white transition hover:bg-[#b99a76] hover:text-[#171717]">
                EXPLORE PRODUCTS <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <section className="space-y-4">
                {items.map((item, index) => (
                  <article key={`${item.productId}-${index}`} className="rounded-2xl border border-[#e9e4dc] bg-white p-4 sm:p-5">
                    <div className="flex gap-4">
                      <Link href={`/shop/${item.slug}`} className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f2f0ec] sm:h-36 sm:w-32">
                        {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#aaa]">No image</div>}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link href={`/shop/${item.slug}`} className="text-sm font-semibold leading-6 hover:underline sm:text-base">{item.name}</Link>
                            {item.color && <p className="mt-1 text-xs text-[#777]">Color: {item.color}</p>}
                            <p className="mt-2 text-sm font-semibold">{formatPrice(Number(item.price))}</p>
                          </div>
                          <button type="button" onClick={() => removeItem(index)} aria-label="Remove item" className="rounded-lg p-2 text-[#999] transition hover:bg-[#f8f4ef] hover:text-[#9b4b40]">
                            <Trash2 size={17} />
                          </button>
                        </div>
                        {item.packSize ? (
                          <div className="mt-3">
                            <p className="text-[10px] font-semibold tracking-[0.13em] text-[#8b7864]">PACK OF {item.packSize}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(item.sizeBreakdown ?? []).filter((size) => size.quantity > 0).map((size) => (
                                <span key={size.size} className="rounded-full bg-[#f5f1eb] px-3 py-1.5 text-[11px] text-[#5f554a]">{size.size}: {size.quantity}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 inline-flex h-9 items-center rounded-lg border border-[#e8e3dc]">
                            <button type="button" onClick={() => updatePackCount(index, -1)} className="flex h-full w-9 items-center justify-center text-[#777] hover:text-black"><Minus size={13} /></button>
                            <span className="w-9 text-center text-xs">{item.quantity}</span>
                            <button type="button" onClick={() => updatePackCount(index, 1)} className="flex h-full w-9 items-center justify-center text-[#777] hover:text-black"><Plus size={13} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                    {(item.frontImageUrl || item.backImageUrl) && (
                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#f0ede8] pt-4">
                        {item.frontImageUrl && <a href={item.frontImageUrl} target="_blank" rel="noreferrer" className="text-xs text-[#8b7054] underline">View front logo</a>}
                        {item.backImageUrl && <a href={item.backImageUrl} target="_blank" rel="noreferrer" className="text-xs text-[#8b7054] underline">View back logo</a>}
                      </div>
                    )}
                    {item.customizationNotes && <p className="mt-3 rounded-lg bg-[#faf8f5] p-3 text-xs leading-5 text-[#6c6258]"><span className="font-semibold">Customization:</span> {item.customizationNotes}</p>}
                  </article>
                ))}
              </section>

              <aside className="h-fit rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-6 lg:sticky lg:top-28">
                <h2 className="text-base font-semibold">Order summary</h2>
                <div className="mt-5 flex items-center justify-between text-sm text-[#777]"><span>Subtotal</span><span className="font-semibold text-[#171717]">{formatPrice(subtotal)}</span></div>
                <div className="mt-4 flex items-center justify-between border-t border-[#eee9e2] pt-4 text-sm"><span className="font-semibold">Total</span><span className="text-lg font-bold">{formatPrice(subtotal)}</span></div>
                <p className="mt-3 text-[11px] leading-5 text-[#999]">Shipping and any applicable charges will be confirmed at checkout.</p>
                <Link href="/checkout" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-[#b99a76] hover:text-[#171717]">
                  PROCEED TO CHECKOUT <ArrowRight size={15} />
                </Link>
                <button type="button" onClick={() => save([])} className="mt-4 w-full text-center text-[11px] text-[#999] underline transition hover:text-[#9b4b40]">Clear shopping bag</button>
              </aside>
            </div>
          )}
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
