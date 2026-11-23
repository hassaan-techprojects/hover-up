
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  Power,
  RefreshCw,
  X,
  Image as ImageIcon,
} from "lucide-react";

type ProductCategory = {
  category?: {
    name?: string;
  };
  name?: string;
};

type ProductImage = {
  url: string;
  isPrimary?: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  price: string | number;
  comparePrice?: string | number | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isActive: boolean;
  createdAt: string;
  images?: ProductImage[];
  categories?: ProductCategory[];
};

function formatPrice(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProductStatus(product: Product) {
  if (product.status === "DRAFT") {
    return {
      label: "Draft",
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (product.status === "ARCHIVED") {
    return {
      label: "Archived",
      className: "bg-gray-100 text-gray-600",
    };
  }

  if (!product.isActive) {
    return {
      label: "Inactive",
      className: "bg-red-50 text-red-600",
    };
  }

  return {
    label: "Published",
    className: "bg-emerald-50 text-emerald-700",
  };
}

function getProductCategories(categories?: ProductCategory[]) {
  if (!categories?.length) {
    return "—";
  }

  return categories
    .map((item) => item.category?.name ?? item.name)
    .filter(Boolean)
    .join(", ") || "—";
}

export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/products", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load products.");
      }

      setProducts(Array.isArray(data) ? data : data.products ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading products."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.sku?.toLowerCase().includes(keyword) ||
        product.slug.toLowerCase().includes(keyword)
      );
    });
  }, [products, search]);

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setActionId(product.id);

      const response = await fetch(
        `/api/dashboard/products/${product.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete product.");
      }

      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Unable to delete this product."
      );
    } finally {
      setActionId(null);
    }
  };

  const handleToggleActive = async (product: Product) => {
    const nextActiveState = !product.isActive;

    const confirmed = window.confirm(
      nextActiveState
        ? `Turn on "${product.name}"?`
        : `Turn off "${product.name}"? It will no longer be available in the shop.`
    );

    if (!confirmed) return;

    try {
      setActionId(product.id);

      const response = await fetch(
        `/api/dashboard/products/${product.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: nextActiveState,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update product.");
      }

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? { ...item, ...data.product, isActive: nextActiveState }
            : item
        )
      );
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Unable to update this product."
      );
    } finally {
      setActionId(null);
    }
  };

  const publishedCount = products.filter(
    (product) => product.status === "ACTIVE" && product.isActive
  ).length;

  const draftCount = products.filter(
    (product) => product.status === "DRAFT"
  ).length;

  const inactiveCount = products.filter(
    (product) => !product.isActive || product.status === "ARCHIVED"
  ).length;

  return (
    <div className="min-h-screen bg-[#f8f7f4] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Page Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
              Catalogue Management
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-[#171717] sm:text-3xl">
              All Products
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage your products, pricing, and shop visibility.
            </p>
          </div>

          <Link
            href="/dashboard/products/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 text-sm font-medium text-white transition hover:bg-black"
          >
            <Plus size={17} />
            Add Product
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#e9e7e2] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Products</p>
              <Package size={19} className="text-gray-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#171717]">
              {loading ? "—" : products.length}
            </p>
          </div>

          <div className="rounded-xl border border-[#e9e7e2] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Published</p>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#171717]">
              {loading ? "—" : publishedCount}
            </p>
          </div>

          <div className="rounded-xl border border-[#e9e7e2] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Draft / Inactive</p>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#171717]">
              {loading ? "—" : draftCount + inactiveCount}
            </p>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-hidden rounded-xl border border-[#e9e7e2] bg-white">
          <div className="flex flex-col justify-between gap-4 border-b border-[#eeece7] p-4 sm:flex-row sm:items-center sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-[#171717]">
                Products
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {loading
                  ? "Loading products..."
                  : `${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"} found`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product title..."
                  className="h-10 w-full rounded-lg border border-[#e8e6e1] bg-[#fcfbf9] pl-9 pr-9 text-sm text-[#171717] outline-none transition placeholder:text-gray-400 focus:border-gray-400"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={fetchProducts}
                disabled={loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e8e6e1] text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                title="Refresh products"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {error && (
            <div className="m-5 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={fetchProducts}
                className="text-sm font-medium text-red-700 underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#eeece7] bg-[#fcfbf9]">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Product
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Categories
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Price
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Date Added
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0eee9]">
                {loading &&
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={7} className="px-5 py-6">
                        <div className="h-10 animate-pulse rounded-md bg-gray-100" />
                      </td>
                    </tr>
                  ))}

                {!loading &&
                  !error &&
                  filteredProducts.map((product) => {
                    const status = getProductStatus(product);
                    const primaryImage =
                      product.images?.find((image) => image.isPrimary) ??
                      product.images?.[0];

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-[#fcfbf9]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#eeece7] bg-[#f8f7f4]">
                              {primaryImage?.url ? (
                                <img
                                  src={primaryImage.url}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageIcon
                                  size={19}
                                  className="text-gray-300"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[260px] truncate text-sm font-medium text-[#171717]">
                                {product.name}
                              </p>
                              <p className="mt-1 max-w-[260px] truncate text-xs text-gray-400">
                                /{product.slug}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-600">
                          {product.sku || "—"}
                        </td>

                        <td className="max-w-[180px] px-4 py-4 text-sm text-gray-600">
                          <span className="line-clamp-2">
                            {getProductCategories(product.categories)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-[#171717]">
                            {formatPrice(product.price)}
                          </p>

                          {product.comparePrice && (
                            <p className="mt-1 text-xs text-gray-400 line-through">
                              {formatPrice(product.comparePrice)}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatDate(product.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/dashboard/products/${product.id}/edit`}
                              title="Edit product"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-[#171717]"
                            >
                              <Pencil size={16} />
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(product)}
                              disabled={actionId === product.id}
                              title={
                                product.isActive ? "Turn off" : "Turn on"
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
                            >
                              <Power size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(product)}
                              disabled={actionId === product.id}
                              title="Delete product"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {!loading && !error && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f4f1]">
                        <Package size={23} className="text-gray-400" />
                      </div>

                      <h3 className="mt-4 text-sm font-medium text-[#171717]">
                        {search ? "No matching products" : "No products yet"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {search
                          ? "Try searching with a different product title."
                          : "Start by adding your first product to the catalogue."}
                      </p>

                      {!search && (
                        <Link
                          href="/dashboard/products/new"
                          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-black"
                        >
                          <Plus size={16} />
                          Add Your First Product
                        </Link>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
