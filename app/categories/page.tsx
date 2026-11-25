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
            <div className="mt-10 grid grid-cols-2 justify-items-center gap-x-5 gap-y-10 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-10">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${encodeURIComponent(category.slug)}`}
                  className="group flex w-full min-w-0 flex-col items-center text-center"
                >
                  <div className="relative flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-full border border-[#e8e3dc] bg-[#f8f6f2] shadow-sm transition-all duration-500 group-hover:scale-[1.04] group-hover:border-[#c7a985] group-hover:shadow-[0_14px_34px_rgba(17,17,17,0.10)] sm:max-w-[300px] lg:max-w-[320px]">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105 sm:p-7"
                      />
                    ) : (
                      <span className="font-serif text-6xl font-semibold text-[#b99a76] sm:text-7xl">
                        {category.name.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-5 text-center text-base font-semibold text-[#171717] transition-colors duration-300 group-hover:text-[#987b5c] sm:mt-6 sm:text-xl">
                    {category.name}
                  </h2>
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
