/*
  Warnings:

  - You are about to drop the column `notes` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Domain` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `client` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `organization` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `organization` table. All the data in the column will be lost.
  - You are about to drop the `_DealToTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OrganizationToTag` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `websiteId` to the `Audit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `websiteId` to the `Domain` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Domain" DROP CONSTRAINT "Domain_projectId_fkey";

-- DropForeignKey
ALTER TABLE "_DealToTag" DROP CONSTRAINT "_DealToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_DealToTag" DROP CONSTRAINT "_DealToTag_B_fkey";

-- DropForeignKey
ALTER TABLE "_OrganizationToTag" DROP CONSTRAINT "_OrganizationToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_OrganizationToTag" DROP CONSTRAINT "_OrganizationToTag_B_fkey";

-- DropIndex
DROP INDEX "Domain_projectId_idx";

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "websiteId" TEXT NOT NULL,
ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Deal" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "Domain" DROP COLUMN "projectId",
ADD COLUMN     "websiteId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "client" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "organization" DROP COLUMN "notes",
DROP COLUMN "website";

-- DropTable
DROP TABLE "_DealToTag";

-- DropTable
DROP TABLE "_OrganizationToTag";

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technology" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteTechnologyLink" (
    "websiteId" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteTechnologyLink_pkey" PRIMARY KEY ("websiteId","technologyId")
);

-- CreateTable
CREATE TABLE "WebsiteTagLink" (
    "websiteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" TEXT,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteTagLink_pkey" PRIMARY KEY ("websiteId","tagId")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "parentId" TEXT,
    "organizationId" TEXT,
    "clientId" TEXT,
    "dealId" TEXT,
    "websiteId" TEXT,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "performerId" TEXT,
    "organizationId" TEXT,
    "clientId" TEXT,
    "dealId" TEXT,
    "websiteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationTagLink" (
    "organizationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdById" TEXT,
    "source" TEXT,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationTagLink_pkey" PRIMARY KEY ("organizationId","tagId")
);

-- CreateTable
CREATE TABLE "DealTagLink" (
    "dealId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdById" TEXT,
    "source" TEXT,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealTagLink_pkey" PRIMARY KEY ("dealId","tagId")
);

-- CreateTable
CREATE TABLE "TechnologyTagLink" (
    "technologyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdById" TEXT,
    "source" TEXT,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnologyTagLink_pkey" PRIMARY KEY ("technologyId","tagId")
);

-- CreateTable
CREATE TABLE "_ProjectToWebsite" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectToWebsite_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Website_organizationId_idx" ON "Website"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Technology_name_key" ON "Technology"("name");

-- CreateIndex
CREATE INDEX "WebsiteTechnologyLink_technologyId_idx" ON "WebsiteTechnologyLink"("technologyId");

-- CreateIndex
CREATE INDEX "WebsiteTechnologyLink_websiteId_idx" ON "WebsiteTechnologyLink"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteTagLink_tagId_idx" ON "WebsiteTagLink"("tagId");

-- CreateIndex
CREATE INDEX "WebsiteTagLink_websiteId_idx" ON "WebsiteTagLink"("websiteId");

-- CreateIndex
CREATE INDEX "comment_authorId_idx" ON "comment"("authorId");

-- CreateIndex
CREATE INDEX "comment_organizationId_idx" ON "comment"("organizationId");

-- CreateIndex
CREATE INDEX "comment_clientId_idx" ON "comment"("clientId");

-- CreateIndex
CREATE INDEX "comment_dealId_idx" ON "comment"("dealId");

-- CreateIndex
CREATE INDEX "comment_websiteId_idx" ON "comment"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_dealId_content_key" ON "comment"("dealId", "content");

-- CreateIndex
CREATE INDEX "activity_performerId_idx" ON "activity"("performerId");

-- CreateIndex
CREATE INDEX "activity_organizationId_idx" ON "activity"("organizationId");

-- CreateIndex
CREATE INDEX "activity_clientId_idx" ON "activity"("clientId");

-- CreateIndex
CREATE INDEX "activity_dealId_idx" ON "activity"("dealId");

-- CreateIndex
CREATE INDEX "activity_websiteId_idx" ON "activity"("websiteId");

-- CreateIndex
CREATE INDEX "OrganizationTagLink_tagId_idx" ON "OrganizationTagLink"("tagId");

-- CreateIndex
CREATE INDEX "OrganizationTagLink_organizationId_idx" ON "OrganizationTagLink"("organizationId");

-- CreateIndex
CREATE INDEX "DealTagLink_tagId_idx" ON "DealTagLink"("tagId");

-- CreateIndex
CREATE INDEX "DealTagLink_dealId_idx" ON "DealTagLink"("dealId");

-- CreateIndex
CREATE INDEX "TechnologyTagLink_tagId_idx" ON "TechnologyTagLink"("tagId");

-- CreateIndex
CREATE INDEX "TechnologyTagLink_technologyId_idx" ON "TechnologyTagLink"("technologyId");

-- CreateIndex
CREATE INDEX "_ProjectToWebsite_B_index" ON "_ProjectToWebsite"("B");

-- CreateIndex
CREATE INDEX "Audit_websiteId_idx" ON "Audit"("websiteId");

-- CreateIndex
CREATE INDEX "Domain_websiteId_idx" ON "Domain"("websiteId");

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTechnologyLink" ADD CONSTRAINT "WebsiteTechnologyLink_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTechnologyLink" ADD CONSTRAINT "WebsiteTechnologyLink_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTagLink" ADD CONSTRAINT "WebsiteTagLink_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTagLink" ADD CONSTRAINT "WebsiteTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_performerId_fkey" FOREIGN KEY ("performerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationTagLink" ADD CONSTRAINT "OrganizationTagLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationTagLink" ADD CONSTRAINT "OrganizationTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationTagLink" ADD CONSTRAINT "OrganizationTagLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealTagLink" ADD CONSTRAINT "DealTagLink_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealTagLink" ADD CONSTRAINT "DealTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealTagLink" ADD CONSTRAINT "DealTagLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnologyTagLink" ADD CONSTRAINT "TechnologyTagLink_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnologyTagLink" ADD CONSTRAINT "TechnologyTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnologyTagLink" ADD CONSTRAINT "TechnologyTagLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToWebsite" ADD CONSTRAINT "_ProjectToWebsite_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToWebsite" ADD CONSTRAINT "_ProjectToWebsite_B_fkey" FOREIGN KEY ("B") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
