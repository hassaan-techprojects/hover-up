import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, image: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-white px-5 py-12 text-[#171717] sm:px-8 md:py-16">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#987b5c]">EXPLORE HOVER UP</p>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">Shop by Category</h1>
          <p className="mt-3 text-base leading-7 text-[#777]">Browse our available apparel categories and find the right style for your needs.</p>
          {categories.length > 0 ? (
            <div className="mt-9 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-7">
              {categories.map((category) => (
                <Link key={category.id} href={`/shop?category=${encodeURIComponent(category.slug)}`} className="group min-w-0">
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-[#f8f6f2]">
                    {category.image ? <img src={category.image} alt={category.name} className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105" /> : <span className="font-serif text-3xl font-semibold text-[#b99a76]">{category.name.slice(0,1)}</span>}
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-[#171717] transition-colors group-hover:text-[#987b5c]">{category.name}</h2>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-9 border border-dashed border-[#ddd5ca] px-6 py-14 text-center text-base text-[#777]">Categories will appear here as they are published.</div>
          )}
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
