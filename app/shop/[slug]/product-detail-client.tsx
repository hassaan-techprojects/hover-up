
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
  X,
  ZoomIn,
  ShieldCheck,
  RotateCcw,
  Star,
  Package,
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

type AttributeValue = {
  id: string;
  value: string;
  image: string | null;
  sizeSymbol: string | null;
  termType: "COLOR" | "SIZE";
  attribute: {
    id: string;
    name: string;
    slug: string;
  };
};

type Variant = {
  id: string;
  name: string;
  sku: string | null;
  price: number | string | null;
  comparePrice: number | string | null;
  stock: number;
  attributes: unknown;
  images: ProductImage[];
  inventory: {
    quantity: number;
    reserved: number;
  } | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  price: number | string;
  comparePrice: number | string | null;
  images: ProductImage[];
  variants: Variant[];
  attributes: {
    attributeValue: AttributeValue;
  }[];
  categories: {
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
  totalStock: number;
  isInStock: boolean;
  averageRating: number;
  reviewCount: number;
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: string;
    customer: {
      firstName: string;
      lastName: string | null;
    };
  }[];
};

type CartEntry = {
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  variantName: string | null;
};

const CART_STORAGE_KEY = "hover-up-cart";
const WISHLIST_STORAGE_KEY = "hover-up-wishlist";

