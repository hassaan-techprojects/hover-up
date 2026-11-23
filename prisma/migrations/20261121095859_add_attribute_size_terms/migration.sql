-- CreateEnum
CREATE TYPE "AttributeTermType" AS ENUM ('COLOR', 'SIZE');

-- AlterTable
ALTER TABLE "AttributeValue" ADD COLUMN     "sizeSymbol" TEXT,
ADD COLUMN     "termType" "AttributeTermType" NOT NULL DEFAULT 'COLOR';
