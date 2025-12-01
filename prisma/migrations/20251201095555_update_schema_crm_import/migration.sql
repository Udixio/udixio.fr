/*
  Warnings:

  - You are about to drop the column `addresses` on the `organization` table. All the data in the column will be lost.
  - You are about to drop the column `targetBudget` on the `organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "client" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "jobTitle" TEXT;

-- AlterTable
ALTER TABLE "organization" DROP COLUMN "addresses",
DROP COLUMN "targetBudget",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "vatNumber" TEXT,
ADD COLUMN     "zip" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OrganizationToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrganizationToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DealToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DealToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_name_key" ON "tag"("name");

-- CreateIndex
CREATE INDEX "_OrganizationToTag_B_index" ON "_OrganizationToTag"("B");

-- CreateIndex
CREATE INDEX "_DealToTag_B_index" ON "_DealToTag"("B");

-- AddForeignKey
ALTER TABLE "_OrganizationToTag" ADD CONSTRAINT "_OrganizationToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationToTag" ADD CONSTRAINT "_OrganizationToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DealToTag" ADD CONSTRAINT "_DealToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DealToTag" ADD CONSTRAINT "_DealToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