function formatPrice(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAvailableStock(variant: Variant) {
  if (variant.inventory) {
    return Math.max(
      0,
      variant.inventory.quantity - variant.inventory.reserved
    );
  }

  return Math.max(0, variant.stock);
}

function getVariantAttributeValues(attributes: unknown): string[] {
  if (!attributes || typeof attributes !== "object") {
    return [];
  }

  const values: string[] = [];

  function collect(value: unknown) {
    if (typeof value === "string" || typeof value === "number") {
      values.push(String(value));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(collect);
    }
  }

  collect(attributes);

  return values;
}

export default function ProductDetailClient({
  slug,
}: {
  slug: string;
}) {
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedVariant, setSelectedVariant] =
    useState<Variant | null>(null);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const [selectedImage, setSelectedImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [wishlist, setWishlist] = useState(false);

  const [cartMessage, setCartMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "description" | "reviews"
  >("description");

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    async function fetchProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/products/${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load this product."
          );
        }

        if (!cancelled) {
          setProduct(data.product);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const colorOptions = useMemo(() => {
    if (!product) return [];

    return product.attributes
      .map((item) => item.attributeValue)
      .filter((value) => value.termType === "COLOR");
  }, [product]);

  const sizeOptions = useMemo(() => {
    if (!product) return [];

    return product.attributes
      .map((item) => item.attributeValue)
      .filter((value) => value.termType === "SIZE");
  }, [product]);

  const productImages = useMemo(() => {
    if (!product) return [];

    const variantImages = selectedVariant?.images ?? [];

    const images =
      variantImages.length > 0
        ? variantImages
        : product.images;

    return [...images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1;
      }

      return a.sortOrder - b.sortOrder;
    });
  }, [product, selectedVariant]);

  const currentPrice = Number(
    selectedVariant?.price ?? product?.price ?? 0
  );

  const currentComparePrice = Number(
    selectedVariant?.comparePrice ??
      product?.comparePrice ??
      0
  );

  const discount =
    currentComparePrice > currentPrice && currentComparePrice > 0
      ? Math.round(
          ((currentComparePrice - currentPrice) /
            currentComparePrice) *
            100
        )
      : 0;

  const availableStock = selectedVariant
    ? getAvailableStock(selectedVariant)
    : product?.totalStock ?? 0;

  const selectedImageUrl =
    productImages[selectedImage]?.url ?? "";

  const hasVariants =
    (product?.variants.length ?? 0) > 0;

  const matchingVariants = useCallback(
    (color: string, size: string) => {
      if (!product) return [];

      return product.variants.filter((variant) => {
        const values = getVariantAttributeValues(
          variant.attributes
        );

        const colorMatches =
          !color ||
          values.some(
            (value) =>
              value.toLowerCase() === color.toLowerCase()
          );

        const sizeMatches =
          !size ||
          values.some(
            (value) =>
              value.toLowerCase() === size.toLowerCase()
          );

        return colorMatches && sizeMatches;
      });
    },
    [product]
  );

  useEffect(() => {
    if (!product) return;

    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);

    if (stored) {
      try {
        const items: string[] = JSON.parse(stored);
        setWishlist(items.includes(product.id));
      } catch {
        setWishlist(false);
      }
    }
  }, [product]);

  useEffect(() => {
    if (!product || !selectedVariant) return;

    const values = getVariantAttributeValues(
      selectedVariant.attributes
    );

    const matchingColor = colorOptions.find((color) =>
      values.some(
        (value) =>
          value.toLowerCase() === color.value.toLowerCase()
      )
    );

    const matchingSize = sizeOptions.find((size) =>
      values.some(
        (value) =>
          value.toLowerCase() === size.value.toLowerCase()
      )
    );

    if (matchingColor) setSelectedColor(matchingColor.value);
    if (matchingSize) setSelectedSize(matchingSize.value);
  }, [
    selectedVariant,
    product,
    colorOptions,
    sizeOptions,
  ]);

  useEffect(() => {
    if (!viewerOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setViewerOpen(false);

      if (event.key === "ArrowRight") {
        setSelectedImage((current) =>
          (current + 1) % productImages.length
        );
      }

      if (event.key === "ArrowLeft") {
        setSelectedImage((current) =>
          (current - 1 + productImages.length) %
          productImages.length
        );
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewerOpen, productImages.length]);

  function changeColor(color: AttributeValue) {
    setSelectedColor(color.value);
    setSelectedImage(0);
    setQuantity(1);

    const matches = matchingVariants(
      color.value,
      selectedSize
    );

    if (matches.length > 0) {
      setSelectedVariant(matches[0]);
    } else if (hasVariants) {
      setSelectedVariant(null);
    }
  }

  function changeSize(size: AttributeValue) {
    setSelectedSize(size.value);
    setSelectedImage(0);
    setQuantity(1);

    const matches = matchingVariants(
      selectedColor,
      size.value
    );

    if (matches.length > 0) {
      setSelectedVariant(matches[0]);
    } else if (hasVariants) {
      setSelectedVariant(null);
    }
  }

  function toggleWishlist() {
    if (!product) return;

    try {
      const stored = localStorage.getItem(
        WISHLIST_STORAGE_KEY
      );

      const items: string[] = stored
        ? JSON.parse(stored)
        : [];

      const updated = wishlist
        ? items.filter((id) => id !== product.id)
        : [...items.filter((id) => id !== product.id), product.id];

      localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify(updated)
      );

      setWishlist(!wishlist);
    } catch {
      setCartMessage("Unable to update your wishlist.");
    }
  }

  function addToCart(goToCart = false) {
    if (!product) return;

    if (hasVariants && !selectedVariant) {
      setCartMessage(
        "Please select an available color and size combination."
      );
      return;
    }

    if (availableStock <= 0) {
      setCartMessage("This product is currently out of stock.");
      return;
    }

    if (quantity > availableStock) {
      setCartMessage(
        `Only ${availableStock} item(s) are available.`
      );
      return;
    }

    setAddingToCart(true);
    setCartMessage("");

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);

      const cart: CartEntry[] = stored
        ? JSON.parse(stored)
        : [];

      const variantId = selectedVariant?.id ?? null;

      const existingIndex = cart.findIndex(
        (item) =>
          item.productId === product.id &&
          item.variantId === variantId
      );

      const entry: CartEntry = {
        productId: product.id,
        variantId,
        name: product.name,
        slug: product.slug,
        price: currentPrice,
        image: selectedImageUrl,
        quantity,
        variantName: selectedVariant?.name ?? null,
      };

      if (existingIndex >= 0) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push(entry);
      }

      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cart)
      );

      if (goToCart) {
        router.push("/cart");
      } else {
        setCartMessage("Added to your bag successfully.");
      }
    } catch {
      setCartMessage("Unable to add this product to your bag.");
    } finally {
      setAddingToCart(false);
    }
  }

  function previousImage() {
    setSelectedImage(
      (current) =>
        (current - 1 + productImages.length) %
        productImages.length
    );
  }

  function nextImage() {
    setSelectedImage(
      (current) => (current + 1) % productImages.length
    );
  }

  if (loading) {
    return (
      <>
        <StorefrontHeader />

        <main className="min-h-[70vh] px-5 py-16 md:px-10">
          <div className="mx-auto grid max-w-[1400px] animate-pulse gap-12 lg:grid-cols-2">
            <div className="aspect-[4/5] bg-[#f0ede8]" />

            <div className="space-y-6 py-8">
              <div className="h-4 w-32 bg-[#f0ede8]" />
              <div className="h-10 w-3/4 bg-[#f0ede8]" />
              <div className="h-7 w-40 bg-[#f0ede8]" />
              <div className="h-24 w-full bg-[#f0ede8]" />
              <div className="h-12 w-full bg-[#f0ede8]" />
              <div className="h-14 w-full bg-[#f0ede8]" />
            </div>
          </div>
        </main>

        <StorefrontFooter />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <StorefrontHeader />

        <main className="flex min-h-[65vh] flex-col items-center justify-center px-5 text-center">
          <Package
            size={42}
            strokeWidth={1.2}
            className="mb-6 text-[#777]"
          />

          <h1 className="text-2xl tracking-wide text-[#171717]">
            Product Not Found
          </h1>

          <p className="mt-3 max-w-md text-sm text-[#777]">
            {error ||
              "The product you are looking for may have been removed or is unavailable."}
          </p>

          <Link
            href="/shop"
            className="mt-8 inline-flex items-center gap-3 bg-[#171717] px-8 py-4 text-sm tracking-[0.16em] text-white transition hover:bg-[#444]"
          >
            <ArrowLeft size={15} />
            BACK TO SHOP
          </Link>
        </main>

        <StorefrontFooter />
      </>
    );
  }

  return (
    <>
      <StorefrontHeader />

      <main className="bg-white text-[#171717]">
        {/* BREADCRUMB */}

        <div className="mx-auto max-w-[1500px] px-5 pt-7 md:px-10">
          <div className="flex flex-wrap items-center gap-2 text-sm tracking-[0.12em] text-[#888]">
            <Link href="/" className="transition hover:text-black">
              HOME
            </Link>

            <ChevronRight size={12} />

            <Link
              href="/shop"
              className="transition hover:text-black"
            >
              SHOP
            </Link>

            {product.categories[0] && (
              <>
                <ChevronRight size={12} />

                <Link
                  href={`/shop?category=${product.categories[0].category.slug}`}
                  className="transition hover:text-black"
                >
                  {product.categories[0].category.name.toUpperCase()}
                </Link>
              </>
            )}

            <ChevronRight size={12} />

            <span className="text-[#171717]">
              {product.name.toUpperCase()}
            </span>
          </div>
        </div>

        {/* PRODUCT SECTION */}

        <section className="mx-auto grid max-w-[1500px] gap-10 px-5 pb-20 pt-8 md:px-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 xl:gap-24">
          {/* IMAGE GALLERY */}

          <div className="min-w-0">
            <div className="grid grid-cols-[65px_minmax(0,1fr)] gap-3 md:grid-cols-[85px_minmax(0,1fr)] md:gap-5">
              {/* THUMBNAILS */}

              <div className="flex flex-col gap-3">
                {productImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-[4/5] w-full overflow-hidden border transition ${
                      selectedImage === index
                        ? "border-[#171717]"
                        : "border-[#e9e7e3] hover:border-[#999]"
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.altText || product.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* MAIN IMAGE */}

              <div className="group relative aspect-[4/5] overflow-hidden bg-[#f7f6f3]">
                {selectedImageUrl ? (
                  <button
                    onClick={() => setViewerOpen(true)}
                    className="h-full w-full cursor-zoom-in"
                    aria-label="Open full-screen product image"
                  >
                    <img
                      src={selectedImageUrl}
                      alt={
                        productImages[selectedImage]?.altText ||
                        product.name
                      }
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                    />
                  </button>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#999]">
                    No product image available
                  </div>
                )}

                {discount > 0 && (
                  <span className="absolute left-4 top-4 bg-[#171717] px-3 py-2 text-sm tracking-[0.12em] text-white">
                    {discount}% OFF
                  </span>
                )}

                <button
                  onClick={toggleWishlist}
                  aria-label={
                    wishlist
                      ? "Remove from wishlist"
                      : "Add to wishlist"
                  }
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 transition hover:bg-white"
                >
                  <Heart
                    size={19}
                    strokeWidth={1.5}
                    fill={wishlist ? "#171717" : "none"}
                    className={
                      wishlist ? "text-[#171717]" : "text-[#555]"
                    }
                  />
                </button>

                <button
                  onClick={() => setViewerOpen(true)}
                  className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 transition hover:bg-white"
                  aria-label="Zoom image"
                >
                  <ZoomIn size={19} strokeWidth={1.5} />
                </button>

                {productImages.length > 1 && (
                  <>
                    <button
                      onClick={previousImage}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 transition hover:bg-white group-hover:opacity-100"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 transition hover:bg-white group-hover:opacity-100"
                      aria-label="Next image"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-2 text-sm tracking-[0.12em]">
                  {String(selectedImage + 1).padStart(2, "0")} /{" "}
                  {String(productImages.length).padStart(2, "0")}
                </div>
              </div>
            </div>

            {/* MOBILE IMAGE NAVIGATION */}

            {productImages.length > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2 lg:hidden">
                {productImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1}`}
                    className={`h-1.5 transition-all ${
                      selectedImage === index
                        ? "w-7 bg-[#171717]"
                        : "w-1.5 rounded-full bg-[#d5d2cc]"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* PRODUCT INFORMATION */}

          <div className="lg:sticky lg:top-28 lg:self-start lg:py-5">
            {product.categories[0] && (
              <p className="text-sm tracking-[0.22em] text-[#999]">
                {product.categories[0].category.name.toUpperCase()}
              </p>
            )}

            <h1 className="mt-3 text-[27px] font-light leading-[1.25] tracking-[0.015em] md:text-[35px]">
              {product.name}
            </h1>

            {/* RATING */}

            {product.reviewCount > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      size={13}
                      fill={
                        index < Math.round(product.averageRating)
                          ? "#171717"
                          : "none"
                      }
                      className={
                        index < Math.round(product.averageRating)
                          ? "text-[#171717]"
                          : "text-[#ccc]"
                      }
                    />
                  ))}
                </div>

                <span className="text-sm text-[#777]">
                  {product.averageRating.toFixed(1)} (
                  {product.reviewCount} reviews)
                </span>
              </div>
            )}

            {/* PRICE */}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="text-[25px] font-medium tracking-wide">
                {formatPrice(currentPrice)}
              </span>

              {currentComparePrice > currentPrice && (
                <>
                  <span className="text-[15px] text-[#999] line-through">
                    {formatPrice(currentComparePrice)}
                  </span>

                  <span className="text-sm tracking-[0.12em] text-[#8a4e37]">
                    SAVE {discount}%
                  </span>
                </>
              )}
            </div>

            <p className="mt-2 text-sm text-[#999]">
              Inclusive of all applicable taxes
            </p>

            <div className="my-7 h-px bg-[#eae8e4]" />

            {/* SHORT DESCRIPTION */}

            {product.shortDescription && (
              <p className="text-sm leading-7 text-[#666]">
                {product.shortDescription}
              </p>
            )}

            {/* COLORS */}

            {colorOptions.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm tracking-[0.16em]">
                    COLOR
                  </p>

                  <span className="text-sm text-[#777]">
                    {selectedColor || "Select a color"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color) => {
                    const isSelected =
                      selectedColor === color.value;

                    const colorMatches = matchingVariants(
                      color.value,
                      selectedSize
                    );

                    const unavailable =
                      hasVariants && colorMatches.length === 0;

                    return (
                      <button
                        key={color.id}
                        onClick={() => changeColor(color)}
                        disabled={unavailable}
                        title={color.value}
                        aria-label={`Select ${color.value}`}
                        className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border p-1 transition ${
                          isSelected
                            ? "border-[#171717]"
                            : "border-[#e5e3df]"
                        } ${
                          unavailable
                            ? "cursor-not-allowed opacity-35"
                            : "hover:border-[#777]"
                        }`}
                      >
                        {color.image ? (
                          <img
                            src={color.image}
                            alt={color.value}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="h-full w-full rounded-full border border-black/5"
                            style={{
                              backgroundColor: color.value,
                            }}
                          />
                        )}

                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/10">
                            <Check
                              size={16}
                              className="text-white drop-shadow"
                            />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SIZES */}

            {sizeOptions.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm tracking-[0.16em]">
                    SIZE
                  </p>

                  <span className="text-sm text-[#777]">
                    {selectedSize || "Select a size"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => {
                    const isSelected =
                      selectedSize === size.value;

                    const sizeMatches = matchingVariants(
                      selectedColor,
                      size.value
                    );

                    const unavailable =
                      hasVariants && sizeMatches.length === 0;

                    return (
                      <button
                        key={size.id}
                        onClick={() => changeSize(size)}
                        disabled={unavailable}
                        className={`flex min-w-[58px] items-center justify-center border px-4 py-3 text-sm tracking-wide transition ${
                          isSelected
                            ? "border-[#171717] bg-[#171717] text-white"
                            : "border-[#dedbd6] hover:border-[#171717]"
                        } ${
                          unavailable
                            ? "cursor-not-allowed opacity-35"
                            : ""
                        }`}
                      >
                        {size.sizeSymbol || size.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VARIANT DETAILS */}

            {selectedVariant && (
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm tracking-wide text-[#888]">
                {selectedVariant.sku && (
                  <span>SKU: <strong className="font-bold text-[#333]">{selectedVariant.sku}</strong></span>
                )}

                <span>{selectedVariant.name}</span>
              </div>
            )}

            {/* STOCK */}

            <div className="mt-8 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  availableStock > 0
                    ? "bg-[#63876b]"
                    : "bg-[#b45b50]"
                }`}
              />

              <span className="text-sm tracking-wide text-[#666]">
                {availableStock > 0
                  ? availableStock <= 5
                    ? `Only ${availableStock} left in stock`
                    : "In stock and ready to ship"
                  : "Currently unavailable"}
              </span>
            </div>

            {/* QUANTITY */}

            <div className="mt-7">
              <p className="mb-3 text-sm tracking-[0.16em]">
                QUANTITY
              </p>

              <div className="inline-flex h-12 items-center border border-[#dedbd6]">
                <button
                  onClick={() =>
                    setQuantity((current) =>
                      Math.max(1, current - 1)
                    )
                  }
                  disabled={quantity <= 1}
                  className="flex h-full w-12 items-center justify-center transition hover:bg-[#f5f4f1] disabled:opacity-30"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>

                <span className="flex w-12 justify-center text-sm">
                  {quantity}
                </span>

                <button
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(availableStock, current + 1)
                    )
                  }
                  disabled={quantity >= availableStock}
                  className="flex h-full w-12 items-center justify-center transition hover:bg-[#f5f4f1] disabled:opacity-30"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {/* ACTION BUTTONS */}

            <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr]">
              <button
                onClick={() => addToCart(false)}
                disabled={
                  addingToCart ||
                  availableStock <= 0 ||
                  (hasVariants && !selectedVariant)
                }
                className="flex min-h-[55px] items-center justify-center gap-3 border border-[#171717] bg-white px-5 text-sm tracking-[0.16em] transition hover:bg-[#f5f4f1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingBag size={17} strokeWidth={1.5} />
                {addingToCart ? "ADDING..." : "ADD TO BAG"}
              </button>

              <button
                onClick={() => addToCart(true)}
                disabled={
                  addingToCart ||
                  availableStock <= 0 ||
                  (hasVariants && !selectedVariant)
                }
                className="flex min-h-[55px] items-center justify-center gap-3 bg-[#171717] px-5 text-sm tracking-[0.16em] text-white transition hover:bg-[#444] disabled:cursor-not-allowed disabled:opacity-40"
              >
                BUY NOW
                <ArrowRight size={16} />
              </button>
            </div>

            {cartMessage && (
              <p
                role="status"
                className="mt-4 text-[12px] text-[#63876b]"
              >
                {cartMessage}
              </p>
            )}

            {/* DELIVERY INFORMATION */}

            <div className="mt-9 border-y border-[#eae8e4]">
              <div className="flex items-center gap-4 border-b border-[#eae8e4] py-5">
                <Truck size={20} strokeWidth={1.3} />

                <div>
                  <p className="text-sm tracking-[0.1em]">
                    FREE SHIPPING
                  </p>

                  <p className="mt-1 text-sm text-[#888]">
                    Delivery options and timelines are confirmed at checkout.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-b border-[#eae8e4] py-5">
                <ShieldCheck size={20} strokeWidth={1.3} />

                <div>
                  <p className="text-sm tracking-[0.1em]">
                    SECURE CHECKOUT
                  </p>

                  <p className="mt-1 text-sm text-[#888]">
                    Your order information is protected.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-5">
                <RotateCcw size={20} strokeWidth={1.3} />

                <div>
                  <p className="text-sm tracking-[0.1em]">
                    CUSTOMER SUPPORT
                  </p>

                  <p className="mt-1 text-sm text-[#888]">
                    Our team is available to help with your order.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT DETAILS TABS */}

        <section className="border-t border-[#eae8e4]">
          <div className="mx-auto max-w-[1500px] px-5 py-14 md:px-10">
            <div className="flex gap-8 border-b border-[#eae8e4]">
              <button
                onClick={() => setActiveTab("description")}
                className={`pb-4 text-sm tracking-[0.15em] transition ${
                  activeTab === "description"
                    ? "border-b border-[#171717] text-[#171717]"
                    : "text-[#999]"
                }`}
              >
                DESCRIPTION
              </button>

              <button
                onClick={() => setActiveTab("reviews")}
                className={`pb-4 text-sm tracking-[0.15em] transition ${
                  activeTab === "reviews"
                    ? "border-b border-[#171717] text-[#171717]"
                    : "text-[#999]"
                }`}
              >
                REVIEWS ({product.reviewCount})
              </button>
            </div>

            {activeTab === "description" ? (
              <div className="max-w-3xl py-9">
                <h2 className="text-xl font-light tracking-wide">
                  Product Description
                </h2>

                <div className="mt-5 whitespace-pre-line text-sm leading-8 text-[#666]">
                  {product.description ||
                    product.shortDescription ||
                    "Product details will be updated soon."}
                </div>

                {product.sku && (
                  <p className="mt-8 text-sm text-[#999]">
                    Product SKU: <strong className="font-bold text-[#333]">{product.sku}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="max-w-3xl py-9">
                {product.reviews.length === 0 ? (
                  <p className="text-sm text-[#888]">
                    No reviews available for this product yet.
                  </p>
                ) : (
                  <div className="space-y-8">
                    {product.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="border-b border-[#eae8e4] pb-7"
                      >
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map(
                            (_, index) => (
                              <Star
                                key={index}
                                size={13}
                                fill={
                                  index < review.rating
                                    ? "#171717"
                                    : "none"
                                }
                                className={
                                  index < review.rating
                                    ? "text-[#171717]"
                                    : "text-[#ccc]"
                                }
                              />
                            )
                          )}
                        </div>

                        {review.title && (
                          <h3 className="mt-3 text-sm">
                            {review.title}
                          </h3>
                        )}

                        {review.comment && (
                          <p className="mt-2 text-sm leading-7 text-[#666]">
                            {review.comment}
                          </p>
                        )}

                        <p className="mt-3 text-sm tracking-wide text-[#999]">
                          {review.customer.firstName}{" "}
                          {review.customer.lastName || ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FULL SCREEN IMAGE VIEWER */}

      {viewerOpen && productImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 md:p-10"
          onClick={() => setViewerOpen(false)}
        >
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/10"
            aria-label="Close image viewer"
          >
            <X size={22} />
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              previousImage();
            }}
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/10 md:left-8"
            aria-label="Previous image"
          >
            <ChevronLeft size={30} />
          </button>

          <img
            src={selectedImageUrl}
            alt={product.name}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] max-w-[85vw] object-contain"
          />

          <button
            onClick={(event) => {
              event.stopPropagation();
              nextImage();
            }}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/10 md:right-8"
            aria-label="Next image"
          >
            <ChevronRight size={30} />
          </button>

          <div className="absolute bottom-5 text-sm tracking-[0.15em] text-white/70">
            {selectedImage + 1} / {productImages.length}
          </div>
        </div>
      )}

      <StorefrontFooter />
    </>
  );
}
