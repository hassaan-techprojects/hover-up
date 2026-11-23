
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Play,
  Video,
} from "lucide-react";

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

type Brand = {
  name: string;
  logo: string;
};

const brands: Brand[] = [
  { name: "Jio", logo: "/brands/jio.png" },
  { name: "Airtel", logo: "/brands/airtel.jpeg" },
  { name: "HDFC Bank", logo: "/brands/hdfc-bank.jpeg" },
  { name: "ICICI Bank", logo: "/brands/icici-bank.jpeg" },
  { name: "Tata Electronics", logo: "/brands/tata-electronics.jpeg" },
  { name: "ITC Limited", logo: "/brands/itc.jpeg" },
  { name: "SRM University", logo: "/brands/srm.jpeg" },
  { name: "VIT University", logo: "/brands/vit.jpeg" },
  { name: "BSNL", logo: "/brands/bsnl.jpeg" },
];

// Add your video files here when they are ready.
// Example: { id: "1", title: "Product video", video: "/videos/video-1.mp4" }
const watchVideos: {
  id: string;
  title: string;
  video: string;
}[] = [];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [playingVideo, setPlayingVideo] = useState(false);

  // Fetch categories
  useEffect(() => {
    let isMounted = true;

    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load categories");
        }

        if (isMounted) {
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch banners using the API cache
  useEffect(() => {
    let isMounted = true;

    async function fetchBanners() {
      try {
        const response = await fetch("/api/banners");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load banners");
        }

        if (isMounted) {
          setBanners(data.banners || []);
          setCurrentBannerIndex(0);
        }
      } catch (error) {
        console.error("Failed to load banners:", error);
      } finally {
        if (isMounted) {
          setBannersLoading(false);
        }
      }
    }

    fetchBanners();

    return () => {
      isMounted = false;
    };
  }, []);

  // Automatic banner slider
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((previousIndex) =>
        (previousIndex + 1) % banners.length
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const showPreviousVideo = () => {
    if (watchVideos.length <= 1) return;

    setPlayingVideo(false);
    setCurrentVideoIndex((index) =>
      index === 0 ? watchVideos.length - 1 : index - 1
    );
  };

  const showNextVideo = () => {
    if (watchVideos.length <= 1) return;

    setPlayingVideo(false);
    setCurrentVideoIndex((index) =>
      (index + 1) % watchVideos.length
    );
  };

  return (
    <main className="min-h-screen bg-white pb-20 font-sans text-[#111111] md:pb-0">
      <StorefrontHeader />

      {/* Homepage Banner Slider */}
      {!bannersLoading && banners.length > 0 && (
        <section className="relative w-full overflow-hidden bg-[#f8f6f2]">
          <div
            className="flex transition-transform duration-700 ease-in-out will-change-transform"
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
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                  sizes="100vw"
                />
              </div>
            ))}
          </div>

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
      <section className="mx-auto max-w-[1500px] overflow-hidden py-16 md:py-20">
        <div className="mb-10 flex items-end justify-between px-6 md:px-10">
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
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e3dc] border-t-[#b99a76]" />
          </div>
        ) : categories.length === 0 ? (
          <div className="mx-6 flex min-h-40 items-center justify-center border border-dashed border-[#d8d0c6] bg-[#faf9f7] px-5 text-center md:mx-10">
            <p className="max-w-sm text-sm font-medium leading-6 text-neutral-500">
              Categories created in the Hover Up dashboard will appear here.
            </p>
          </div>
        ) : (
          <div className="category-list flex gap-7 overflow-x-auto px-6 pb-4 md:gap-10 md:px-10">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="group flex w-44 shrink-0 flex-col items-center text-center md:w-52"
              >
                <div className="category-image-frame flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#111111] bg-[#f2f2f2] p-4 transition-all duration-300 group-hover:border-[#b99a76] group-hover:shadow-md md:h-48 md:w-48 md:p-5">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-contain object-center transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#b99a76]">
                      {category.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 className="mt-4 w-full text-xs font-bold tracking-wide text-[#111111] transition-colors duration-300 group-hover:text-[#b99a76] md:text-sm">
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

      {/* Brands We Worked With */}
      <section className="overflow-hidden bg-white py-16 md:py-20">
        <div className="mb-9 px-6 text-center md:mb-10">
          <p className="text-[10px] font-extrabold tracking-[0.3em] text-[#a18c75]">
            OUR NETWORK
          </p>

          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-black">
            BRANDS WE WORKED WITH
          </h2>
        </div>

        {/* First moving row */}
        <div className="brand-marquee overflow-hidden">
          <div className="brand-marquee-track brand-marquee-forward flex w-max">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex shrink-0 items-center gap-8 px-4 md:gap-12 md:px-6"
                aria-hidden={copy === 1}
              >
                {brands.slice(0, 5).map((brand) => (
                  <div
                    key={`${copy}-${brand.name}`}
                    className="flex h-24 w-44 shrink-0 items-center justify-center md:h-28 md:w-56"
                  >
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      title={brand.name}
                      width={220}
                      height={100}
                      className="h-20 w-40 object-contain md:h-24 md:w-48"
                      loading="eager"
                      decoding="async"
                      onError={() =>
                        console.error(`Unable to load brand logo: ${brand.logo}`)
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Second moving row */}
        <div className="brand-marquee mt-4 overflow-hidden md:mt-5">
          <div className="brand-marquee-track brand-marquee-reverse flex w-max">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex shrink-0 items-center gap-8 px-4 md:gap-12 md:px-6"
                aria-hidden={copy === 1}
              >
                {brands.slice(5).map((brand) => (
                  <div
                    key={`${copy}-${brand.name}`}
                    className="flex h-24 w-44 shrink-0 items-center justify-center md:h-28 md:w-56"
                  >
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      title={brand.name}
                      width={220}
                      height={100}
                      className="h-20 w-40 object-contain md:h-24 md:w-48"
                      loading="eager"
                      decoding="async"
                      onError={() =>
                        console.error(`Unable to load brand logo: ${brand.logo}`)
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Watch & Buy */}
      <section className="bg-[#f8f6f2] px-6 py-20 md:px-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold tracking-[0.3em] text-[#a18c75]">
                SEE IT IN ACTION
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-black">
                Watch & Buy
              </h2>
            </div>

            {watchVideos.length > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={showPreviousVideo}
                  aria-label="Previous video"
                  className="flex h-11 w-11 items-center justify-center border border-black bg-white transition-colors hover:bg-black hover:text-white"
                >
                  <ChevronRight className="rotate-180" size={18} />
                </button>

                <button
                  onClick={showNextVideo}
                  aria-label="Next video"
                  className="flex h-11 w-11 items-center justify-center border border-black bg-white transition-colors hover:bg-black hover:text-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          {watchVideos.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center border border-dashed border-[#c9b9a7] bg-white px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f8f6f2]">
                <Video size={28} className="text-[#b99a76]" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-black">
                Videos coming soon
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Product videos will appear here. The Watch & Buy section is ready for your video files.
              </p>
            </div>
          ) : (
            <div className="watch-video-grid">
              {watchVideos.map((item, index) => (
                <div
                  key={item.id}
                  className={`watch-video-card ${
                    index === currentVideoIndex ? "watch-video-active" : ""
                  }`}
                >
                  <video
                    key={item.id}
                    src={item.video}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                    onPlay={() => setPlayingVideo(true)}
                    onPause={() => setPlayingVideo(false)}
                  />

                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent p-4">
                    <p className="text-sm font-bold text-white">
                      {item.title}
                    </p>
                  </div>

                  {!playingVideo && (
                    <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black">
                      <Play size={20} fill="currentColor" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Shop CTA */}
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
