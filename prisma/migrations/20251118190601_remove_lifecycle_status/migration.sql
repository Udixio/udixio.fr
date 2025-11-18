/*
  Warnings:

  - You are about to drop the column `lifecycle` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `lifecycle` on the `organization` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Project_status_lifecycle_idx";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "lifecycle";

-- AlterTable
ALTER TABLE "organization" DROP COLUMN "lifecycle";

-- DropEnum
DROP TYPE "LifecycleStatus";
