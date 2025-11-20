/*
  Warnings:

  - You are about to drop the column `clientId` on the `Project` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_clientId_fkey";

-- DropIndex
DROP INDEX "Project_clientId_idx";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "clientId";
