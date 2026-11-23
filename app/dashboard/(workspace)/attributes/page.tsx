
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronRight,
  Tags,
} from "lucide-react";

type Attribute = {
  id: string;
  name: string;
  slug: string;
  values: {
    id: string;
    value: string;
    image: string | null;
  }[];
  _count: {
    values: number;
  };
};

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Attribute | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const loadAttributes = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/dashboard/attributes", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load attributes.");
      }

      setAttributes(data.attributes || []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttributes();
  }, [loadAttributes]);

  function openCreate() {
    setEditing(null);
    setName("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(attribute: Attribute) {
    setEditing(attribute);
    setName(attribute.name);
    setError("");
    setModalOpen(true);
  }

  async function saveAttribute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Please enter an attribute name.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        editing
          ? `/api/dashboard/attributes/${editing.id}`
          : "/api/dashboard/attributes",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save attribute.");
      }

      setModalOpen(false);
      setName("");
      setEditing(null);

      await loadAttributes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAttribute(attribute: Attribute) {
    const confirmed = window.confirm(
      `Delete "${attribute.name}" and all its terms? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/dashboard/attributes/${attribute.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete attribute.");
      }

      await loadAttributes();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Unable to delete attribute."
      );
    }
  }

  const filteredAttributes = attributes.filter((attribute) => {
    const searchValue = search.toLowerCase();

    return (
      attribute.name.toLowerCase().includes(searchValue) ||
      attribute.slug.toLowerCase().includes(searchValue) ||
      attribute.values.some((term) =>
        term.value.toLowerCase().includes(searchValue)
      )
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f7f4] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-[#88847d]">
              <SlidersHorizontal size={15} />
              <span>Product Management</span>
              <ChevronRight size={14} />
              <span className="text-[#171717]">Attributes</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Attributes
            </h1>

            <p className="mt-2 text-sm text-[#77736d]">
              Create and manage product attributes and their terms.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#171717] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#333]"
          >
            <Plus size={17} />
            Add Attribute
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-4 rounded-xl border border-[#e9e6df] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">All Attributes</p>
            <p className="mt-1 text-xs text-[#89857e]">
              {attributes.length} attributes created
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search attributes or terms..."
              className="w-full rounded-lg border border-[#e8e5df] bg-[#faf9f7] py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#999]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="animate-spin text-[#777]" size={25} />
          </div>
        ) : filteredAttributes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9d5cd] bg-white px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f1ec]">
              <Tags size={23} className="text-[#77736d]" />
            </div>

            <h3 className="text-base font-semibold">
              {search ? "No attributes found" : "No attributes yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-[#89857e]">
              {search
                ? "Try searching with another name or term."
                : "Create your first attribute to organize product options such as color, size and material."}
            </p>

            {!search && (
              <button
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#171717] px-4 py-2.5 text-sm text-white hover:bg-[#333]"
              >
                <Plus size={16} />
                Create Attribute
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#e9e6df] bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(220px,1fr)_220px] gap-4 border-b border-[#eeeae4] bg-[#faf9f7] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#858078] sm:grid">
              <span>Attribute Name</span>
              <span>Terms</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-[#f0ede8]">
              {filteredAttributes.map((attribute) => (
                <div
                  key={attribute.id}
                  className="flex flex-col gap-4 px-4 py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(220px,1fr)_220px] sm:items-center sm:gap-4 sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3f1ec]">
                      <Tags size={18} className="text-[#55514b]" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {attribute.name}
                      </p>

                      <p className="mt-1 text-xs text-[#969189]">
                        {attribute.slug}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="mb-2 text-xs text-[#969189] sm:hidden">
                      Terms ({attribute._count.values})
                    </p>

                    {attribute.values.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {attribute.values.map((term) => (
                          <span
                            key={term.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#e9e6df] bg-[#faf9f7] px-3 py-1.5 text-xs font-medium text-[#49443e]"
                          >
                            {term.image && (
                              <img
                                src={term.image}
                                alt=""
                                className="h-4 w-4 rounded-full border border-[#e5e0d8] object-cover"
                              />
                            )}

                            {term.value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[#aaa39a]">
                        No terms added
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Link
                      href={`/dashboard/attributes/${attribute.id}/terms`}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#171717] px-3.5 py-2.5 text-xs font-medium text-white transition hover:bg-[#333]"
                    >
                      Configure Terms
                      <ChevronRight size={14} />
                    </Link>

                    <button
                      onClick={() => openEdit(attribute)}
                      title="Edit attribute"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e9e6df] text-[#666] transition hover:bg-[#f5f3ef] hover:text-black"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      onClick={() => deleteAttribute(attribute)}
                      title="Delete attribute"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#eee1df] text-[#b44c43] transition hover:bg-[#fff3f1]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editing ? "Edit Attribute" : "Create Attribute"}
                </h2>

                <p className="mt-1 text-xs text-[#858078]">
                  Enter a name for your product attribute.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-[#777] hover:bg-[#f3f1ec]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveAttribute}>
              <label className="mb-2 block text-sm font-medium">
                Attribute Name
              </label>

              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Color, Size, Material"
                maxLength={80}
                className="w-full rounded-lg border border-[#e4e0d9] px-4 py-3 text-sm outline-none focus:border-[#777]"
              />

              {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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

                  {editing ? "Save Changes" : "Create Attribute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
