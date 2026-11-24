const DEFAULT_APPAREL_DESCRIPTION = (productName: string) => `## Everyday Style, Made Personal

Meet ${productName} — a versatile apparel choice for everyday outfits, teams, events and personal projects. Explore comfortable everyday styling with a design that reflects your style, whether you prefer a simple look or custom printed clothing.

## Custom T-Shirt and Hoodie Printing

Create personalised clothing with custom T-shirt printing, hoodie printing, custom logo printing and printed apparel options. Add your brand logo, artwork, team identity or a simple design to make apparel that feels personal to your purpose.

## Made for Your Ideas

Whether you are planning branded apparel, custom printed T-shirts, personalised hoodies, comfortable T-shirt styles, team clothing or bulk T-shirt printing, choose a design that works for your requirements. Share your artwork and preferred placement when placing your order.

## Product Details

Check the available sizes, colours, pack options and product images before ordering. Product specifications and customisation availability may vary by selected product.

## Explore Custom Apparel

Discover custom T-shirts, printed hoodies, logo apparel and personalised clothing options at Hover Up. Choose your preferred style and make it yours.`;

export function buildDefaultProductDescription(productName: string) {
  const cleanName = productName.trim() || "this product";
  return DEFAULT_APPAREL_DESCRIPTION(cleanName);
}
