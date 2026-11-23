import Link from "next/link";

type ProductSeoDescriptionProps = {
  productName: string;
  categoryName?: string;
  categorySlug?: string;
};

export default function ProductSeoDescription({
  productName,
  categoryName,
  categorySlug,
}: ProductSeoDescriptionProps) {
  return (
    <article className="max-w-3xl space-y-5 py-9 text-[#625d55]">
      <header>
        <p className="text-[10px] font-medium tracking-[0.2em] text-[#a18c75]">HOVER UP · PRODUCT INFORMATION</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-[#171717]">
          Discover {productName} at Hover Up
        </h2>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-[#29251f]">Product overview</h3>
        <p className="text-[13px] leading-8">
          Explore {productName}, view the product photographs, compare the available options and check the displayed price before placing your order. Hover Up keeps the essential product information together so you can review your selection clearly.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-[#29251f]">Options, sizes and customization</h3>
        <p className="text-[13px] leading-8">
          Available colours, size selections, pack choices and customization options are shown on this product page whenever they are configured for this item. Please review the available choices and provide any required artwork or instructions before adding the product to your bag.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-[#29251f]">Ordering and customer support</h3>
        <p className="text-[13px] leading-8">
          Add your selected product to the bag and complete checkout with your delivery details. You can review order progress from your customer account after placing an order. For more products, visit the{" "}
          <Link href="/shop" className="font-medium text-[#8b7054] underline underline-offset-4 hover:text-[#171717]">Hover Up shop</Link>
          {categoryName && categorySlug ? <> or browse more items in <Link href={`/shop?category=${categorySlug}`} className="font-medium text-[#8b7054] underline underline-offset-4 hover:text-[#171717]}>{categoryName}</Link></> : null}.
        </p>
      </section>
    </article>
  );
}
