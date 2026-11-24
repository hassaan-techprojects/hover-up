"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { Star, Upload, X } from "lucide-react";

type UploadedImage = { url: string; key: string };

export default function ProductReviewForm({ slug }: { slug: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setNeedsLogin(false);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/review-uploads", { method: "POST", body: formData });
        const data = await response.json();
        if (response.status === 401) {
          setNeedsLogin(true);
          throw new Error("Sign in to submit your review and photos.");
        }
        if (!response.ok) throw new Error(data.error || "Unable to upload a review photo.");
        uploaded.push({ url: data.url, key: data.key });
      }

      const response = await fetch(`/api/products/${encodeURIComponent(slug)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, comment, images: uploaded }),
      });
      const data = await response.json();
      if (response.status === 401) setNeedsLogin(true);
      if (!response.ok) throw new Error(data.error || "Unable to submit your review.");
      setFiles([]);
      setTitle("");
      setComment("");
      setRating(5);
      setMessage(data.message || "Your review has been submitted for approval.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit your review.");
    } finally {
      setBusy(false);
    }
  }

  function selectFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next = Array.from(fileList);
    if (next.length > 4) {
      setMessage("You can upload up to 4 photos.");
      return;
    }
    if (next.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setMessage("Use JPG, PNG or WEBP photos up to 5 MB each.");
      return;
    }
    setFiles(next);
    setMessage("");
  }

  return (
    <form onSubmit={submit} className="mb-9 rounded-2xl border border-[#e9e4dc] bg-[#fcfbf9] p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-[#171717]">Write a product review</h3>
      <p className="mt-1 text-xs text-[#888]">Share your experience. Reviews appear publicly after approval.</p>
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-[#71685e]">YOUR RATING</p>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <button key={index} type="button" onClick={() => setRating(index + 1)} aria-label={`Rate ${index + 1} stars`} className="rounded p-1 transition hover:scale-110">
              <Star size={26} fill={index < rating ? "#D4AF37" : "none"} className="text-[#D4AF37]" />
            </button>
          ))}
          <span className="ml-2 text-xs text-[#888]">{rating} / 5</span>
        </div>
      </div>
      <label className="mt-5 block text-xs font-medium text-[#5f574e]">Review title (optional)
        <input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="Give your review a title" className="mt-2 w-full rounded-xl border border-[#e7e2da] bg-white px-4 py-3 text-sm outline-none focus:border-[#b99a76]" />
      </label>
      <label className="mt-4 block text-xs font-medium text-[#5f574e]">Your review
        <textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={3000} rows={4} placeholder="What did you like or what could be better?" className="mt-2 w-full resize-y rounded-xl border border-[#e7e2da] bg-white px-4 py-3 text-sm outline-none focus:border-[#b99a76]" />
      </label>
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-[#5f574e]">Add photos (up to 4)</p>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#cfc5b8] bg-white px-4 py-5 text-center transition hover:border-[#b99a76] hover:bg-[#faf6f0]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4eee6] text-[#9b8061]"><Upload size={17} /></span>
          <span className="mt-2 text-xs font-semibold text-[#6d5a45]">Choose review photos</span>
          <span className="mt-1 text-[10px] text-[#999]">JPG, PNG or WEBP · 5 MB each</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={event => selectFiles(event.target.files)} />
        </label>
        {files.length > 0 && <div className="mt-3 space-y-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs"><span className="truncate">{file.name}</span><button type="button" onClick={() => setFiles(current => current.filter((_, i) => i !== index))} aria-label="Remove photo" className="ml-3 text-[#999] hover:text-[#a34d4d]"><X size={14} /></button></div>)}</div>}
      </div>
      {message && <p role="status" className="mt-4 text-xs text-[#8b5a3b]">{message}</p>}
      {needsLogin && <Link href="/account/login" className="mt-2 inline-block text-xs font-semibold text-[#8b7054] underline">Sign in to continue</Link>}
      <button type="submit" disabled={busy || (!title.trim() && !comment.trim())} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#171717] px-6 text-xs font-semibold tracking-wide text-white transition hover:bg-[#b99a76] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "SUBMITTING..." : "SUBMIT REVIEW"}</button>
    </form>
  );
}
