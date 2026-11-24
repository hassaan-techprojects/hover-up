
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Search,
  ShoppingBag,
  ArrowUpDown,
} from "lucide-react";

import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: number | string;
  comparePrice: number | string | null;
  images: ProductImage[];
  categories: {
    category: {
      name: string;
    };
  }[];
  variants: {
    id: string;
    images: ProductImage[];
    inventory: {
      quantity: number;
    } | null;
  }[];
  attributes: {
    attributeValue: {
      id: string;
      value: string;
      termType: string;
      sizeSymbol: string | null;
      image: string | null;
      attribute: {
        name: string;
      };
    };
  }[];
};

function formatPrice(price: number | string) {
  return Number(price).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function getDiscount(price: number, comparePrice: number) {
  if (comparePrice <= price || comparePrice <= 0) return 0;

  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

function ProductCard({ product }: { product: Product }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);

  const images = product.images ?? [];
  const currentImage = images[imageIndex];

  const price = Number(product.price);
  const comparePrice = Number(product.comparePrice ?? 0);
  const discount = getDiscount(price, comparePrice);

  function previousImage() {
    setImageIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  }

  function nextImage() {
    setImageIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  }

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[#f1efeb]">
        <Link href={`/shop/${product.slug}`} className="absolute inset-0">
          {currentImage ? (
            <img
              src={currentImage.url}
              alt={currentImage.altText || product.name}
              className="h-full w-full object-contain object-center p-3"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs tracking-widest text-[#999]">
              NO IMAGE
            </div>
          )}
        </Link>

        {discount > 0 && (
          <span className="absolute left-3 top-3 bg-black px-3 py-1.5 text-[10px] font-semibold tracking-wider text-white">
            {discount}% OFF
          </span>
        )}

        <button
          onClick={() => setWishlisted(!wishlisted)}
          aria-label="Add to wishlist"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 transition hover:bg-white"
        >
          <Heart
            size={17}
            className={
              wishlisted
                ? "fill-red-500 text-red-500"
                : "text-[#222]"
            }
          />
        </button>

        {images.length > 1 && (
          <>
            <button
              onClick={previousImage}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100"
            >
              <ChevronLeft size={17} />
            </button>

            <button
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100"
            >
              <ChevronRight size={17} />
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setImageIndex(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === imageIndex
                      ? "w-5 bg-black"
                      : "w-1.5 bg-black/35"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-1 pt-4">
        {product.categories.length > 0 && (
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-[#888]">
            {product.categories
              .map((item) => item.category.name)
              .join(" / ")}
          </p>
        )}

        <Link href={`/shop/${product.slug}`}>
          <h3 className="line-clamp-2 text-[14px] font-semibold tracking-wide text-[#171717] transition hover:text-[#987b5c]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#171717]">
            {formatPrice(price)}
          </span>

          {discount > 0 && (
            <>
              <span className="text-xs text-[#999] line-through">
                {formatPrice(comparePrice)}
              </span>
              <span className="text-[10px] font-semibold text-[#a16e42]">
                {discount}% OFF
              </span>
            </>
          )}
        </div>

        <Link
          href={`/shop/${product.slug}`}
          className="mt-3 flex items-center justify-center gap-2 border border-[#222] px-3 py-2.5 text-[10px] font-semibold tracking-[0.15em] transition hover:bg-[#171717] hover:text-white"
        >
          <ShoppingBag size={14} />
          VIEW PRODUCT
        </Link>
      </div>
    </article>
  );
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products");

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data = await response.json();
        setProducts(data.products ?? []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products.flatMap((product) =>
            product.categories.map((item) => item.category.name)
          )
        )
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const query = search.toLowerCase();

      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query)
      );
    }

    if (category !== "ALL") {
      result = result.filter((product) =>
        product.categories.some(
          (item) => item.category.name === category
        )
      );
    }

    if (minPrice !== "") {
      result = result.filter(
        (product) => Number(product.price) >= Number(minPrice)
      );
    }

    if (maxPrice !== "") {
      result = result.filter(
        (product) => Number(product.price) <= Number(maxPrice)
      );
    }

    if (sort === "price-low") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "price-high") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, search, category, sort, minPrice, maxPrice]);

  return (
    <main className="min-h-screen bg-white text-[#171717]">
      <StorefrontHeader />

      {/* Shop Hero */}
      <section className="border-b border-[#eee] px-5 py-12 text-center sm:py-16">
        <p className="mb-3 text-lg font-semibold tracking-[0.2em] text-[#987b5c]">
          HOVER UP COLLECTIONS
        </p>

      </section>

      {/* Products */}
      <section className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 border-b border-[#eee] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs tracking-wide text-[#777]">
            {loading
              ? "Loading products..."
              : `${filteredProducts.length} PRODUCTS`}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 flex-1 items-center gap-2 border border-[#e5e5e5] px-3 sm:w-64 sm:flex-none">
              <Search size={15} className="text-[#888]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products"
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex h-10 items-center gap-2 border border-[#e5e5e5] px-4 text-xs"
            >
              <SlidersHorizontal size={15} />
              FILTERS
            </button>

            <div className="flex h-10 items-center gap-2 border border-[#e5e5e5] px-3">
              <ArrowUpDown size={14} />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="bg-transparent text-xs outline-none"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters */}
        {filtersOpen && (
          <div className="grid gap-5 border-b border-[#eee] py-6 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-[10px] font-semibold tracking-widest">
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 w-full border border-[#e5e5e5] bg-white px-3 text-xs"
              >
                <option value="ALL">All Categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold tracking-widest">
                MINIMUM PRICE
              </label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Minimum price"
                className="h-11 w-full border border-[#e5e5e5] px-3 text-xs outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold tracking-widest">
                MAXIMUM PRICE
              </label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Maximum price"
                className="h-11 w-full border border-[#e5e5e5] px-3 text-xs outline-none"
              />
            </div>
          </div>
        )}

        {/* Product Loading */}
        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 py-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index}>
                <div className="aspect-[3/4] animate-pulse bg-[#f1efeb]" />
                <div className="mt-4 h-3 w-3/4 animate-pulse bg-[#eee]" />
                <div className="mt-3 h-3 w-1/3 animate-pulse bg-[#eee]" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 py-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center">
            <ShoppingBag
              size={34}
              strokeWidth={1}
              className="mx-auto mb-5 text-[#aaa]"
            />
            <h2 className="text-lg font-semibold">
              No products found
            </h2>
            <p className="mt-2 text-sm text-[#888]">
              Try changing your search or filters.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("ALL");
                setMinPrice("");
                setMaxPrice("");
              }}
              className="mt-5 border border-[#222] px-6 py-3 text-[10px] font-semibold tracking-widest"
            >
              CLEAR FILTERS
            </button>
          </div>
        )}
      </section>

      <StorefrontFooter />
    </main>
  );
}
