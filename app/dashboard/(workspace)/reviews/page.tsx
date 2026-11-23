"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, Star, X, Trash2, Send } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  adminReply: string | null;
  createdAt: string;
  customer: { id: string; firstName: string; lastName: string | null; email: string };
  product: { id: string; name: string; slug: string };
  images: { id: string; url: string }[];
};

export default function DashboardReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/reviews", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load reviews.");
      setReviews(data.reviews || []);
      setCanManage(Boolean(data.canManage));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function setApproval(reviewId: string, isApproved: boolean) {
    setUpdating(reviewId);
    try {
      const response = await fetch("/api/dashboard/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, isApproved }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update review.");
      setReviews(current => current.map(review => review.id === reviewId ? { ...review, isApproved } : review));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update review.");
    } finally {
      setUpdating(null);
    }
  }

  async function saveReply(reviewId: string) {
    setUpdating(reviewId);
    try {
      const response = await fetch("/api/dashboard/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, adminReply: replyDrafts[reviewId] ?? "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save reply.");
      setReviews(current => current.map(review => review.id === reviewId ? { ...review, adminReply: data.review.adminReply } : review));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save reply.");
    } finally { setUpdating(null); }
  }

  async function deleteReview(reviewId: string) {
    if (!window.confirm("Delete this customer review permanently?")) return;
    setUpdating(reviewId);
    try {
      const response = await fetch("/api/dashboard/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete review.");
      setReviews(current => current.filter(review => review.id !== reviewId));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete review.");
    } finally { setUpdating(null); }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] tracking-[0.2em] text-[#a18c75]">CUSTOMER FEEDBACK</p><h1 className="mt-2 text-3xl font-semibold text-[#111] sm:text-4xl">Product reviews</h1><p className="mt-2 text-sm text-[#817b72]">Approve customer ratings, written feedback and photos before they appear publicly.</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e6dfd5] bg-white px-4 text-xs font-medium text-[#51483f]"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </section>
      {error && <p className="rounded-lg bg-[#fff5f2] px-4 py-3 text-xs text-[#a14d3d]">{error}</p>}
      {loading ? <div className="h-32 animate-pulse rounded-2xl bg-[#efede9]" /> : reviews.length === 0 ? <div className="rounded-2xl border border-[#ebe6de] bg-white p-14 text-center text-sm text-[#888]">No customer reviews yet.</div> : (
        <section className="space-y-4">
          {reviews.map(review => <article key={review.id} className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-sm font-semibold text-[#171717]">{review.product.name}</p><p className="mt-1 text-xs text-[#888]">{review.customer.firstName} {review.customer.lastName || ""} · {review.customer.email}</p><p className="mt-1 text-[10px] text-[#aaa]">{new Date(review.createdAt).toLocaleString("en-IN")}</p></div>
              <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${review.isApproved ? "bg-[#edf5ed] text-[#47724b]" : "bg-[#f8f1e8] text-[#8b704e]"}`}>{review.isApproved ? "Approved" : "Awaiting approval"}</span>
            </div>
            <div className="mt-4 flex items-center gap-1">{Array.from({length:5}).map((_,i)=><Star key={i} size={14} fill={i<review.rating?"#b99a76":"none"} className={i<review.rating?"text-[#b99a76]":"text-[#d5cec5]"} />)}</div>
            {review.title && <h2 className="mt-3 text-sm font-semibold">{review.title}</h2>}
            {review.comment && <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[#666]">{review.comment}</p>}
            {review.images.length>0 && <div className="mt-4 flex flex-wrap gap-3">{review.images.map(image=><a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="h-20 w-20 overflow-hidden rounded-lg border border-[#e8e3dc]"><img src={image.url} alt="Customer review" className="h-full w-full object-cover" /></a>)}</div>}
            {review.adminReply && <div className="mt-4 rounded-xl bg-[#faf8f5] p-4"><p className="text-[10px] font-semibold tracking-[0.12em] text-[#8b7054]">HOVER UP REPLY</p><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#655c52]">{review.adminReply}</p></div>}
            {canManage && (
              <div className="mt-5 space-y-3">
                <label className="block text-[10px] font-semibold tracking-[0.12em] text-[#8b7864]">ADMINISTRATOR REPLY<textarea value={replyDrafts[review.id] ?? review.adminReply ?? ""} onChange={(event) => setReplyDrafts(current => ({ ...current, [review.id]: event.target.value }))} rows={3} maxLength={3000} placeholder="Write a reply to this customer..." className="mt-2 w-full rounded-lg border border-[#e8e3dc] px-3 py-2 text-xs leading-5 outline-none focus:border-[#b99a76]"/></label>
                <div className="flex flex-wrap gap-2">
                  {!review.isApproved && <button disabled={updating===review.id} onClick={()=>void setApproval(review.id,true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#171717] px-4 text-[10px] font-semibold text-white hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50"><Check size={13}/> Approve review</button>}
                  {review.isApproved && <button disabled={updating===review.id} onClick={()=>void setApproval(review.id,false)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e8e3dc] px-4 text-[10px] font-semibold text-[#776b5e] hover:border-[#b99a76] disabled:opacity-50"><X size={13}/> Hide review</button>}
                  <button disabled={updating===review.id} onClick={()=>void saveReply(review.id)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e8e3dc] px-4 text-[10px] font-semibold text-[#776b5e] hover:border-[#b99a76] disabled:opacity-50"><Send size={12}/> Save reply</button>
                  <button disabled={updating===review.id} onClick={()=>void deleteReview(review.id)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#f0d9d5] px-4 text-[10px] font-semibold text-[#a34d4d] hover:bg-[#fff5f2] disabled:opacity-50"><Trash2 size={12}/> Delete</button>
                </div>
              </div>
            )}
          </article>)}
        </section>
      )}
    </div>
  );
}
