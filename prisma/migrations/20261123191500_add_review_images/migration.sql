CREATE TABLE "ReviewImage" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewImage_reviewId_sortOrder_idx"
ON "ReviewImage"("reviewId", "sortOrder");

ALTER TABLE "ReviewImage"
ADD CONSTRAINT "ReviewImage_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "Review"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
