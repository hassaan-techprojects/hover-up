-- Add per-product pack prices and order customization details.
ALTER TABLE "Product"
ADD COLUMN "packPricing" JSONB;

ALTER TABLE "OrderItem"
ADD COLUMN "customization" JSONB;
