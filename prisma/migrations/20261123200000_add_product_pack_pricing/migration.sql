-- Store pack prices per product instead of using a global price list.
ALTER TABLE "Product"
ADD COLUMN "packPricing" JSONB;
