
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Tags,
  Upload,
  Plus,
  ImagePlus,
  X,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  storageKey: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

export default function CategoriesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/categories", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load categories");
      }

      setCategories(data.categories || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load categories"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  function handleImageChange(file?: File) {
    setError("");
    setSuccess("");

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setImage(file);
  }

  function resetForm() {
    setName("");
    setImage(null);
    setPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Please enter a category name.");
      return;
    }

    if (!image) {
      setError("Please select a category image.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("image", image);

      const response = await fetch("/api/dashboard/categories", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create category");
      }

      setSuccess("Category created successfully.");
      resetForm();

      await loadCategories();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[#a18c75]">
            PRODUCT CATALOGUE
          </p>

          <h1 className="mt-2 font-[var(--font-playfair)] text-3xl text-[#111111] sm:text-4xl">
            Categories
          </h1>

          <p className="mt-2 text-sm text-[#817b72]">
            Organise your products and manage your store categories.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCategories()}
          disabled={loading}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e8e1d7] bg-white px-4 text-xs text-[#625b52] transition hover:bg-[#f5f1eb] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={17} className="shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <section className="grid items-start gap-6 xl:grid-cols-[1fr_1.35fr]">
        {/* Add Category Form */}
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f5f1eb] p-2.5 text-[#92785e]">
              <Plus size={19} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#111111]">
                Add new category
              </h2>
              <p className="mt-1 text-xs text-[#999187]">
                Create a category for your products.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Category Name */}
            <div>
              <label
                htmlFor="category-name"
                className="mb-2 block text-xs font-medium text-[#514b43]"
              >
                Category name <span className="text-red-500">*</span>
              </label>

              <input
                id="category-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Men's Clothing"
                maxLength={100}
                className="h-11 w-full rounded-lg border border-[#e8e1d7] bg-white px-3 text-sm text-[#111111] outline-none transition placeholder:text-[#b5aea4] focus:border-[#b99a76] focus:ring-2 focus:ring-[#b99a76]/10"
              />
            </div>

            {/* Category Image */}
            <div>
              <label className="mb-2 block text-xs font-medium text-[#514b43]">
                Category image <span className="text-red-500">*</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) =>
                  handleImageChange(event.target.files?.[0])
                }
              />

              {preview ? (
                <div className="relative rounded-xl border border-[#e8e1d7] bg-[#faf8f5] p-5">
                  <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full border border-[#e8e1d7] bg-[#f5f3ef]">
                    <Image
                      src={preview}
                      alt="Category preview"
                      fill
                      unoptimized
                      className="rounded-full object-contain"
                      sizes="144px"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setPreview(null);

                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600"
                    aria-label="Remove selected image"
                  >
                    <X size={16} />
                  </button>

                  <div className="mt-4 text-center">
                    <p className="truncate text-xs font-medium text-[#514b43]">
                      {image?.name}
                    </p>

                    <p className="mt-1 text-[10px] text-[#999187]">
                      {image
                        ? `${(image.size / 1024 / 1024).toFixed(2)} MB`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[150px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#d9cfc1] bg-[#fcfbf9] px-4 py-6 text-center transition hover:border-[#b99a76] hover:bg-[#f8f5f0]"
                >
                  <div className="rounded-full bg-[#f1ece4] p-3 text-[#9b846a]">
                    <ImagePlus size={22} />
                  </div>

                  <p className="mt-3 text-xs font-medium text-[#514b43]">
                    Click to upload category image
                  </p>

                  <p className="mt-1 text-[10px] text-[#aaa39a]">
                    JPG, PNG or WEBP · Maximum 5 MB
                  </p>
                </button>
              )}

              {preview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex items-center gap-2 text-xs text-[#92785e] transition hover:text-[#111111]"
                >
                  <Upload size={13} />
                  Change image
                </button>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={uploading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#111111] px-4 text-xs font-medium text-white transition hover:bg-[#b99a76] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Uploading category...
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Add category
                </>
              )}
            </button>
          </form>
        </div>

        {/* All Categories */}
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#111111]">
                All categories
              </h2>
              <p className="mt-1 text-xs text-[#999187]">
                Your existing product categories.
              </p>
            </div>

            <span className="rounded-lg bg-[#f5f1eb] px-3 py-1.5 text-xs font-medium text-[#92785e]">
              {categories.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-[#a18c75]">
              <Loader2 size={24} className="animate-spin" />
              <p className="mt-3 text-xs text-[#999187]">
                Loading categories...
              </p>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <div className="rounded-full bg-[#f5f1eb] p-4 text-[#9b846a]">
                <FolderOpen size={25} />
              </div>

              <p className="mt-4 text-sm font-medium text-[#514b43]">
                No categories yet
              </p>

              <p className="mt-1 max-w-[240px] text-xs leading-5 text-[#aaa39a]">
                Add your first category using the form. It will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative h-28 w-28 overflow-hidden rounded-full border border-[#eee9e2] bg-[#f5f3ef] transition hover:border-[#d6c5b0] hover:shadow-sm sm:h-32 sm:w-32">
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        unoptimized
                        className="rounded-full object-contain"
                        sizes="128px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#b5a48f]">
                        <Tags size={25} />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 w-full">
                    <h3 className="truncate text-xs font-semibold text-[#25221e]">
                      {category.name}
                    </h3>

                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[9px] font-medium ${
                        category.isActive
                          ? "bg-[#edf5ed] text-[#547b55]"
                          : "bg-[#f5eeee] text-[#9a6464]"
                      }`}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>

                    <p className="mt-1 truncate text-[10px] text-[#aaa39a]">
                      /{category.slug}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category Information */}
      <section className="flex items-start gap-3 rounded-xl border border-[#ebe6de] bg-white p-4">
        <div className="rounded-lg bg-[#f5f1eb] p-2 text-[#92785e]">
          <Tags size={16} />
        </div>

        <div>
          <p className="text-xs font-medium text-[#514b43]">
            Category management
          </p>

          <p className="mt-1 text-[11px] leading-5 text-[#999187]">
            New categories are saved to your Neon database, and their images
            are uploaded to your Neon Object Storage bucket.
          </p>
        </div>
      </section>
    </div>
  );
}
