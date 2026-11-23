
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

type AttributeTerm = {
  id: string;
  value: string;
  image: string | null;
  storageKey: string | null;
  termType: TermType;
};

type Attribute = {
  id: string;
  name: string;
  slug: string;
  values: AttributeTerm[];
};


function AttributeTermsPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const attributeId = params.id;

  const [attribute, setAttribute] = useState<Attribute | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeTerm | null>(null);

  const [value, setValue] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [error, setError] = useState("");

  const colorTerms = attribute?.values.filter((term) => term.termType === "COLOR") || [];

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
    setImageFile(null);
    setPreview("");
    setEditing(null);
    setError("");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(term: AttributeTerm) {
    setEditing(term);
    setValue(term.value);
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
      setError("Please enter a color name.");
      return;
    }

    if (!editing && !imageFile) {
      setError("Please select an image for this color.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const formData = new FormData();

      formData.append("value", value.trim());
      formData.append("termType", "COLOR");
      if (imageFile) formData.append("image", imageFile);

      if (imageFile && termType === "COLOR") {
        formData.append("image", imageFile);
      }

      const response = await fetch(
        editing
          ? `/api/dashboard/attributes/${attributeId}/terms/${editing.id}`
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
        `/api/dashboard/attributes/${attributeId}/terms/${term.id}`,
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
            Create color terms and upload a matching image for each color.
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
              onClick={() => openCreate()}
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
                onClick={() => openCreate()}
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

      </div>

      {/* CREATE / EDIT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editing ? "Edit Color" : "Add Color"}
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
                Color Name
              </label>

              <input
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="e.g. Red, Blue, Black, Beige"
                maxLength={80}
                className="w-full rounded-lg border border-[#e4e0d9] px-4 py-3 text-sm outline-none focus:border-[#777]"
              />

              <label className="mb-2 mt-5 block text-sm font-medium">Color Image</label>
              <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-[#d8d3ca] bg-[#faf9f7] p-5 transition hover:border-[#999]">
                {preview ? <img src={preview} alt="Color preview" className="mb-3 h-24 w-24 rounded-full border border-[#e5e1da] object-cover" /> : <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full border border-[#e5e1da] bg-white"><Upload size={24} className="text-[#999]" /></div>}
                <span className="text-sm font-medium">{preview ? "Change Image" : "Upload Image"}</span>
                <span className="mt-1 text-xs text-[#89857e]">JPG, PNG or WEBP · Maximum 5 MB</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
              </label>
              {editing && <p className="mt-2 text-xs text-[#89857e]">Leave the image unchanged to keep the current image.</p>}

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

                  {editing ? "Save Changes" : "Add Color"}
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
