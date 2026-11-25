
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildDefaultProductDescription } from "../../../../../src/lib/product-description";
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
  FileText,
  Trash2,
  RefreshCw,
  Info,
} from "lucide-react";

type AttributeTerm = {
  id: string;
  value: string;
  termType: "COLOR" | "SIZE";
  sizeSymbol?: string | null;
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

type ColorImageFile = ProductImageFile;

const SIZE_SYMBOLS = ["S", "M", "L", "XL", "XXL"];

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
  const [description, setDescription] = useState(buildDefaultProductDescription());
  const [descriptionEdited, setDescriptionEdited] = useState(false);
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
  const [colorImages, setColorImages] = useState<Record<string, ColorImageFile>>({});
  const [mainColorTermId, setMainColorTermId] = useState("");
  const [expandedColorId, setExpandedColorId] = useState<string | null>(null);
  const [colorDetails, setColorDetails] = useState<Record<string, { sku: string; regularPrice: string; salePrice: string; stock: string }>>({});


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

      return (
        !alreadySelected &&
        attribute.name.toLowerCase().includes(query)
      );
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

  async function loadOptions() {
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

      setAttributes(attributeData.attributes ?? []);
      setCategories(categoryData.categories ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load product options."
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (!descriptionEdited) setDescription(buildDefaultProductDescription());

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

  function addAttribute(attribute: Attribute) {
    setSelectedAttributes({ [attribute.id]: [] });
    setVariations([]);
    setColorImages({});
    setColorDetails({});
    setMainColorTermId("");
    setExpandedColorId(null);
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
    setColorImages({});
    setColorDetails({});
    setMainColorTermId("");
    setExpandedColorId(null);
  }

  function toggleTerm(attributeId: string, termId: string) {
    const attribute = attributes.find((item) => item.id === attributeId);
    const term = attribute?.values.find((item) => item.id === termId);
    if (!term || term.termType !== "COLOR") return;
    setSelectedAttributes((current) => {
      const existing = current[attributeId] ?? [];
      const next = existing.includes(termId)
        ? existing.filter((id) => id !== termId)
        : [...existing, termId];
      return { [attributeId]: next };
    });
    if ((selectedAttributes[attributeId] ?? []).includes(termId)) {
      setColorImages((current) => { const next = { ...current }; delete next[termId]; return next; });
      setColorDetails((current) => { const next = { ...current }; delete next[termId]; return next; });
      if (mainColorTermId === termId) setMainColorTermId("");
      if (expandedColorId === termId) setExpandedColorId(null);
    } else {
      setExpandedColorId(termId);
      setColorDetails((current) => ({
        ...current,
        [termId]: current[termId] ?? {
          sku: `${sku.trim() || "HU"}-${term.value.replace(/[^a-z0-9]/gi, "").toUpperCase()}`,
          regularPrice: "",
          salePrice: "",
          stock: "0",
        },
      }));
    }
    setVariations([]);
  }

  function selectAllTerms(attribute: Attribute) {
    const colorTerms = attribute.values.filter((term) => term.termType === "COLOR");
    setSelectedAttributes({ [attribute.id]: colorTerms.map((term) => term.id) });
    setColorDetails((current) => {
      const next = { ...current };
      colorTerms.forEach((term) => {
        next[term.id] ??= {
          sku: `${sku.trim() || "HU"}-${term.value.replace(/[^a-z0-9]/gi, "").toUpperCase()}`,
          regularPrice: "",
          salePrice: "",
          stock: "0",
        };
      });
      return next;
    });
    setExpandedColorId(colorTerms[0]?.id ?? null);
    setVariations([]);
  }

  function selectColorTerms(attribute: Attribute) {
    selectAllTerms(attribute);
  }

  function clearTerms(attributeId: string) {
    setSelectedAttributes({ [attributeId]: [] });
    setColorImages({});
    setColorDetails({});
    setMainColorTermId("");
    setExpandedColorId(null);
    setVariations([]);
  }

  function handleColorImageChange(termId: string, file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Color images must be JPG, PNG or WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Each color image must be smaller than 5 MB.");
      return;
    }
    setError("");
    setColorImages((current) => {
      const previous = current[termId];
      if (previous) URL.revokeObjectURL(previous.preview);
      return {
        ...current,
        [termId]: {
          id: createId(),
          file,
          preview: URL.createObjectURL(file),
          altText: file.name.split(".").slice(0, -1).join(".") || file.name,
        },
      };
    });
  }

  function removeColorImage(termId: string) {
    const image = colorImages[termId];
    if (image) URL.revokeObjectURL(image.preview);
    if (mainColorTermId === termId) setMainColorTermId("");
    setColorImages((current) => {
      const updated = { ...current };
      delete updated[termId];
      return updated;
    });
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

    const baseSku = sku.trim() || `HU-${parseInt(crypto.randomUUID().replace(/-/g, "").slice(0, 8), 16).toString(36).toUpperCase().padStart(5, "0").slice(-5)}`;
    setSku(baseSku);

    const generated: Variation[] = combinations.map((combination) => {
      const combinationName = Object.values(combination)
        .map((term) => term.value)
        .join(" / ");

      return {
        id: createId(),
        attributes: combination,
        sku: `${baseSku}-${Object.values(combination)
              .map((term) => term.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
              .join("-")}`,

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

    const selectedColorTerms = selectedAttributeList.flatMap((attribute) =>
      attribute.values.filter((term) => term.termType === "COLOR" && selectedAttributes[attribute.id]?.includes(term.id))
    );
    if (!selectedAttributeList.length) {
      setError("Select an attribute first.");
      return;
    }
    if (!selectedColorTerms.length) {
      setError("Select at least one colour.");
      return;
    }
    for (const term of selectedColorTerms) {
      const details = colorDetails[term.id];
      if (!colorImages[term.id] || !details?.sku.trim() || !details.regularPrice || Number(details.regularPrice) < 0 || (details.salePrice && (Number(details.salePrice) < 0 || Number(details.salePrice) > Number(details.regularPrice))) || !/^\d+$/.test(details.stock) ) {
        setError(`Complete the image, SKU, price and stock for ${term.value}.`);
        setExpandedColorId(term.id);
        return;
      }
    }
    if (!selectedColorTerms.some((term) => term.id === mainColorTermId)) {
      setError("Choose one colour as the main product image.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("slug", slug.trim());
      formData.append("description", description);
      const productSku = sku.trim() || `HU-${parseInt(crypto.randomUUID().replace(/-/g, "").slice(0, 8), 16).toString(36).toUpperCase().padStart(5, "0").slice(-5)}`;
      const mainDetails = colorDetails[mainColorTermId];
      formData.append("sku", productSku);
      formData.append("price", mainDetails.salePrice || mainDetails.regularPrice);
      formData.append("comparePrice", mainDetails.salePrice ? mainDetails.regularPrice : "");
      formData.append("stock", mainDetails.stock);
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
            termIds: termIds.filter((termId) => attributes.find((item) => item.id === attributeId)?.values.some((term) => term.id === termId && term.termType === "COLOR")),
          })).filter((selection) => selection.termIds.length > 0)
        )
      );


      formData.append("mainColorTermId", mainColorTermId);
      const colorImageMetadata = selectedColorTerms.map((term) => ({
        termId: term.id,
        altText: colorImages[term.id].altText,
      }));
      formData.append("colorImageMetadata", JSON.stringify(colorImageMetadata));
      selectedColorTerms.forEach((term) => {
        formData.append(`colorImage:${term.id}`, colorImages[term.id].file);
      });

      formData.append(
        "variations",
        JSON.stringify(
          selectedColorTerms.map((term) => ({
            sku: colorDetails[term.id].sku.trim(),
            attributes: {
              [selectedAttributeList[0].name]: { id: term.id, value: term.value, sizeSymbol: term.sizeSymbol },
            },
            regularPrice: colorDetails[term.id].regularPrice,
            salePrice: colorDetails[term.id].salePrice,
            stock: colorDetails[term.id].stock,
          }))
        )
      );

      formData.append("images", JSON.stringify([]));

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

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#333]">
                    Product Description
                  </label>

                  <div className="overflow-hidden rounded-lg border border-[#e8e6e1]">
                    <div className="flex flex-wrap items-center gap-1 border-b border-[#e8e6e1] bg-[#fcfbf9] p-2">
                      {[
                        ["H1", "# Heading 1\n"],
                        ["H2", "## Heading 2\n"],
                        ["H3", "### Heading 3\n"],
                        ["H4", "#### Heading 4\n"],
                        ["H5", "##### Heading 5\n"],
                        ["H6", "###### Heading 6\n"],
                        ["P", "\n"],
                      ].map(([label, prefix]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            setDescription((current) =>
                              current
                                ? `${current}\n${prefix}`
                                : prefix
                            )
                          }
                          className="rounded-md px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={description}
                      onChange={(event) => {
                        setDescriptionEdited(true);
                        setDescription(event.target.value);
                      }}
                      rows={9}
                      placeholder="A ready-to-edit product description is generated when you enter a product name."
                      className="w-full resize-y p-4 text-sm leading-7 text-[#333] outline-none placeholder:text-gray-400"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    The heading controls insert Markdown heading markers. A rich-text editor and description-image SEO controls will be integrated separately.
                  </p>
                </div>
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
                              onClick={() => selectColorTerms(attribute)}
                              className="text-xs font-medium text-gray-600 underline underline-offset-4 hover:text-black"
                            >
                              Select Colours
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

                        {attribute.values.filter((term) => term.termType === "COLOR").length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {attribute.values.filter((term) => term.termType === "COLOR").map((term) => {
                              const selected = selectedTerms.includes(term.id);
                              return (
                                <button key={term.id} type="button" onClick={() => toggleTerm(attribute.id, term.id)}
                                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${selected ? "border-[#171717] bg-[#171717] text-white" : "border-[#e8e6e1] bg-white text-gray-600 hover:border-gray-400"}`}>
                                  {term.image && <img src={term.image} alt="" className="h-5 w-5 rounded-full border border-white/20 object-cover" />}
                                  {term.value}{selected && <X size={12} />}
                                </button>
                              );
                            })}
                          </div>
                        ) : <p className="text-xs text-gray-400">This attribute has no colour terms.</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedAttributeList.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#171717]">Selected Colours</h3>
                      <p className="mt-1 text-xs text-gray-500">Choose colours first. Each colour has its own image, price, SKU and stock.</p>
                    </div>
                    <button type="button" onClick={() => selectAllTerms(selectedAttributeList[0])}
                      className="rounded-lg border border-[#e8e6e1] px-3 py-2 text-xs font-medium text-[#171717] hover:bg-[#f8f7f4]">Select All Colours</button>
                  </div>
                  <div className="space-y-3">
                    {selectedAttributeList.flatMap((attribute) => attribute.values.filter((term) => term.termType === "COLOR" && selectedAttributes[attribute.id]?.includes(term.id)).map((term) => {
                      const details = colorDetails[term.id] ?? { sku: "", regularPrice: "", salePrice: "", stock: "0" };
                      const expanded = expandedColorId === term.id;
                      return (
                        <div key={term.id} className="overflow-hidden rounded-lg border border-[#e8e6e1] bg-white">
                          <button type="button" onClick={() => setExpandedColorId(expanded ? null : term.id)}
                            className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-[#fcfbf9]">
                            <span className="flex min-w-0 items-center gap-3">
                              {colorImages[term.id] ? <img src={colorImages[term.id].preview} alt={term.value} className="h-12 w-12 rounded-md border border-[#e8e6e1] object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-[#d8d2c9] text-[10px] text-gray-400">Image</span>}
                              <span><span className="block text-sm font-semibold text-[#171717]">{term.value}</span><span className="block text-xs text-gray-400">{colorImages[term.id] ? "Image uploaded" : "Image required"} · {details.sku || "SKU pending"}</span></span>
                            </span>
                            <ChevronDown size={18} className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          </button>
                          {expanded && (
                            <div className="space-y-4 border-t border-[#eeeae3] bg-[#fcfbf9] p-4">
                              <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Product Images</h4>
                                <p className="mb-3 text-xs text-gray-500">Upload the product photo for {term.value}.</p>
                                <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#dedbd4] bg-white p-4 text-center hover:border-gray-400">
                                  {colorImages[term.id] ? <img src={colorImages[term.id].preview} alt={term.value} className="mb-2 h-24 max-w-full object-contain" /> : <ImagePlus size={24} className="mb-2 text-gray-400" />}
                                  <span className="text-xs font-medium text-[#171717]">{colorImages[term.id] ? "Replace image" : "Click to upload product image"}</span>
                                  <span className="mt-1 text-[11px] text-gray-400">JPG, PNG or WEBP · Maximum 5 MB</span>
                                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { handleColorImageChange(term.id, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                                </label>
                                {colorImages[term.id] && <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[#171717]"><input type="radio" name="mainColor" checked={mainColorTermId === term.id} onChange={() => setMainColorTermId(term.id)} className="accent-[#171717]" /> Select as main image</label>}
                              </div>
                              <div>
                                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Product Pricing</h4>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <label className="text-xs text-gray-600">Regular Price (₹)<input type="number" min="0" step="0.01" value={details.regularPrice} onChange={(event) => setColorDetails((current) => ({ ...current, [term.id]: { ...details, regularPrice: event.target.value } }))} placeholder="0.00" className="mt-1 h-10 w-full rounded-lg border border-[#e8e6e1] bg-white px-3 text-sm" /></label>
                                  <label className="text-xs text-gray-600">Sale Price (₹)<input type="number" min="0" step="0.01" value={details.salePrice} onChange={(event) => setColorDetails((current) => ({ ...current, [term.id]: { ...details, salePrice: event.target.value } }))} placeholder="Optional" className="mt-1 h-10 w-full rounded-lg border border-[#e8e6e1] bg-white px-3 text-sm" /></label>
                                  <label className="text-xs text-gray-600">Initial Stock<input type="number" min="0" step="1" value={details.stock} onChange={(event) => setColorDetails((current) => ({ ...current, [term.id]: { ...details, stock: event.target.value } }))} className="mt-1 h-10 w-full rounded-lg border border-[#e8e6e1] bg-white px-3 text-sm" /></label>
                                </div>
                              </div>
                              <div>
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Inventory & SKU</h4>
                                <label className="text-xs text-gray-600">Product SKU<input value={details.sku} onChange={(event) => setColorDetails((current) => ({ ...current, [term.id]: { ...details, sku: event.target.value } }))} placeholder="Enter SKU for this colour" className="mt-1 h-10 w-full rounded-lg border border-[#e8e6e1] bg-white px-3 text-sm" /></label>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                  {selectedAttributeList.every((attribute) => !(selectedAttributes[attribute.id] ?? []).length) && <p className="rounded-lg bg-[#fcfbf9] p-4 text-xs text-gray-500">Select one or more colours above to configure their images, prices and SKUs.</p>}
                </div>
              )}
            </section>
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
                    {selectedAttributeList.reduce((count, attribute) => count + (selectedAttributes[attribute.id]?.length ?? 0), 0)}
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
