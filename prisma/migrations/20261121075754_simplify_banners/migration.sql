/*
  Warnings:

  - You are about to drop the column `buttonText` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `mobileImage` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `mobileStorageKey` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `subtitle` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Banner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "buttonText",
DROP COLUMN "endsAt",
DROP COLUMN "link",
DROP COLUMN "mobileImage",
DROP COLUMN "mobileStorageKey",
DROP COLUMN "startsAt",
DROP COLUMN "subtitle",
DROP COLUMN "title",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
