
"use client";

import {
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  Upload,
  Ruler,
} from "lucide-react";

import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";
import ProductReviewForm from "@/components/storefront/product-review-form";

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
  stockTracked: boolean;
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
    images: { id: string; url: string }[];
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
  packSize: number;
  color: string;
  sizeBreakdown: {
    size: string;
    quantity: number;
    variantId: string | null;
  }[];
  frontImageUrl: string;
  backImageUrl: string;
  textOnlyDesign: boolean;
  customizationNotes: string;
};

const CART_STORAGE_KEY = "hover-up-cart";
const BUY_NOW_STORAGE_KEY = "hover-up-buy-now";
const WISHLIST_STORAGE_KEY = "hover-up-wishlist";

const PACK_PRICES: Record<number, number> = {
  2: 1399,
  5: 3250,
  10: 6250,
  15: 9100,
  20: 11700,
  50: 27600,
  75: 39100,
  100: 50100,
};

const PACK_SIZES = Object.keys(PACK_PRICES).map(Number);

const MAX_CUSTOMIZATION_FILE_SIZE = 8 * 1024 * 1024;

function formatPrice(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function renderInlineDescription(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-[#171717]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderProductDescription(description: string) {
  const blocks = description
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const heading = block.match(/^(#{1,6})\s+(.+)$/);

    if (heading) {
      const level = heading[1].length;
      const className =
        level <= 2
          ? "mb-3 mt-8 text-lg font-semibold tracking-tight text-[#171717]"
          : "mb-2 mt-6 text-base font-semibold text-[#171717]";

      return (
        <h3 key={index} className={className}>
          {renderInlineDescription(heading[2])}
        </h3>
      );
    }

    return (
      <p key={index} className="mb-4 text-[14px] leading-8 text-[#626262]">
        {renderInlineDescription(block.replace(/\n/g, " "))}
      </p>
    );
  });
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

function ProductDetailContent({
  slug,
}: {
  slug: string;
}) {
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [selectedVariant, setSelectedVariant] =
    useState<Variant | null>(null);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const [selectedImage, setSelectedImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [selectedPack, setSelectedPack] = useState(2);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [textOnlyDesign, setTextOnlyDesign] = useState(false);
  const [customizationNotes, setCustomizationNotes] = useState("");
  const [wishlist, setWishlist] = useState(false);

  const [cartMessage, setCartMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "description" | "reviews"
  >("description");

  // FETCH PRODUCT

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    async function fetchProduct() {
      try {
        setLoading(true);
        setError("");
        setErrorStatus(null);

        const response = await fetch(
          `/api/products/${encodeURIComponent(slug)}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (!cancelled) setErrorStatus(response.status);
          throw new Error(
            data.error || (response.status === 404
              ? "This product is unavailable or has been removed."
              : "A server or database error prevented this product from loading. Please try again.")
          );
        }

        if (!cancelled) {
          setProduct(data.product);
          setSelectedVariant(null);
          setSelectedColor("");
          setSelectedSize("");
          setSelectedImage(0);
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
  }, [slug, retryCount]);

  // COLOR OPTIONS

  const colorOptions = useMemo(() => {
    if (!product) return [];

    return product.attributes
      .map((item) => item.attributeValue)
      .filter((value) => value.termType === "COLOR");
  }, [product]);

  // SIZE OPTIONS

  const sizeOptions = useMemo(() => {
    if (!product) return [];

    const order: Record<string, number> = {
      S: 1,
      M: 2,
      L: 3,
      XL: 4,
      XXL: 5,
      "2XL": 5,
      "3XL": 6,
      "4XL": 7,
    };

    const configuredSizes = product.attributes
      .map((item) => item.attributeValue)
      .filter((value) => value.termType === "SIZE");

    const fallbackSizes: AttributeValue[] = [
      { id: "default-size-s", value: "41", image: null, sizeSymbol: "S", termType: "SIZE", attribute: { id: "default-size", name: "Size", slug: "size" } },
      { id: "default-size-m", value: "43", image: null, sizeSymbol: "M", termType: "SIZE", attribute: { id: "default-size", name: "Size", slug: "size" } },
      { id: "default-size-l", value: "45", image: null, sizeSymbol: "L", termType: "SIZE", attribute: { id: "default-size", name: "Size", slug: "size" } },
      { id: "default-size-xl", value: "47", image: null, sizeSymbol: "XL", termType: "SIZE", attribute: { id: "default-size", name: "Size", slug: "size" } },
      { id: "default-size-2xl", value: "49", image: null, sizeSymbol: "2XL", termType: "SIZE", attribute: { id: "default-size", name: "Size", slug: "size" } },
    ];

    return (configuredSizes.length > 0 ? configuredSizes : fallbackSizes)
      .sort((a, b) => {
        const aSymbol = (a.sizeSymbol || a.value).toUpperCase();
        const bSymbol = (b.sizeSymbol || b.value).toUpperCase();
        return (order[aSymbol] ?? 99) - (order[bSymbol] ?? 99) ||
          a.value.localeCompare(b.value, undefined, { numeric: true });
      });
  }, [product]);

  // PRODUCT IMAGES

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

  // KEEP IMAGE INDEX VALID WHEN VARIANT IMAGES CHANGE

  useEffect(() => {
    setSelectedImage((current) =>
      productImages.length > 0
        ? Math.min(current, productImages.length - 1)
        : 0
    );
  }, [productImages.length]);

  // PRICE

  const currentPrice = PACK_PRICES[selectedPack] ?? 0;
  const selectedSizeTotal = Object.values(sizeQuantities).reduce(
    (total, value) => total + value,
    0
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

  // STOCK

  const availableStock = !product?.stockTracked
    ? Number.POSITIVE_INFINITY
    : selectedVariant
      ? getAvailableStock(selectedVariant)
      : product?.totalStock ?? 0;

  const selectedImageUrl =
    productImages[selectedImage]?.url ?? "";

  const hasVariants =
    (product?.variants.length ?? 0) > 0;

  // VARIANT ATTRIBUTE VALUES

  const variantAttributeValues = selectedVariant
    ? getVariantAttributeValues(selectedVariant.attributes)
    : [];

  // MATCH VARIANTS

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

        const sizeTerm = sizeOptions.find(
          (option) =>
            option.value.toLowerCase() === size.toLowerCase() ||
            (option.sizeSymbol || "").toLowerCase() === size.toLowerCase()
        );

        const sizeCandidates = sizeTerm
          ? [sizeTerm.value, sizeTerm.sizeSymbol].filter(
              (value): value is string => Boolean(value)
            )
          : [size];

        const sizeMatches =
          !size ||
          values.some((value) =>
            sizeCandidates.some(
              (candidate) => value.toLowerCase() === candidate.toLowerCase()
            )
          );

        return colorMatches && sizeMatches;
      });
    },
    [product, sizeOptions]
  );

  // LOAD WISHLIST

  useEffect(() => {
    if (!product) return;

    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);

      if (stored) {
        const items: string[] = JSON.parse(stored);
        setWishlist(items.includes(product.id));
      } else {
        setWishlist(false);
      }
    } catch {
      setWishlist(false);
    }
  }, [product]);

  // SYNC SELECTED VARIANT OPTIONS

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

    if (matchingColor) {
      setSelectedColor(matchingColor.value);
    }

    if (matchingSize) {
      setSelectedSize(matchingSize.value);
    }
  }, [
    selectedVariant,
    product,
    colorOptions,
    sizeOptions,
  ]);

  // FULL SCREEN VIEWER KEYBOARD CONTROLS

  useEffect(() => {
    if (!viewerOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewerOpen(false);
      }

      if (event.key === "ArrowRight") {
        setSelectedImage((current) =>
          productImages.length > 0
            ? (current + 1) % productImages.length
            : 0
        );
      }

      if (event.key === "ArrowLeft") {
        setSelectedImage((current) =>
          productImages.length > 0
            ? (current - 1 + productImages.length) %
              productImages.length
            : 0
        );
      }
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [viewerOpen, productImages.length]);

  // CHANGE COLOR

  function changeColor(color: AttributeValue) {
    setSelectedColor(color.value);
    setSelectedImage(0);
    setQuantity(1);
    setCartMessage("");

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

  // CHANGE SIZE

  function changeSize(size: AttributeValue) {
    setSelectedSize(size.value);
    setSelectedImage(0);
    setQuantity(1);
    setCartMessage("");

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

  // TOGGLE WISHLIST

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

  // ADD TO CART

  async function uploadCustomizationImage(file: File, side: "front" | "back") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("side", side);

    const response = await fetch("/api/customization-uploads", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(data.error || `Unable to upload the ${side} image.`);
    }

    return data.url as string;
  }

  async function addToCart(goToCart = false) {
    if (!product) return;

    if (colorOptions.length > 0 && !selectedColor) {
      setCartMessage("Please select a color.");
      return;
    }

    if (sizeOptions.length === 0) {
      setCartMessage("Please add size options to this product before ordering packs.");
      return;
    }

    if (selectedSizeTotal !== selectedPack) {
      setCartMessage(`Please allocate exactly ${selectedPack} item(s) across the sizes. Currently selected: ${selectedSizeTotal}.`);
      return;
    }

    if (textOnlyDesign && !customizationNotes.trim()) {
      setCartMessage("Tell us what text or design you want our team to create.");
      return;
    }

    const allocations = sizeOptions
      .map((size) => {
        const sizeQuantity = sizeQuantities[size.value] ?? 0;
        const matches = matchingVariants(selectedColor, size.value);
        const variant = matches[0] ?? null;

        return {
          size: size.value,
          quantity: sizeQuantity,
          variantId: variant?.id ?? null,
          variant,
        };
      })
      .filter((item) => item.quantity > 0);

    if (hasVariants && allocations.some((item) => !item.variant)) {
      setCartMessage("One or more selected sizes are unavailable for this color.");
      return;
    }

    const unavailableAllocation = allocations.find((item) => {
      if (!item.variant) return false;
      return getAvailableStock(item.variant) < item.quantity;
    });

    if (unavailableAllocation) {
      setCartMessage(`Not enough stock available for size ${unavailableAllocation.size}.`);
      return;
    }

    for (const file of [frontImageFile, backImageFile].filter((file): file is File => Boolean(file))) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setCartMessage("Upload JPG, PNG, or WEBP images only.");
        return;
      }
      if (file.size > MAX_CUSTOMIZATION_FILE_SIZE) {
        setCartMessage("Each design image must be 8 MB or smaller.");
        return;
      }
    }

    setAddingToCart(true);
    setCartMessage(frontImageFile || backImageFile ? "Uploading your design images..." : "Adding your pack...");

    try {
      const [frontImageUrl, backImageUrl] = await Promise.all([
        frontImageFile ? uploadCustomizationImage(frontImageFile, "front") : Promise.resolve(""),
        backImageFile ? uploadCustomizationImage(backImageFile, "back") : Promise.resolve(""),
      ]);

      const stored = localStorage.getItem(CART_STORAGE_KEY);
      const cart: CartEntry[] = stored ? JSON.parse(stored) : [];

      const entry: CartEntry = {
        productId: product.id,
        variantId: null,
        name: product.name,
        slug: product.slug,
        price: currentPrice,
        image: selectedImageUrl,
        quantity: selectedPack,
        variantName: selectedColor || null,
        packSize: selectedPack,
        color: selectedColor,
        sizeBreakdown: allocations.map(({ size, quantity: sizeQuantity, variantId }) => ({
          size,
          quantity: sizeQuantity,
          variantId,
        })),
        frontImageUrl,
        backImageUrl,
        textOnlyDesign,
        customizationNotes: customizationNotes.trim(),
      };

      if (goToCart) {
        localStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify([entry]));
        router.push("/checkout");
      } else {
        localStorage.removeItem(BUY_NOW_STORAGE_KEY);
        // Keep separately configured packs/customizations as separate cart lines.
        cart.push(entry);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        setCartMessage("Your customized pack has been added to your bag.");
      }
    } catch (err) {
      setCartMessage(
        err instanceof Error ? err.message : "Unable to add this pack to your bag."
      );
    } finally {
      setAddingToCart(false);
    }
  }

  // IMAGE NAVIGATION

  function previousImage() {
    if (productImages.length <= 1) return;

    setSelectedImage(
      (current) =>
        (current - 1 + productImages.length) %
        productImages.length
    );
  }

  function nextImage() {
    if (productImages.length <= 1) return;

    setSelectedImage(
      (current) => (current + 1) % productImages.length
    );
  }

  // LOADING STATE

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

  // PRODUCT NOT FOUND

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
            {errorStatus === 404 ? "Product Not Found" : "Unable to Load Product"}
          </h1>

          <p className="mt-3 max-w-md text-sm text-[#777]">
            {error ||
              "The product you are looking for may have been removed or is unavailable."}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {errorStatus !== 404 && (
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="inline-flex items-center gap-3 bg-[#171717] px-8 py-4 text-xs tracking-[0.16em] text-white transition hover:bg-[#444]"
              >
                TRY AGAIN
              </button>
            )}
            <Link
              href="/shop"
              className="inline-flex items-center gap-3 border border-[#171717] px-8 py-4 text-xs tracking-[0.16em] text-[#171717] transition hover:bg-[#f5f3ef]"
            >
              <ArrowLeft size={15} />
              BACK TO SHOP
            </Link>
          </div>
        </main>

        <StorefrontFooter />
      </>
    );
  }

  // PRODUCT PAGE

  return (
    <>
      <StorefrontHeader />

      <main className="bg-white text-[#171717]">
        {/* BREADCRUMB */}

        <div className="mx-auto max-w-[1500px] px-5 pt-7 md:px-10">
          <div className="flex flex-wrap items-center gap-2 text-[10px] tracking-[0.12em] text-[#888]">
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
                      className="h-full w-full object-contain object-center p-1"
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
                      className="h-full w-full object-contain object-center p-4"
                    />
                  </button>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#999]">
                    No product image available
                  </div>
                )}

                {discount > 0 && (
                  <span className="absolute left-4 top-4 bg-[#171717] px-3 py-2 text-[10px] tracking-[0.12em] text-white">
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
                  disabled={!selectedImageUrl}
                  className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 transition hover:bg-white disabled:opacity-40"
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

                <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-2 text-[10px] tracking-[0.12em]">
                  {String(
                    productImages.length > 0 ? selectedImage + 1 : 0
                  ).padStart(2, "0")}{" "}
                  / {String(productImages.length).padStart(2, "0")}
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
              <p className="text-[10px] tracking-[0.22em] text-[#999]">
                {product.categories[0].category.name.toUpperCase()}
              </p>
            )}

            <h1 className="mt-3 text-[27px] font-bold leading-[1.25] tracking-[0.015em] md:text-[35px]">
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

                <span className="text-[11px] text-[#777]">
                  {product.averageRating.toFixed(1)} (
                  {product.reviewCount} reviews)
                </span>
              </div>
            )}

            {/* PRICE */}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="text-[25px] font-bold tracking-wide">
                {formatPrice(currentPrice)}
              </span>
              <span className="text-[10px] tracking-[0.12em] text-[#777]">
                PACK PRICE
              </span>

              {false && currentComparePrice > currentPrice && (
                <>
                  <span className="text-[15px] text-[#999] line-through">
                    {formatPrice(currentComparePrice)}
                  </span>

                  <span className="text-[10px] tracking-[0.12em] text-[#8a4e37]">
                    SAVE {discount}%
                  </span>
                </>
              )}
            </div>

            <p className="mt-2 text-[11px] text-[#999]">
              Inclusive of all applicable taxes
            </p>

            <div className="my-7 h-px bg-[#eae8e4]" />

            {/* SHORT DESCRIPTION */}

            {product.shortDescription && (
              <p className="text-[13px] leading-7 text-[#666]">
                {product.shortDescription}
              </p>
            )}

            {/* COLORS */}

            {colorOptions.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] tracking-[0.16em]">
                    COLOR
                  </p>

                  <span className="text-[11px] text-[#777]">
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

            {/* PACK SELECTION */}

            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] tracking-[0.16em]">SELECT PACK</p>
                <span className="text-[11px] text-[#777]">
                  {selectedPack} pieces · {formatPrice(currentPrice)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PACK_SIZES.map((packSize) => (
                  <button
                    key={packSize}
                    type="button"
                    onClick={() => {
                      setSelectedPack(packSize);
                      setSizeQuantities({});
                      setCartMessage("");
                    }}
                    className={`border px-3 py-3 text-left transition ${
                      selectedPack === packSize
                        ? "border-[#171717] bg-[#171717] text-white"
                        : "border-[#dedbd6] hover:border-[#171717]"
                    }`}
                  >
                    <span className="block text-[11px] tracking-wide">Pack of {packSize}</span>
                    <span className={`mt-1 block text-sm ${selectedPack === packSize ? "text-white" : "text-[#555]"}`}>
                      {formatPrice(PACK_PRICES[packSize])}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* SIZE-WISE QUANTITY */}

            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[11px] tracking-[0.16em]">SELECT SIZE QUANTITIES</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setSizeGuideOpen(true)} className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#765238] underline underline-offset-4 hover:text-[#171717]">
                    <Ruler size={13} /> SIZE GUIDE
                  </button>
                  <span className="text-[11px] text-[#777]">
                    {selectedSizeTotal} / {selectedPack} selected
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {sizeOptions.map((size) => {
                  const sizeQuantity = sizeQuantities[size.value] ?? 0;
                  const matches = matchingVariants(selectedColor, size.value);
                  const variant = matches[0] ?? null;
                  const stock = variant ? getAvailableStock(variant) : 0;
                  const unavailable = hasVariants && !variant;
                  const atPackLimit = selectedSizeTotal >= selectedPack;
                  const atStockLimit = !hasVariants && selectedSizeTotal >= availableStock;

                  return (
                    <div key={size.id} className="flex items-center justify-between border border-[#e7e4df] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {size.sizeSymbol
                            ? `${size.sizeSymbol === "XXL" ? "2XL" : size.sizeSymbol} · ${size.value}`
                            : size.value}
                        </p>
                        {hasVariants && (
                          <p className="mt-1 text-[10px] text-[#999]">
                            {unavailable ? "Unavailable" : !product?.stockTracked ? "Available to order" : `${stock} available`}
                          </p>
                        )}
                      </div>

                      <div className="inline-flex h-9 items-center border border-[#dedbd6]">
                        <button
                          type="button"
                          onClick={() => {
                            setSizeQuantities((current) => ({
                              ...current,
                              [size.value]: Math.max(0, (current[size.value] ?? 0) - 1),
                            }));
                            setCartMessage("");
                          }}
                          disabled={sizeQuantity <= 0}
                          className="flex h-full w-9 items-center justify-center disabled:opacity-30"
                          aria-label={`Decrease ${size.value} quantity`}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="flex w-9 justify-center text-sm">{sizeQuantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSizeQuantities((current) => {
                              const currentTotal = Object.values(current).reduce(
                                (total, value) => total + value,
                                0
                              );
                              const currentSizeQuantity = current[size.value] ?? 0;

                              if (
                                currentTotal >= selectedPack ||
                                (!hasVariants && currentTotal >= availableStock) ||
                                unavailable ||
                                (hasVariants && currentSizeQuantity >= stock)
                              ) {
                                return current;
                              }

                              return {
                                ...current,
                                [size.value]: currentSizeQuantity + 1,
                              };
                            });
                            setCartMessage("");
                          }}
                          disabled={unavailable || atPackLimit || atStockLimit || (hasVariants && sizeQuantity >= stock)}
                          className="flex h-full w-9 items-center justify-center disabled:opacity-30"
                          aria-label={`Increase ${size.value} quantity`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-[#777]">Allocate all pieces to continue</span>
                <span className={selectedSizeTotal === selectedPack ? "text-[#63876b]" : "text-[#a16b42]"}>
                  {selectedSizeTotal === selectedPack ? "Pack complete" : `${selectedPack - selectedSizeTotal} remaining`}
                </span>
              </div>
            </div>

            {/* DESIGN IMAGE UPLOADS */}

            <div className="mt-8 rounded-xl border border-[#e8e1d7] bg-[#faf8f5] p-4">
              <p className="text-xs font-semibold text-[#4f463d]">We’ll send your design for approval</p>
              <p className="mt-1 text-[11px] leading-5 text-[#82766a]">After your order is placed and confirmed, our team will share the design with you before production.</p>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.16em]">YOUR LOGO / DESIGN</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e7e2da] bg-white p-4 transition hover:border-[#765238]">
                <input type="checkbox" checked={textOnlyDesign} onChange={(event) => { const enabled = event.target.checked; setTextOnlyDesign(enabled); if (enabled) { setFrontImageFile(null); setBackImageFile(null); } }} className="mt-0.5 h-4 w-4 accent-[#765238]" />
                <span>
                  <span className="block text-xs font-semibold text-[#171717]">I don’t have a logo — create a design using my text</span>
                  <span className="mt-1 block text-[11px] leading-5 text-[#888]">No problem. Tell us what you want, and our team will create a design and share it for your approval.</span>
                </span>
              </label>
              {!textOnlyDesign && (
              <>
              <p className="mb-4 mt-5 text-[11px] tracking-[0.16em]">UPLOAD FRONT AND BACK LOGOS</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="cursor-pointer border border-dashed border-[#cfcac2] p-4 transition hover:border-[#171717]">
                  <span className="block text-[11px] font-semibold tracking-[0.12em]">FRONT DESIGN IMAGE *</span>
                  <span className="mt-2 block truncate text-[11px] text-[#777]">
                    {frontImageFile ? frontImageFile.name : "Add your front artwork"}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#765238] px-4 py-2.5 text-[10px] font-semibold tracking-[0.12em] text-white transition hover:bg-[#5f3f2b]">
                    <Upload size={14} /> {frontImageFile ? "CHANGE IMAGE" : "UPLOAD FRONT IMAGE"}
                  </span>
                      <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => setFrontImageFile(event.target.files?.[0] ?? null)}
                  />
                </label>

                <label className="cursor-pointer border border-dashed border-[#cfcac2] p-4 transition hover:border-[#171717]">
                  <span className="block text-[11px] font-semibold tracking-[0.12em]">BACK DESIGN IMAGE *</span>
                  <span className="mt-2 block truncate text-[11px] text-[#777]">
                    {backImageFile ? backImageFile.name : "Add your back artwork"}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#765238] px-4 py-2.5 text-[10px] font-semibold tracking-[0.12em] text-white transition hover:bg-[#5f3f2b]">
                    <Upload size={14} /> {backImageFile ? "CHANGE IMAGE" : "UPLOAD BACK IMAGE"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => setBackImageFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <p className="mt-2 text-[10px] text-[#999]">
                Upload the artwork you want printed on the front and back of the selected items.
              </p>
              </>
              )}
            </div>

            {/* OPTIONAL CUSTOMIZATION NOTES */}
            <div className="mt-6">
              <label htmlFor="customization-notes" className="mb-3 block text-[11px] font-semibold tracking-[0.14em]">
                {textOnlyDesign ? "TEXT / DESIGN INSTRUCTIONS" : "ANY TEXT OR CUSTOMIZATION NEEDED"} <span className="font-normal normal-case tracking-normal text-[#999]">{textOnlyDesign ? "(Required)" : "(Optional)"}</span>
              </label>
              <textarea
                id="customization-notes"
                value={customizationNotes}
                onChange={(event) => setCustomizationNotes(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={textOnlyDesign ? "Describe the text, wording, style, colours or design you want us to create..." : "Tell us about text, placement, print colors, or any special instructions..."}
                className="w-full resize-y border border-[#dedbd6] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#aaa] focus:border-[#765238] focus:ring-2 focus:ring-[#765238]/15"
              />
              <p className="mt-1 text-right text-[10px] text-[#999]">{customizationNotes.length}/1000</p>
            </div>

            {/* VARIANT DETAILS */}

            {selectedVariant && (
              <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] tracking-wide text-[#888]">
                {selectedVariant.sku && (
                  <span>SKU: {selectedVariant.sku}</span>
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

              <span className="text-[11px] tracking-wide text-[#666]">
                {availableStock > 0
                  ? availableStock <= 5
                    ? `Only ${availableStock} left in stock`
                    : "In stock and ready to ship"
                  : !product.stockTracked ? "Available to order" : "Currently unavailable"}
              </span>
            </div>

            {/* ACTION BUTTONS */}

            <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr]">
              <button
                onClick={() => addToCart(false)}
                disabled={
                  addingToCart ||
                  !product.isInStock ||
                  selectedSizeTotal !== selectedPack ||
                  (textOnlyDesign && !customizationNotes.trim())
                }
                className="flex min-h-[55px] items-center justify-center gap-3 border border-[#171717] bg-white px-5 text-[10px] tracking-[0.16em] transition hover:bg-[#f5f4f1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingBag size={17} strokeWidth={1.5} />
                {addingToCart ? "ADDING..." : "ADD TO BAG"}
              </button>

              <button
                onClick={() => addToCart(true)}
                disabled={
                  addingToCart ||
                  !product.isInStock ||
                  selectedSizeTotal !== selectedPack ||
                  (textOnlyDesign && !customizationNotes.trim())
                }
                className="flex min-h-[55px] items-center justify-center gap-3 bg-[#171717] px-5 text-[10px] tracking-[0.16em] text-white transition hover:bg-[#444] disabled:cursor-not-allowed disabled:opacity-40"
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
                  <p className="text-[11px] tracking-[0.1em]">
                    FREE SHIPPING
                  </p>

                  <p className="mt-1 text-[11px] text-[#888]">
                    Delivery options and timelines are confirmed at checkout.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-b border-[#eae8e4] py-5">
                <ShieldCheck size={20} strokeWidth={1.3} />

                <div>
                  <p className="text-[11px] tracking-[0.1em]">
                    SECURE CHECKOUT
                  </p>

                  <p className="mt-1 text-[11px] text-[#888]">
                    Your order information is protected.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-5">
                <RotateCcw size={20} strokeWidth={1.3} />

                <div>
                  <p className="text-[11px] tracking-[0.1em]">
                    CUSTOMER SUPPORT
                  </p>

                  <p className="mt-1 text-[11px] text-[#888]">
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
                className={`pb-4 text-[11px] tracking-[0.15em] transition ${
                  activeTab === "description"
                    ? "border-b border-[#171717] text-[#171717]"
                    : "text-[#999]"
                }`}
              >
                DESCRIPTION
              </button>

              <button
                onClick={() => setActiveTab("reviews")}
                className={`pb-4 text-[11px] tracking-[0.15em] transition ${
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

                <div className="mt-5">
                  {product.description
                    ? renderProductDescription(product.description)
                    : (
                      <p className="text-[14px] leading-8 text-[#626262]">
                        {product.shortDescription || "Product details will be updated soon."}
                      </p>
                    )}
                </div>

                {product.sku && (
                  <p className="mt-8 text-[11px] text-[#999]">
                    Product SKU: {product.sku}
                  </p>
                )}
              </div>
            ) : (
              <div className="max-w-3xl py-9">
                <ProductReviewForm slug={product.slug} />
                {product.reviews.length === 0 ? (
                  <p className="text-[13px] text-[#888]">
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
                          <p className="mt-2 text-[13px] leading-7 text-[#666]">
                            {review.comment}
                          </p>
                        )}

                        {review.images?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-3">
                            {review.images.map((image) => (
                              <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="h-20 w-20 overflow-hidden rounded-lg border border-[#e8e3dc]">
                                <img src={image.url} alt="Customer review" className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}

                        <p className="mt-3 text-[10px] tracking-wide text-[#999]">
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

      {/* SIZE GUIDE */}

      {sizeGuideOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onClick={() => setSizeGuideOpen(false)}>
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#765238]">SIZE REFERENCE</p>
                <h2 className="mt-2 text-xl font-semibold">Available sizes</h2>
                <p className="mt-1 text-xs text-[#888]">Choose the size values configured for this product.</p>
              </div>
              <button type="button" onClick={() => setSizeGuideOpen(false)} aria-label="Close size guide" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f2ed] text-[#65594d]"><X size={17} /></button>
            </div>
            <div className="mt-5 divide-y divide-[#eee9e2] rounded-xl border border-[#eee9e2]">
              {sizeOptions.map((size) => (
                <div key={size.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-semibold">{size.sizeSymbol === "XXL" ? "2XL" : size.sizeSymbol || size.value}</span>
                  <span className="text-[#777]">{size.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

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

          <div className="absolute bottom-5 text-[11px] tracking-[0.15em] text-white/70">
            {selectedImage + 1} / {productImages.length}
          </div>
        </div>
      )}

      <StorefrontFooter />
    </>
  );
}


function ProductDetailParams({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return <ProductDetailContent slug={slug} />;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
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
              </div>
            </div>
          </main>
          <StorefrontFooter />
        </>
      }
    >
      <ProductDetailParams params={params} />
    </Suspense>
  );
}