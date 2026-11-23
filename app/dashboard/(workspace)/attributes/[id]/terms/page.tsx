
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  ImagePlus,
  Loader2,
  Upload,
  Tags,
} from "lucide-react";

type TermType = "COLOR" | "SIZE";

type AttributeTerm = {
  id: string;
  value: string;
  image: string | null;
  storageKey: string | null;
  termType: TermType;
  sizeSymbol: string | null;
};

type Attribute = {
  id: string;
  name: string;
  slug: string;
  values: AttributeTerm[];
};

const SIZE_SYMBOLS = ["S", "M", "L", "XL", "XXL"];

function AttributeTermsPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const attributeId = params.id;

  const [attribute, setAttribute] = useState<Attribute | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeTerm | null>(null);
  const [termType, setTermType] = useState<TermType>("COLOR");

  const [value, setValue] = useState("");
  const [sizeSymbol, setSizeSymbol] = useState("S");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [error, setError] = useState("");

  const colorTerms =
    attribute?.values.filter((term) => term.termType !== "SIZE") || [];

  const sizeTerms =
    attribute?.values.filter((term) => term.termType === "SIZE") || [];

  const loadAttribute = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/dashboard/attributes/${attributeId}/terms`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load attribute.");
      }

      setAttribute(data.attribute);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [attributeId]);

  useEffect(() => {
    loadAttribute();
  }, [loadAttribute]);

  function resetForm() {
    setValue("");
    setSizeSymbol("S");
    setImageFile(null);
    setPreview("");
    setEditing(null);
    setTermType("COLOR");
    setError("");
  }

  function openCreate(type: TermType) {
    resetForm();
    setTermType(type);
    setModalOpen(true);
  }

  function openEdit(term: AttributeTerm) {
    setEditing(term);
    setTermType(term.termType || "COLOR");
    setValue(term.value);
    setSizeSymbol(term.sizeSymbol || "S");
    setImageFile(null);
    setPreview(term.image || "");
    setError("");
    setModalOpen(true);
  }

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);

    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setPreview(URL.createObjectURL(file));
  }

  async function saveTerm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      setError(
        termType === "SIZE"
          ? "Please enter a size name."
          : "Please enter a color name."
      );
      return;
    }

    if (termType === "COLOR" && !editing && !imageFile) {
      setError("Please select an image for this color.");
      return;
    }

    if (termType === "SIZE" && !SIZE_SYMBOLS.includes(sizeSymbol)) {
      setError("Please select a valid size symbol.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const formData = new FormData();

      formData.append("value", value.trim());
      formData.append("termType", termType);

      if (termType === "SIZE") {
        formData.append("sizeSymbol", sizeSymbol);
      }

      if (imageFile && termType === "COLOR") {
        formData.append("image", imageFile);
      }

      const response = await fetch(
        editing
          ? `/api/dashboard/attributes/terms/${editing.id}`
          : `/api/dashboard/attributes/${attributeId}/terms`,
        {
          method: editing ? "PATCH" : "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save term.");
      }

      setModalOpen(false);
      resetForm();
      await loadAttribute();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteTerm(term: AttributeTerm) {
    const confirmed = window.confirm(
      `Delete the "${term.value}" term?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/dashboard/attributes/terms/${term.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete term.");
      }

      await loadAttribute();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Unable to delete term."
      );
    }
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f8f7f4]">
        <Loader2 size={26} className="animate-spin text-[#777]" />
      </div>
    );
  }

  if (!attribute) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] px-6 py-16 text-center">
        <h2 className="text-lg font-semibold">Attribute not found</h2>
        <button
          onClick={() => router.push("/dashboard/attributes")}
          className="mt-5 text-sm underline"
        >
          Back to Attributes
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/attributes"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#77736d] transition hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to Attributes
        </Link>

        {/* PAGE HEADER */}

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-[#88847d]">
            <Tags size={15} />
            <span>Attributes</span>
            <span>/</span>
            <span className="text-[#171717]">Configure Terms</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {attribute.name}
          </h1>

          <p className="mt-2 text-sm text-[#77736d]">
            Manage color images and product size options independently.
          </p>
        </div>

        {/* COLOR TERMS */}

        <section className="mb-10">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Color Terms</h2>
              <p className="mt-1 text-sm text-[#89857e]">
                Manage colors with their individual image previews.
              </p>
            </div>

            <button
              onClick={() => openCreate("COLOR")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#333]"
            >
              <Plus size={17} />
              Add Color
            </button>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xl border border-[#e9e6df] bg-white px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Available Colors</p>
              <p className="mt-1 text-xs text-[#89857e]">
                Color image previews and names
              </p>
            </div>

            <span className="rounded-full bg-[#f3f1ec] px-3 py-1.5 text-xs font-medium text-[#55514b]">
              {colorTerms.length}{" "}
              {colorTerms.length === 1 ? "Color" : "Colors"}
            </span>
          </div>

          {colorTerms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9d5cd] bg-white px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f1ec]">
                <ImagePlus size={24} className="text-[#77736d]" />
              </div>

              <h3 className="text-base font-semibold">
                No colors added yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-[#89857e]">
                Add colors such as Red, Blue, Black and Beige with an image
                for each one.
              </p>

              <button
                onClick={() => openCreate("COLOR")}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#171717] px-4 py-2.5 text-sm text-white hover:bg-[#333]"
              >
                <Plus size={16} />
                Add Your First Color
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {colorTerms.map((term) => (
                <div
                  key={term.id}
                  className="group rounded-xl border border-[#e9e6df] bg-white p-4 text-center transition hover:border-[#c9c3b9] hover:shadow-sm"
                >
                  <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-[#e9e6df] bg-[#f5f3ef] sm:h-28 sm:w-28">
                    {term.image ? (
                      <img
                        src={term.image}
                        alt={term.value}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus size={25} className="text-[#aaa]" />
                    )}
                  </div>

                  <h3 className="truncate text-sm font-semibold">
                    {term.value}
                  </h3>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(term)}
                      title="Edit color"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e9e6df] text-[#666] transition hover:bg-[#f5f3ef] hover:text-black"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() => deleteTerm(term)}
                      title="Delete color"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#eee1df] text-[#b44c43] transition hover:bg-[#fff3f1]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SIZE TERMS */}

        <section>
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Size Terms</h2>
              <p className="mt-1 text-sm text-[#89857e]">
                Add sizes with a selectable symbol and automatic circular preview.
              </p>
            </div>

            <button
              onClick={() => openCreate("SIZE")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#333]"
            >
              <Plus size={17} />
              Add Size
            </button>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xl border border-[#e9e6df] bg-white px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Available Sizes</p>
              <p className="mt-1 text-xs text-[#89857e]">
                Size names and their selected symbols
              </p>
            </div>

            <span className="rounded-full bg-[#f3f1ec] px-3 py-1.5 text-xs font-medium text-[#55514b]">
              {sizeTerms.length}{" "}
              {sizeTerms.length === 1 ? "Size" : "Sizes"}
            </span>
          </div>

          {sizeTerms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9d5cd] bg-white px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f1ec]">
                <span className="text-xl font-semibold text-[#77736d]">
                  S
                </span>
              </div>

              <h3 className="text-base font-semibold">
                No sizes added yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-[#89857e]">
                Add sizes such as Small, Medium, Large, XL and XXL.
              </p>

              <button
                onClick={() => openCreate("SIZE")}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#171717] px-4 py-2.5 text-sm text-white hover:bg-[#333]"
              >
                <Plus size={16} />
                Add Your First Size
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {sizeTerms.map((term) => (
                <div
                  key={term.id}
                  className="group rounded-xl border border-[#e9e6df] bg-white p-4 text-center transition hover:border-[#c9c3b9] hover:shadow-sm"
                >
                  <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border border-[#e9e6df] bg-[#f5f3ef] sm:h-28 sm:w-28">
                    <span className="text-2xl font-semibold tracking-tight text-[#171717]">
                      {term.sizeSymbol || "S"}
                    </span>
                  </div>

                  <h3 className="truncate text-sm font-semibold">
                    {term.value}
                  </h3>

                  <p className="mt-1 text-xs text-[#89857e]">
                    Symbol: {term.sizeSymbol || "S"}
                  </p>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(term)}
                      title="Edit size"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e9e6df] text-[#666] transition hover:bg-[#f5f3ef] hover:text-black"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() => deleteTerm(term)}
                      title="Delete size"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#eee1df] text-[#b44c43] transition hover:bg-[#fff3f1]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* CREATE / EDIT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editing
                    ? `Edit ${termType === "SIZE" ? "Size" : "Color"}`
                    : `Add ${termType === "SIZE" ? "Size" : "Color"}`}
                </h2>

                <p className="mt-1 text-xs text-[#858078]">
                  {attribute.name} attribute
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-[#777] hover:bg-[#f3f1ec]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveTerm}>
              {/* TERM NAME */}

              <label className="mb-2 block text-sm font-medium">
                {termType === "SIZE" ? "Size Name" : "Color Name"}
              </label>

              <input
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={
                  termType === "SIZE"
                    ? "e.g. Small, Medium, Large"
                    : "e.g. Red, Blue, Black, Beige"
                }
                maxLength={80}
                className="w-full rounded-lg border border-[#e4e0d9] px-4 py-3 text-sm outline-none focus:border-[#777]"
              />

              {/* SIZE SYMBOL */}

              {termType === "SIZE" ? (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-medium">
                    Select Size Symbol
                  </label>

                  <select
                    value={sizeSymbol}
                    onChange={(event) => setSizeSymbol(event.target.value)}
                    className="w-full rounded-lg border border-[#e4e0d9] bg-white px-4 py-3 text-sm outline-none focus:border-[#777]"
                  >
                    {SIZE_SYMBOLS.map((symbol) => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>

                  {/* LIVE SIZE PREVIEW */}

                  <div className="mt-5 flex items-center gap-4 rounded-xl bg-[#f8f7f4] p-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#ddd8cf] bg-white">
                      <span className="text-2xl font-semibold">
                        {sizeSymbol}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {value.trim() || "Size Preview"}
                      </p>

                      <p className="mt-1 text-xs text-[#89857e]">
                        Selected symbol: {sizeSymbol}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* COLOR IMAGE UPLOAD */}

                  <label className="mb-2 mt-5 block text-sm font-medium">
                    Color Image
                  </label>

                  <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#d8d3ca] bg-[#faf9f7] p-5 transition hover:border-[#999]">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Color preview"
                        className="mb-3 h-24 w-24 rounded-full border border-[#e5e1da] object-cover"
                      />
                    ) : (
                      <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full border border-[#e5e1da] bg-white">
                        <Upload size={24} className="text-[#999]" />
                      </div>
                    )}

                    <span className="text-sm font-medium">
                      {preview ? "Change Image" : "Upload Image"}
                    </span>

                    <span className="mt-1 text-xs text-[#89857e]">
                      JPG, PNG or WEBP · Maximum 5 MB
                    </span>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {editing && (
                    <p className="mt-2 text-xs text-[#89857e]">
                      Leave the image unchanged to keep the current image.
                    </p>
                  )}
                </>
              )}

              {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-[#e5e1da] px-4 py-2.5 text-sm hover:bg-[#f8f7f4]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#171717] px-5 py-2.5 text-sm text-white hover:bg-[#333] disabled:opacity-60"
                >
                  {saving && (
                    <Loader2 size={15} className="animate-spin" />
                  )}

                  {editing ? "Save Changes" : `Add ${termType === "SIZE" ? "Size" : "Color"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttributeTermsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-[#f8f7f4]">
          <Loader2 size={26} className="animate-spin text-[#777]" />
        </div>
      }
    >
      <AttributeTermsPageContent />
    </Suspense>
  );
}
