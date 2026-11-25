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
      <main className="min-h-[65vh] bg-white px-4 py-8 text-[#111111] sm:px-8 sm:py-12">
        <div className="mx-auto max-w-[1440px]">
          {categories.length > 0 ? (
            <div className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-10 lg:gap-y-12">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${encodeURIComponent(category.slug)}`}
                  aria-label={`Shop ${category.name}`}
                  className="group w-full min-w-0 max-w-[230px] focus-visible:outline-none sm:max-w-[270px] lg:max-w-[290px]"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-full border border-[#e8e3dc] bg-[#f8f6f2] transition-transform duration-500 group-hover:scale-[1.035] group-hover:border-[#b99a76]">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#f1ece5]">
                        <span className="font-serif text-6xl text-[#b99a76] sm:text-7xl">
                          {category.name.slice(0, 1)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex min-h-[34%] items-end justify-center bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-[12%] pt-10">
                      <span className="text-center text-sm font-bold leading-tight tracking-wide text-white drop-shadow sm:text-lg">
                        {category.name}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-[#777777]">
              Categories will appear here as they are published.
            </div>
          )}
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
