
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

type Banner = {
  id: string;
  image: string;
  sortOrder: number;
};

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Fetch Categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load categories");
        }

        setCategories(data.categories || []);
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setCategoriesLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Fetch Active Banners
  useEffect(() => {
    async function fetchBanners() {
      try {
        const response = await fetch("/api/banners", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load banners");
        }

        setBanners(data.banners || []);
      } catch (error) {
        console.error("Failed to load banners:", error);
      } finally {
        setBannersLoading(false);
      }
    }

    fetchBanners();
  }, []);

  // Automatically change banner every 10 seconds
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((previousIndex) =>
        (previousIndex + 1) % banners.length
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <main className="min-h-screen bg-white pb-20 font-sans text-[#111111] md:pb-0">
      <StorefrontHeader />

      {/* Homepage Banner Slider */}
      {!bannersLoading && banners.length > 0 && (
        <section className="relative w-full overflow-hidden bg-[#f8f6f2]">
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{
              transform: `translateX(-${currentBannerIndex * 100}%)`,
            }}
          >
            {banners.map((banner, index) => (
              <div key={banner.id} className="w-full shrink-0">
                <img
                  src={banner.image}
                  alt={`Hover Up promotional banner ${index + 1}`}
                  className="block h-auto w-full object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : undefined}
                  sizes="100vw"
                />
              </div>
            ))}
          </div>

          {/* Slider Indicators */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  onClick={() => setCurrentBannerIndex(index)}
                  aria-label={`Go to banner ${index + 1}`}
                  aria-current={
                    currentBannerIndex === index ? "true" : undefined
                  }
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentBannerIndex === index
                      ? "w-7 bg-black"
                      : "w-2 bg-black/40 hover:bg-black/70"
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Homepage Hero */}
      <section className="flex items-center justify-center bg-[#f8f6f2] px-6 py-12">
        <Link
          href="/shop"
          className="group inline-flex items-center gap-3 bg-black px-9 py-4 text-xs font-extrabold tracking-widest text-white transition-all duration-300 hover:bg-[#b99a76]"
        >
          EXPLORE SHOP
          <ChevronRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </section>

      {/* Shop by Category */}
      <section className="mx-auto max-w-[1500px] px-6 py-20 md:px-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.25em] text-[#a18c75]">
              EXPLORE
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-black">
              Shop by category
            </h2>
          </div>

          <Link
            href="/categories"
            className="text-xs font-extrabold tracking-wider text-black underline underline-offset-4 transition-colors hover:text-[#b99a76]"
          >
            VIEW ALL
          </Link>
        </div>

        {categoriesLoading ? (
          <div className="mt-12 flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e3dc] border-t-[#b99a76]" />
          </div>
        ) : categories.length === 0 ? (
          <div className="mt-10 flex min-h-40 items-center justify-center border border-dashed border-[#d8d0c6] bg-[#faf9f7] px-5 text-center">
            <p className="max-w-sm text-sm font-medium leading-6 text-neutral-500">
              Categories created in the Hover Up dashboard will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="group flex flex-col items-center text-center"
              >
                <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-[#f5f3ef] sm:h-32 sm:w-32">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full rounded-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#f1ede7] text-sm font-semibold text-neutral-500">
                      {category.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 className="mt-4 text-sm font-bold tracking-wide text-[#111111] transition-colors duration-300 group-hover:text-[#b99a76]">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="bg-[#f8f6f2] px-6 py-20 md:px-10">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-[10px] font-extrabold tracking-[0.25em] text-[#a18c75]">
            THE COLLECTION
          </p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-black">
              Featured products
            </h2>

            <Link
              href="/shop"
              className="text-xs font-extrabold tracking-wider text-black underline underline-offset-4 transition-colors hover:text-[#b99a76]"
            >
              VIEW ALL PRODUCTS
            </Link>
          </div>

          <div className="mt-10 flex min-h-48 items-center justify-center border border-dashed border-[#d8d0c6] bg-white px-5 text-center">
            <p className="max-w-sm text-sm font-medium leading-6 text-neutral-500">
              Products and images uploaded through the dashboard will automatically appear here after database integration.
            </p>
          </div>
        </div>
      </section>

      {/* Brand Section */}
      <section className="px-6 py-20 text-center">
        <p className="text-[10px] font-extrabold tracking-[0.3em] text-[#a18c75]">
          HOVER UP
        </p>

        <h2 className="font-editorial mt-4 text-3xl font-bold text-black">
          Style starts with you.
        </h2>

        <p className="mt-4 text-sm font-medium text-neutral-500">
          Discover the collection and find your next favourite look.
        </p>

        <Link
          href="/shop"
          className="mt-7 inline-block bg-black px-9 py-4 text-xs font-extrabold tracking-widest text-white transition-all duration-300 hover:bg-[#b99a76]"
        >
          SHOP NOW
        </Link>
      </section>

      <StorefrontFooter />
    </main>
  );
}
