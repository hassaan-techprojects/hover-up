"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  Play,
  Volume2,
  VolumeX,
  X,
  Diamond,
  Shirt,
  PackageCheck,
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

type HomeProduct = {
  id: string;
  name: string;
  slug: string;
  images: { url: string; altText: string | null; isPrimary: boolean; sortOrder: number }[];
  attributes?: { attributeValue: { value: string; termType: "COLOR" | "SIZE"; attribute: { name: string } } }[];
};

type Brand = {
  name: string;
  logo: string;
};

const brands: Brand[] = [
  { name: "Jio", logo: "/brands/jio.jpg" },
  { name: "Airtel", logo: "/brands/airtel.jpg" },
  { name: "HDFC Bank", logo: "/brands/hdfc-bank.jpg" },
  { name: "ICICI Bank", logo: "/brands/icici-bank.jpg" },
  { name: "Tata Electronics", logo: "/brands/tata-electronics.jpg" },
  { name: "ITC Limited", logo: "/brands/itc.jpg" },
  { name: "SRM University", logo: "/brands/srm.jpg" },
  { name: "VIT University", logo: "/brands/vit.jpg" },
  { name: "BSNL", logo: "/brands/bsnl.jpg" },
];

const watchVideos: {
  id: string;
  title: string;
  video: string;
}[] = [
  {
    id: "1",
    title: "Video 1",
    video: "/videos/video-1.webm",
  },
  {
    id: "2",
    title: "Video 2",
    video: "/videos/video-2.webm",
  },
  {
    id: "3",
    title: "Video 3",
    video: "/videos/video-3.webm",
  },
  {
    id: "4",
    title: "Video 4",
    video: "/videos/video-4.webm",
  },
];

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Watch & Buy viewer
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoViewerOpen, setVideoViewerOpen] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const activeVideoRef = useRef<HTMLVideoElement>(null);

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

  // Fetch active products uploaded from the dashboard
  useEffect(() => {
    let isMounted = true;
    async function fetchProducts() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load products.");
        if (isMounted) setProducts(data.products || []);
      } catch (error) {
        console.error("Failed to load homepage products:", error);
      } finally {
        if (isMounted) setProductsLoading(false);
      }
    }
    fetchProducts();
    return () => { isMounted = false; };
  }, []);

  // Automatic banner slider
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex(
        (previousIndex) => (previousIndex + 1) % banners.length
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // Play selected video when viewer opens or video changes
  useEffect(() => {
    if (!videoViewerOpen) return;

    const video = activeVideoRef.current;

    if (video) {
      video.play().catch((error) => {
        console.warn("Video autoplay was prevented:", error);
      });
    }
  }, [videoViewerOpen, currentVideoIndex]);

  // Lock page scrolling and support keyboard controls
  useEffect(() => {
    if (!videoViewerOpen) return;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVideoViewerOpen(false);
      }

      if (event.key === "ArrowLeft") {
        setCurrentVideoIndex((index) =>
          index === 0 ? watchVideos.length - 1 : index - 1
        );
      }

      if (event.key === "ArrowRight") {
        setCurrentVideoIndex(
          (index) => (index + 1) % watchVideos.length
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [videoViewerOpen]);

  const openVideoViewer = (index: number) => {
    setCurrentVideoIndex(index);
    setIsVideoMuted(true);
    setVideoViewerOpen(true);
  };

  const closeVideoViewer = () => {
    activeVideoRef.current?.pause();
    setVideoViewerOpen(false);
  };

  const showPreviousVideo = () => {
    setCurrentVideoIndex((index) =>
      index === 0 ? watchVideos.length - 1 : index - 1
    );
  };

  const showNextVideo = () => {
    setCurrentVideoIndex(
      (index) => (index + 1) % watchVideos.length
    );
  };

  const handleBrandImageError = (brand: Brand) => {
    console.error(
      `Unable to load brand logo: ${brand.logo}. Check that the file exists inside public/brands/.`
    );
  };

  return (
    <main className="min-h-screen bg-white pb-0 font-sans text-[#111111]">
      <StorefrontHeader />

      {/* Homepage Banner Slider */}
      {!bannersLoading && banners.length > 0 && (
        <section className="relative flex min-h-[240px] w-full items-center overflow-hidden bg-[#f8f6f2] py-4 sm:min-h-[320px] md:min-h-[420px] md:py-5 lg:min-h-[460px]">
          <div
            className="flex transition-transform duration-700 ease-in-out will-change-transform"
            style={{
              transform: `translateX(-${currentBannerIndex * 100}%)`,
            }}
          >
            {banners.map((banner, index) => (
              <div key={banner.id} className="flex w-full shrink-0 items-center justify-center">
                <img
                  src={banner.image}
                  alt={`Hover Up promotional banner ${index + 1}`}
                  className="block h-auto max-h-[460px] w-full object-contain object-center"
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
      <section className="flex items-center justify-center bg-white px-6 py-3 md:bg-[#f8f6f2] md:py-12">
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
      <section className="mx-auto max-w-[1500px] overflow-hidden py-8 md:py-10">
        <div className="mb-6 flex items-end justify-between px-6 md:px-10">
          <div>
            <p className="text-xs font-extrabold tracking-[0.25em] text-[#a18c75]">
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

                <h3 className="mt-4 w-full text-lg font-extrabold tracking-wide text-[#111111] transition-colors duration-300 group-hover:text-[#b99a76]">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="bg-white px-6 py-8 md:bg-[#f8f6f2] md:px-10 md:py-10">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs font-extrabold tracking-[0.25em] text-[#a18c75]">
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

          {productsLoading ? (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse bg-[#f1efeb]" />)}
            </div>
          ) : products.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {products.slice(0, 8).map((product) => {
                const image = product.images?.find((item) => item.isPrimary) || product.images?.[0];
                return (
                  <article key={product.id} className="group min-w-0">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-[#f8f6f2]">
                      <Link href={`/shop/${product.slug}`} aria-label={`View ${product.name}`} className="absolute inset-0 flex items-center justify-center">
                        {image ? <img src={image.url} alt={image.altText || product.name} loading="lazy" className="h-full w-full object-contain p-1 transition-transform duration-500 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center text-base text-[#777]">NO IMAGE</div>}
                      </Link>
                      <span className="absolute left-3 top-3 z-10 rounded-sm bg-black px-3 py-2 text-sm font-extrabold tracking-wide text-white">PACK OF 2</span>
                      <Link href={`/shop/${product.slug}`} className="absolute inset-x-3 bottom-3 flex min-h-12 items-center justify-center rounded-sm bg-black px-4 text-base font-extrabold tracking-wider text-white opacity-100 transition-all duration-300 hover:bg-[#b99a76] hover:text-black sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100">VIEW PRODUCT</Link>
                    </div>
                    <Link href={`/shop/${product.slug}`}><h3 className="mt-4 line-clamp-2 text-lg font-extrabold leading-7 text-[#171717] transition-colors hover:text-[#987b5c] sm:text-xl">{product.name}</h3></Link>
                    <p className="mt-2 text-xl font-extrabold text-[#171717]">₹1,399</p>
                    <p className="mt-1 text-sm font-semibold text-[#625b53]">
                      {(() => {
                        const colors = [...new Set((product.attributes || []).filter((item) => item.attributeValue.termType === "COLOR").map((item) => item.attributeValue.value))];
                        return colors.length ? `Colours: ${colors.join(", ")}` : "2-piece pack";
                      })()}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 flex min-h-48 items-center justify-center border border-dashed border-[#d8d0c6] bg-white px-5 text-center">
              <p className="max-w-sm text-sm font-medium leading-6 text-neutral-500">Active products published in the Hover Up dashboard will appear here.</p>
            </div>
          )}
        </div>
      </section>

      {/* Brands We Worked With */}
      <section className="overflow-hidden bg-white py-16 md:py-20">
        <div className="mb-9 px-6 text-center md:mb-10">
          <p className="text-xs font-extrabold tracking-[0.3em] text-[#a18c75]">
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
                      onError={() => handleBrandImageError(brand)}
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
                      onError={() => handleBrandImageError(brand)}
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
              <p className="text-xs font-extrabold tracking-[0.3em] text-[#a18c75]">
                SEE IT IN ACTION
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-black">
                Watch & Buy
              </h2>
            </div>
          </div>

          {/* Static Video Cards - Videos play only after clicking */}
          <div className="watch-video-grid">
            {watchVideos.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openVideoViewer(index)}
                onMouseEnter={(event) => {
                  const preview = event.currentTarget.querySelector("video");
                  if (!preview) return;
                  preview.muted = false;
                  preview.play().catch(() => {
                    preview.muted = true;
                    preview.play().catch(() => undefined);
                  });
                }}
                onMouseLeave={(event) => {
                  const preview = event.currentTarget.querySelector("video");
                  if (preview) {
                    preview.pause();
                    preview.currentTime = 0;
                  }
                }}
                onFocus={(event) => {
                  const preview = event.currentTarget.querySelector("video");
                  if (preview) {
                    preview.muted = true;
                    preview.play().catch(() => undefined);
                  }
                }}
                onBlur={(event) => {
                  const preview = event.currentTarget.querySelector("video");
                  if (preview) preview.pause();
                }}
                aria-label={`Play ${item.title}`}
                className="watch-video-card group relative block cursor-pointer overflow-hidden rounded-xl border-0 bg-black p-0 text-left"
              >
                <video
                  src={item.video}
                  loop
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
                <div className="watch-video-card-content transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0">
                  <span className="watch-video-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="watch-video-play">
                    <Play size={25} fill="currentColor" />
                  </span>

                  <span className="watch-video-label">
                    WATCH VIDEO
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Watch & Buy Features */}
          <div className="watch-feature-strip">
            <div className="watch-feature-item">
              <div className="watch-feature-icon watch-feature-icon-diamond">
                <Diamond size={30} strokeWidth={2} />
              </div>

              <div className="watch-feature-content">
                <h3>PREMIUM PRINTED EDITION</h3>
                <p>
                  High-grade fabrics with consistent finishing.
                </p>
              </div>
            </div>

            <div className="watch-feature-item">
              <div className="watch-feature-icon">
                <Shirt />
              </div>

              <div className="watch-feature-content">
                <h3>COMFORTABLE FITS</h3>
                <p>
                  Designed for everyday comfort and movement.
                </p>
              </div>
            </div>

            <div className="watch-feature-item">
              <div className="watch-feature-icon">
                <PackageCheck />
              </div>

              <div className="watch-feature-content">
                <h3>BULK & CUSTOM ORDER</h3>
                <p>
                  Scalable production with customization support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-screen Watch & Buy Video Viewer */}
      {videoViewerOpen && watchVideos[currentVideoIndex] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Watch product video"
          onClick={closeVideoViewer}
        >
          <div
            className="relative flex h-full w-full items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <video
              key={watchVideos[currentVideoIndex].id}
              ref={activeVideoRef}
              src={watchVideos[currentVideoIndex].video}
              autoPlay
              loop
              muted={isVideoMuted}
              playsInline
              controls
              preload="auto"
              className="h-full w-full object-contain"
            />

            {/* Mute / Unmute */}
            <button
              type="button"
              onClick={() => setIsVideoMuted((muted) => !muted)}
              aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
              className="absolute left-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/30"
            >
              {isVideoMuted ? (
                <VolumeX size={22} />
              ) : (
                <Volume2 size={22} />
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={closeVideoViewer}
              aria-label="Close video"
              className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/30"
            >
              <X size={24} />
            </button>

            {/* Previous Video */}
            <button
              type="button"
              onClick={showPreviousVideo}
              aria-label="Previous video"
              className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/30 sm:left-6"
            >
              <ChevronLeft size={28} />
            </button>

            {/* Next Video */}
            <button
              type="button"
              onClick={showNextVideo}
              aria-label="Next video"
              className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/30 sm:right-6"
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      )}

      <StorefrontFooter />
    </main>
  );
}