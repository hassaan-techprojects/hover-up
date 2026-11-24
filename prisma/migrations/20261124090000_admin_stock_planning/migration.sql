CREATE TABLE "StockPlanningSheet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL DEFAULT 2,
    "sizes" JSONB NOT NULL,
    "totalAmount" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockPlanningSheet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockPlanningSheet_updatedAt_idx" ON "StockPlanningSheet"("updatedAt");
