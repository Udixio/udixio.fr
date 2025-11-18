/*
  Warnings:

  - You are about to drop the column `userId` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `commercialNotes` on the `client` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `organization` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `user` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_userId_fkey";

-- DropIndex
DROP INDEX "Deal_userId_idx";

-- AlterTable
ALTER TABLE "Deal" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "client" DROP COLUMN "commercialNotes",
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "organization" DROP COLUMN "metadata";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "notes";
