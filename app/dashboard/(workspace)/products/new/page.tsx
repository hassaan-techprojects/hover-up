
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  ImagePlus,
  X,
  Plus,
  Search,
  ChevronDown,
  Package,
  Layers,
  Tag,
  Trash2,
  RefreshCw,
  Info,
} from "lucide-react";

type AttributeTerm = {
  id: string;
  value: string;
  termType: "COLOR";
  image?: string | null;
};

type Attribute = {
  id: string;
  name: string;
  slug: string;
  values: AttributeTerm[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Variation = {
  id: string;
  attributes: Record<string, AttributeTerm>;
  sku: string;
  regularPrice: string;
  salePrice: string;
  stock: string;
};

type ProductImageFile = {
  id: string;
  file: File;
  preview: string;
  altText: string;
};


function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AddProductPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [sku, setSku] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("0");

  const [images, setImages] = useState<ProductImageFile[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string[]>
  >({});
  const [variations, setVariations] = useState<Variation[]>([]);

  const [attributeSearch, setAttributeSearch] = useState("");
  const [showAttributeDropdown, setShowAttributeDropdown] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">("DRAFT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredAttributes = useMemo(() => {
    const query = attributeSearch.trim().toLowerCase();

    return attributes.filter((attribute) => {
      const alreadySelected = Object.keys(selectedAttributes).includes(
        attribute.id
      );

      return !alreadySelected && attribute.name.toLowerCase().includes(query);
    });
  }, [attributes, attributeSearch, selectedAttributes]);

  const selectedAttributeList = useMemo(
    () =>
      attributes.filter((attribute) =>
        Object.prototype.hasOwnProperty.call(
          selectedAttributes,
          attribute.id
        )
      ),
    [attributes, selectedAttributes]
  );

  const totalCombinations = useMemo(() => {
    const counts = selectedAttributeList.map(
      (attribute) => selectedAttributes[attribute.id]?.length ?? 0
    );

    if (!counts.length || counts.some((count) => count === 0)) return 0;

    return counts.reduce((total, count) => total * count, 1);
  }, [selectedAttributeList, selectedAttributes]);

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      setError("");

      const [attributeResponse, categoryResponse] = await Promise.all([
        fetch("/api/dashboard/attributes", { cache: "no-store" }),
        fetch("/api/dashboard/categories", { cache: "no-store" }),
      ]);

      const attributeData = await attributeResponse.json();
      const categoryData = await categoryResponse.json();

      if (!attributeResponse.ok) {
        throw new Error(
          attributeData.error || "Unable to load attributes."
        );
      }

      if (!categoryResponse.ok) {
        throw new Error(
          categoryData.error || "Unable to load categories."
        );
      }

      setAttributes((attributeData.attributes ?? []).map((attribute: Attribute) => ({ ...attribute, values: attribute.values.filter((term) => term.termType === "COLOR") })).filter((attribute: Attribute) => attribute.values.length > 0));
      setCategories(categoryData.categories ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load product options."
      );
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  function handleNameChange(value: string) {
    setName(value);

    if (!slugEdited) {
      setSlug(createSlug(value));
    }
  }

  function handleImageChange(files: FileList | null) {
    if (!files) return;

    const selectedFiles = Array.from(files);
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    const invalidFile = selectedFiles.find(
      (file) => !allowedTypes.includes(file.type)
    );

    if (invalidFile) {
      setError("Only JPG, PNG and WEBP images are allowed.");
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > 5 * 1024 * 1024
    );

    if (oversizedFile) {
      setError("Each product image must be smaller than 5 MB.");
      return;
    }

    setError("");

    const newImages = selectedFiles.map((file) => ({
      id: createId(),
      file,
      preview: URL.createObjectURL(file),
      altText: file.name.replace(/\.[^/.]+$/, ""),
    }));

    setImages((current) => [...current, ...newImages]);
  }

  function removeImage(id: string) {
    setImages((current) => {
      const image = current.find((item) => item.id === id);

      if (image) URL.revokeObjectURL(image.preview);

      return current.filter((item) => item.id !== id);
    });
  }

  function moveImage(id: string, direction: -1 | 1) {
    setImages((current) => {
      const index = current.findIndex((image) => image.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  }

  function setMainImage(id: string) {
    setImages((current) => {
      const index = current.findIndex((image) => image.id === id);
      if (index <= 0) return current;
      const updated = [...current];
      const [mainImage] = updated.splice(index, 1);
      updated.unshift(mainImage);
      return updated;
    });
  }

  function addAttribute(attribute: Attribute) {
    setSelectedAttributes((current) => ({
      ...current,
      [attribute.id]: [],
    }));

    setAttributeSearch("");
    setShowAttributeDropdown(false);
  }

  function removeAttribute(attributeId: string) {
    setSelectedAttributes((current) => {
      const updated = { ...current };
      delete updated[attributeId];
      return updated;
    });

    setVariations([]);
  }

  function toggleTerm(attributeId: string, termId: string) {
    setSelectedAttributes((current) => {
      const existing = current[attributeId] ?? [];

      return {
        ...current,
        [attributeId]: existing.includes(termId)
          ? existing.filter((id) => id !== termId)
          : [...existing, termId],
      };
    });

    setVariations([]);
  }

  function selectAllTerms(attribute: Attribute) {
    setSelectedAttributes((current) => ({
      ...current,
      [attribute.id]: attribute.values.map((term) => term.id),
    }));

    setVariations([]);
  }

  function clearTerms(attributeId: string) {
    setSelectedAttributes((current) => ({
      ...current,
      [attributeId]: [],
    }));

    setVariations([]);
  }

  function generateVariations() {
    if (!selectedAttributeList.length) {
      setError("Select at least one attribute first.");
      return;
    }

    if (
      selectedAttributeList.some(
        (attribute) => !selectedAttributes[attribute.id]?.length
      )
    ) {
      setError("Select at least one term for every selected attribute.");
      return;
    }

    const combinations: Record<string, AttributeTerm>[] = [];

    function buildCombinations(
      index: number,
      current: Record<string, AttributeTerm>
    ) {
      if (index === selectedAttributeList.length) {
        combinations.push({ ...current });
        return;
      }

      const attribute = selectedAttributeList[index];

      const terms = attribute.values.filter((term) =>
        selectedAttributes[attribute.id]?.includes(term.id)
      );

      for (const term of terms) {
        current[attribute.id] = term;
        buildCombinations(index + 1, current);
      }

      delete current[attribute.id];
    }

    buildCombinations(0, {});

    const generated: Variation[] = combinations.map((combination) => {
      const combinationName = Object.values(combination)
        .map((term) => term.value)
        .join(" / ");

      return {
        id: createId(),
        attributes: combination,
        sku: sku
          ? `${sku}-${Object.values(combination)
              .map((term) => term.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
              .join("-")}`
          : "",
        regularPrice,
        salePrice,
        stock,
      };
    });

    setVariations(generated);
    setError("");
  }

  function updateVariation(
    variationId: string,
    field: "sku" | "regularPrice" | "salePrice" | "stock",
    value: string
  ) {
    setVariations((current) =>
      current.map((variation) =>
        variation.id === variationId
          ? { ...variation, [field]: value }
          : variation
      )
    );
  }

  function removeVariation(variationId: string) {
    setVariations((current) =>
      current.filter((variation) => variation.id !== variationId)
    );
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }

  async function handleSubmit(
    nextStatus: "DRAFT" | "ACTIVE" = status
  ) {
    setError("");

    if (!name.trim()) {
      setError("Product title is required.");
      return;
    }

    if (!slug.trim()) {
      setError("Product permalink is required.");
      return;
    }

    if (!regularPrice || Number(regularPrice) < 0) {
      setError("Enter a valid regular price.");
      return;
    }

    if (salePrice && Number(salePrice) < 0) {
      setError("Sale price cannot be negative.");
      return;
    }

    if (
      salePrice &&
      Number(salePrice) > 0 &&
      Number(salePrice) > Number(regularPrice)
    ) {
      setError("Sale price cannot be greater than regular price.");
      return;
    }

    if (
      selectedAttributeList.length > 0 &&
      variations.length === 0
    ) {
      setError("Generate your variations before saving the product.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("slug", slug.trim());
      formData.append("sku", sku.trim());
      formData.append("price", salePrice || regularPrice);
      formData.append("comparePrice", salePrice ? regularPrice : "");
      formData.append("stock", stock);
      formData.append("status", nextStatus);
      formData.append("isActive", nextStatus === "ACTIVE" ? "true" : "false");

      formData.append(
        "categoryIds",
        JSON.stringify(selectedCategories)
      );

      formData.append(
        "attributeSelections",
        JSON.stringify(
          Object.entries(selectedAttributes).map(([attributeId, termIds]) => ({
            attributeId,
            termIds,
          }))
        )
      );

      formData.append(
        "variations",
        JSON.stringify(
          variations.map((variation) => ({
            sku: variation.sku,
            attributes: Object.fromEntries(
              Object.entries(variation.attributes).map(
                ([attributeId, term]) => {
                  const attribute = attributes.find(
                    (item) => item.id === attributeId
                  );

                  return [
                    attribute?.name ?? attributeId,
                    {
                      id: term.id,
                      value: term.value,
                    },
                  ];
                }
              )
            ),
            regularPrice: variation.regularPrice,
            salePrice: variation.salePrice,
            stock: variation.stock,
          }))
        )
      );

      formData.append(
        "images",
        JSON.stringify(
          images.map((image) => ({
            altText: image.altText,
            isPrimary: false,
          }))
        )
      );

      images.forEach((image) => {
        formData.append("productImages", image.file);
      });

      const response = await fetch("/api/dashboard/products", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save product.");
      }

      window.location.href = "/dashboard/products";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save product."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard/products"
              className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-[#171717]"
            >
              <ArrowLeft size={16} />
              Back to Products
            </Link>

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
              Catalogue Management
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#171717] sm:text-3xl">
              Add Product
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Create and configure a new product for your store.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("DRAFT")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dedbd4] bg-white px-4 text-sm font-medium text-[#171717] transition hover:bg-gray-50 disabled:opacity-50"
            >
              Save Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("ACTIVE")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
            >
              <Save size={16} />
              {submitting ? "Saving..." : "Publish Product"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Info size={17} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* General Information */}
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f3ef]">
                  <Package size={18} className="text-[#171717]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#171717]">
                    General Information
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Product name, permalink and description.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#333]">
                    Product Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(event) =>
                      handleNameChange(event.target.value)
                    }
                    placeholder="Enter product title"
                    className="h-11 w-full rounded-lg border border-[#e8e6e1] px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#333]">
                    Permalink <span className="text-red-500">*</span>
                  </label>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-[#e8e6e1] bg-[#fcfbf9]">
                      <span className="shrink-0 border-r border-[#e8e6e1] px-3 text-xs text-gray-400">
                        /products/
                      </span>
                      <input
                        value={slug}
                        onChange={(event) => {
                          setSlug(createSlug(event.target.value));
                          setSlugEdited(true);
                        }}
                        placeholder="product-permalink"
                        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSlug(createSlug(name));
                        setSlugEdited(false);
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e8e6e1] px-4 text-sm text-gray-600 transition hover:bg-gray-50"
                    >
                      <RefreshCw size={14} />
                      Regenerate
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    Automatically generated from the product title. You can edit it.
                  </p>
                </div>

                <div className="rounded-lg border border-[#e8e6e1] bg-[#fcfbf9] p-4">
                  <p className="text-xs font-semibold text-[#333]">Shared product description</p>
                  <p className="mt-1 text-xs leading-6 text-[#888]">
                    One structured SEO description is automatically displayed on every product page, including existing products. There is no need to write it again for each product.
                  </p>
                </div>
              </div>
            </section>

            {/* Product Images */}
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f3ef]">
                  <ImagePlus size={18} className="text-[#171717]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#171717]">
                    Product Images
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Upload product photos and manage image descriptions.
                  </p>
                </div>
              </div>

              <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#dedbd4] bg-[#fcfbf9] p-6 text-center transition hover:border-gray-400 hover:bg-gray-50">
                <ImagePlus size={27} className="mb-3 text-gray-400" />
                <p className="text-sm font-medium text-[#171717]">
                  Click to upload product images
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  JPG, PNG or WEBP · Maximum 5 MB per image
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    handleImageChange(event.target.files);
                    event.target.value = "";
                  }}
                  className="hidden"
                />
              </label>

              {images.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-lg border border-[#e9e7e2]"
                    >
                      <div className="relative h-40 bg-[#f8f7f4]">
                        <img
                          src={image.preview}
                          alt={image.altText}
                          className="h-full w-full object-contain"
                        />

                        {index === 0 && (
                          <span className="absolute left-3 top-3 rounded-full bg-[#171717] px-2.5 py-1 text-[10px] font-medium text-white">
                            Main Image
                          </span>
                        )}

                        <div className="absolute right-3 top-3 flex items-center gap-1">
                          <button type="button" onClick={() => moveImage(image.id, -1)} disabled={index === 0} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs text-gray-600 shadow-sm hover:text-[#8b7054] disabled:opacity-30" aria-label="Move image earlier">←</button>
                          <button type="button" onClick={() => moveImage(image.id, 1)} disabled={index === images.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs text-gray-600 shadow-sm hover:text-[#8b7054] disabled:opacity-30" aria-label="Move image later">→</button>
                          <button type="button" onClick={() => removeImage(image.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:text-red-600" aria-label="Remove image"><X size={15} /></button>
                        </div>
                      </div>

                      <div className="p-3">
                        {index > 0 && <button type="button" onClick={() => setMainImage(image.id)} className="mb-3 rounded-md border border-[#e8e6e1] px-3 py-1.5 text-[10px] font-medium text-[#786b5c] hover:border-[#b99a76]">Make main image</button>}
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                          Image name / ALT text
                        </label>
                        <input
                          value={image.altText}
                          onChange={(event) =>
                            setImages((current) =>
                              current.map((item) =>
                                item.id === image.id
                                  ? {
                                      ...item,
                                      altText: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                          placeholder="Describe this image"
                          className="h-9 w-full rounded-md border border-[#e8e6e1] px-2 text-xs outline-none focus:border-gray-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Pricing */}
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f3ef]">
                  <Tag size={18} className="text-[#171717]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#171717]">
                    Product Pricing
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Set the default product prices and stock.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#333]">
                    Regular Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={regularPrice}
                    onChange={(event) =>
                      setRegularPrice(event.target.value)
                    }
                    placeholder="0.00"
                    className="h-11 w-full rounded-lg border border-[#e8e6e1] px-3 text-sm outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#333]">
                    Sale Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(event) =>
                      setSalePrice(event.target.value)
                    }
                    placeholder="Optional"
                    className="h-11 w-full rounded-lg border border-[#e8e6e1] px-3 text-sm outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#333]">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-[#e8e6e1] px-3 text-sm outline-none focus:border-gray-500"
                  />
                </div>
              </div>
            </section>

            {/* SKU */}
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <h2 className="text-base font-semibold text-[#171717]">
                Inventory & SKU
              </h2>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-[#333]">
                  Product SKU
                </label>
                <input
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="Example: HU-TSHIRT-001"
                  className="h-11 w-full rounded-lg border border-[#e8e6e1] px-3 text-sm outline-none focus:border-gray-500"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Variant SKUs will be generated from this base SKU.
                </p>
              </div>
            </section>

            {/* Attributes */}
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f3ef]">
                    <Layers size={18} className="text-[#171717]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#171717]">
                      Attributes & Variations
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Select existing attributes and their terms.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadOptions}
                  disabled={loadingOptions}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#e8e6e1] px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={loadingOptions ? "animate-spin" : ""}
                  />
                  {loadingOptions ? "Loading..." : "Load Attributes"}
                </button>
              </div>

              <div className="relative">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={attributeSearch}
                    onChange={(event) => {
                      setAttributeSearch(event.target.value);
                      setShowAttributeDropdown(true);
                    }}
                    onFocus={() => setShowAttributeDropdown(true)}
                    placeholder="Search and add attributes..."
                    className="h-11 w-full rounded-lg border border-[#e8e6e1] pl-9 pr-10 text-sm outline-none focus:border-gray-500"
                  />
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>

                {showAttributeDropdown && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[#e8e6e1] bg-white shadow-lg">
                    {filteredAttributes.length > 0 ? (
                      filteredAttributes.map((attribute) => (
                        <button
                          key={attribute.id}
                          type="button"
                          onClick={() => addAttribute(attribute)}
                          className="flex w-full items-center justify-between border-b border-[#f0eee9] px-4 py-3 text-left text-sm last:border-0 hover:bg-[#fcfbf9]"
                        >
                          <span className="font-medium text-[#171717]">
                            {attribute.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {attribute.values.length} terms
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="p-4 text-sm text-gray-500">
                        {attributes.length
                          ? "No matching attributes found."
                          : "Click Load Attributes to fetch existing attributes."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {showAttributeDropdown && (
                <button
                  type="button"
                  aria-label="Close attribute dropdown"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setShowAttributeDropdown(false)}
                />
              )}

              {selectedAttributeList.length > 0 && (
                <div className="mt-5 space-y-4">
                  {selectedAttributeList.map((attribute) => {
                    const selectedTerms = selectedAttributes[attribute.id] ?? [];

                    return (
                      <div
                        key={attribute.id}
                        className="rounded-lg border border-[#e9e7e2] p-4"
                      >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-[#171717]">
                              {attribute.name}
                            </h3>
                            <p className="mt-1 text-xs text-gray-400">
                              {selectedTerms.length} of {attribute.values.length} terms selected
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => selectAllTerms(attribute)}
                              className="text-xs font-medium text-gray-600 underline underline-offset-4 hover:text-black"
                            >
                              Select All
                            </button>

                            <button
                              type="button"
                              onClick={() => clearTerms(attribute.id)}
                              className="text-xs text-gray-500 underline underline-offset-4 hover:text-red-600"
                            >
                              Clear
                            </button>

                            <button
                              type="button"
                              onClick={() => removeAttribute(attribute.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Remove attribute"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>

                        {attribute.values.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {attribute.values.map((term) => {
                              const selected = selectedTerms.includes(term.id);

                              return (
                                <button
                                  key={term.id}
                                  type="button"
                                  onClick={() =>
                                    toggleTerm(attribute.id, term.id)
                                  }
                                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                                    selected
                                      ? "border-[#171717] bg-[#171717] text-white"
                                      : "border-[#e8e6e1] bg-white text-gray-600 hover:border-gray-400"
                                  }`}
                                >
                                  {term.termType === "COLOR" && term.image && (
                                    <img
                                      src={term.image}
                                      alt=""
                                      className="h-5 w-5 rounded-full border border-white/20 object-cover"
                                    />
                                  )}

                                  {term.value}
                                  {selected && <X size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">
                            No terms have been created for this attribute.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedAttributeList.length > 0 && (
                <div className="mt-5 rounded-lg bg-[#fcfbf9] p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-medium text-[#171717]">
                        Generate Product Variations
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {totalCombinations} possible combinations
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={generateVariations}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-black"
                    >
                      <Plus size={15} />
                      Generate Variations
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Generated Variations */}
            {variations.length > 0 && (
              <section className="rounded-xl border border-[#e9e7e2] bg-white p-5 sm:p-6">
                <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-base font-semibold text-[#171717]">
                      Generated Variations
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      {variations.length} combinations generated. You can edit or remove each one.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f4f3ef] px-3 py-1.5 text-xs font-medium text-gray-600">
                    {variations.length} Variations
                  </span>
                </div>

                <div className="space-y-4">
                  {variations.map((variation, index) => (
                    <div
                      key={variation.id}
                      className="rounded-lg border border-[#e9e7e2] p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#171717]">
                            {Object.entries(variation.attributes)
                              .map(([attributeId, term]) => {
                                const attribute = attributes.find(
                                  (item) => item.id === attributeId
                                );
                                return `${attribute?.name ?? ""}: ${term.value}`;
                              })
                              .join(" / ")}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Variation {index + 1}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeVariation(variation.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove variation"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-1.5 block text-xs text-gray-500">
                            SKU
                          </label>
                          <input
                            value={variation.sku}
                            onChange={(event) =>
                              updateVariation(
                                variation.id,
                                "sku",
                                event.target.value
                              )
                            }
                            placeholder="Variation SKU"
                            className="h-10 w-full rounded-md border border-[#e8e6e1] px-2 text-xs outline-none focus:border-gray-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs text-gray-500">
                            Regular Price (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variation.regularPrice}
                            onChange={(event) =>
                              updateVariation(
                                variation.id,
                                "regularPrice",
                                event.target.value
                              )
                            }
                            placeholder="0.00"
                            className="h-10 w-full rounded-md border border-[#e8e6e1] px-2 text-xs outline-none focus:border-gray-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs text-gray-500">
                            Sale Price (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={variation.salePrice}
                            onChange={(event) =>
                              updateVariation(
                                variation.id,
                                "salePrice",
                                event.target.value
                              )
                            }
                            placeholder="Optional"
                            className="h-10 w-full rounded-md border border-[#e8e6e1] px-2 text-xs outline-none focus:border-gray-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs text-gray-500">
                            Stock
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={variation.stock}
                            onChange={(event) =>
                              updateVariation(
                                variation.id,
                                "stock",
                                event.target.value
                              )
                            }
                            placeholder="0"
                            className="h-10 w-full rounded-md border border-[#e8e6e1] px-2 text-xs outline-none focus:border-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 xl:sticky xl:top-6">
            {/* Publish */}
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#171717]">
                Publish
              </h2>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-gray-500">
                  Product Status
                </label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as "DRAFT" | "ACTIVE")
                  }
                  className="h-10 w-full rounded-lg border border-[#e8e6e1] bg-white px-3 text-sm outline-none focus:border-gray-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Published</option>
                </select>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(status)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                >
                  <Save size={15} />
                  {submitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </section>

            {/* Categories */}
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#171717]">
                  Categories
                </h2>

                <button
                  type="button"
                  onClick={loadOptions}
                  disabled={loadingOptions}
                  className="text-xs text-gray-500 underline underline-offset-4 hover:text-black"
                >
                  {loadingOptions ? "Loading..." : "Refresh"}
                </button>
              </div>

              {categories.length > 0 ? (
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex cursor-pointer items-center gap-3 text-sm text-gray-600"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-[#171717]"
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs leading-6 text-gray-400">
                  Click Refresh to load your existing categories.
                </p>
              )}

              <p className="mt-4 border-t border-[#f0eee9] pt-3 text-xs text-gray-400">
                {selectedCategories.length} categories selected
              </p>
            </section>

            {/* Product Summary */}
            <section className="rounded-xl border border-[#e9e7e2] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#171717]">
                Product Summary
              </h2>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Product Images</span>
                  <span className="font-medium text-[#171717]">
                    {images.length}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Attributes</span>
                  <span className="font-medium text-[#171717]">
                    {selectedAttributeList.length}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Variations</span>
                  <span className="font-medium text-[#171717]">
                    {variations.length}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Categories</span>
                  <span className="font-medium text-[#171717]">
                    {selectedCategories.length}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
