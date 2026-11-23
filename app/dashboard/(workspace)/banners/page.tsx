
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Upload,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Tags,
  Power,
} from "lucide-react";

type Banner = {
  id: string;
  image: string;
  storageKey: string | null;
  status: "DRAFT" | "ACTIVE" | "SCHEDULED" | "EXPIRED";
  sortOrder: number;
  createdAt: string;
};

export default function BannersPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBanners = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/banners", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load banners.");
      }

      setBanners(data.banners || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load banners."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

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

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

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
    setImage(null);
    setPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!image) {
      setError("Please select a banner image.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", image);

      const response = await fetch("/api/dashboard/banners", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to upload banner.");
      }

      setSuccess("Banner uploaded successfully.");
      resetForm();

      await loadBanners();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to upload banner."
      );
    } finally {
      setUploading(false);
    }
  }

  async function toggleBanner(banner: Banner) {
    const newStatus = banner.status === "ACTIVE" ? "DRAFT" : "ACTIVE";

    try {
      setUpdatingId(banner.id);
      setError("");
      setSuccess("");

      const response = await fetch("/api/dashboard/banners", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: banner.id,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update banner.");
      }

      setSuccess(
        newStatus === "ACTIVE"
          ? "Banner activated successfully."
          : "Banner deactivated successfully."
      );

      await loadBanners();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update banner."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteBanner(banner: Banner) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this banner? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(banner.id);
      setError("");
      setSuccess("");

      const response = await fetch("/api/dashboard/banners", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: banner.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete banner.");
      }

      setSuccess("Banner deleted successfully.");
      await loadBanners();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete banner."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = banners.filter(
    (banner) => banner.status === "ACTIVE"
  ).length;

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[#a18c75]">
            STORE MANAGEMENT
          </p>

          <h1 className="mt-2 font-[var(--font-playfair)] text-3xl text-[#111111] sm:text-4xl">
            Banners
          </h1>

          <p className="mt-2 text-sm text-[#817b72]">
            Upload and manage your homepage banner images.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadBanners()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e8e3dc] bg-white px-4 py-2.5 text-sm text-[#4c4943] transition hover:bg-[#f8f6f2] disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </section>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} />
          {success}
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="ml-auto"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#eee9e1] bg-white p-5">
          <p className="text-xs text-[#8c857b]">Total banners</p>
          <p className="mt-2 text-3xl text-[#171714]">
            {banners.length}
          </p>
        </div>

        <div className="rounded-xl border border-[#eee9e1] bg-white p-5">
          <p className="text-xs text-[#8c857b]">Active banners</p>
          <p className="mt-2 text-3xl text-[#171714]">
            {activeCount}
          </p>
        </div>
      </div>

      <section className="grid items-start gap-6 xl:grid-cols-[0.85fr_1.5fr]">
        {/* Upload Banner */}
        <div className="rounded-xl border border-[#eee9e1] bg-white p-5 sm:p-6">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f5f1eb] text-[#8e765c]">
              <ImagePlus size={19} />
            </div>

            <h2 className="mt-4 text-lg text-[#22201c]">
              Add banner
            </h2>

            <p className="mt-1 text-xs text-[#8c857b]">
              Upload an image for your homepage.
            </p>
          </div>

          <form onSubmit={handleUpload} className="mt-6 space-y-5">
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
              <div className="relative rounded-xl border border-[#e9e4dc] bg-[#faf9f6] p-5">
                <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full border border-[#e9e4dc] bg-white">
                  <Image
                    src={preview}
                    alt="Banner preview"
                    fill
                    unoptimized
                    className="rounded-full object-contain"
                    sizes="144px"
                  />
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#777] shadow-sm transition hover:bg-red-50 hover:text-red-600"
                >
                  <X size={16} />
                </button>

                <p className="mt-4 truncate text-center text-xs text-[#777168]">
                  {image?.name}
                </p>

                <p className="mt-1 text-center text-[10px] text-[#a19a90]">
                  {(image!.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#d8d0c4] bg-[#faf9f6] px-5 text-center transition hover:border-[#a18c75] hover:bg-[#f7f4ef]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eee8df] text-[#8e765c]">
                  <Upload size={23} />
                </div>

                <p className="mt-4 text-sm text-[#45413b]">
                  Click to upload banner image
                </p>

                <p className="mt-2 text-xs text-[#999187]">
                  JPG, PNG or WEBP
                </p>

                <p className="mt-1 text-xs text-[#999187]">
                  Maximum file size: 5 MB
                </p>
              </button>
            )}

            {preview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-[#e8e3dc] px-4 py-2.5 text-sm text-[#5d554a] transition hover:bg-[#f8f6f2]"
              >
                Change image
              </button>
            )}

            <button
              type="submit"
              disabled={uploading || !image}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#171714] px-5 py-3 text-sm text-white transition hover:bg-[#383832] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <PlusIcon />
                  Upload banner
                </>
              )}
            </button>
          </form>
        </div>

        {/* All Banners */}
        <div className="rounded-xl border border-[#eee9e1] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg text-[#22201c]">
                All banners
              </h2>

              <p className="mt-1 text-xs text-[#8c857b]">
                Manage your uploaded homepage images.
              </p>
            </div>

            <span className="rounded-full bg-[#f5f1eb] px-3 py-1 text-xs text-[#8e765c]">
              {banners.length} images
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2
                size={25}
                className="animate-spin text-[#a18c75]"
              />
            </div>
          ) : banners.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f1eb] text-[#a18c75]">
                <Tags size={23} />
              </div>

              <p className="mt-4 text-sm text-[#555047]">
                No banners uploaded yet.
              </p>

              <p className="mt-1 text-xs text-[#999187]">
                Upload your first banner to get started.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="min-w-0 rounded-xl border border-[#eee9e1] bg-white p-3"
                >
                  <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-full border border-[#eee9e1] bg-[#f5f3ef] sm:h-32 sm:w-32">
                    <Image
                      src={banner.image}
                      alt="Homepage banner"
                      fill
                      unoptimized
                      className="rounded-full object-contain"
                      sizes="128px"
                    />
                  </div>

                  <div className="mt-4 flex justify-center">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] ${
                        banner.status === "ACTIVE"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {banner.status === "ACTIVE"
                        ? "Active"
                        : banner.status === "DRAFT"
                          ? "Inactive"
                          : banner.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleBanner(banner)}
                      disabled={
                        updatingId === banner.id ||
                        deletingId === banner.id
                      }
                      title={
                        banner.status === "ACTIVE"
                          ? "Deactivate"
                          : "Activate"
                      }
                      className="flex items-center justify-center gap-1 rounded-lg border border-[#e8e3dc] px-2 py-2 text-xs text-[#5d554a] transition hover:bg-[#f8f6f2] disabled:opacity-50"
                    >
                      {updatingId === banner.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Power size={14} />
                      )}

                      {banner.status === "ACTIVE" ? "Off" : "On"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteBanner(banner)}
                      disabled={
                        deletingId === banner.id ||
                        updatingId === banner.id
                      }
                      title="Delete banner"
                      className="flex items-center justify-center gap-1 rounded-lg border border-red-100 px-2 py-2 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === banner.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}

                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PlusIcon() {
  return <ImagePlus size={17} />;
}
