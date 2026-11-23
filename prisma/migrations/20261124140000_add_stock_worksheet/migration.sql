CREATE TABLE "StockWorksheet" (
  "id" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "totalPacks" INTEGER NOT NULL DEFAULT 0,
  "piecesPerPack" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockWorksheet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StockWorksheet_size_key" ON "StockWorksheet"("size");