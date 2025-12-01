/*
  Warnings:

  - You are about to drop the `DealTagLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationTagLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TechnologyTagLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebsiteTagLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebsiteTechnologyLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DealTagLink" DROP CONSTRAINT "DealTagLink_createdById_fkey";

-- DropForeignKey
ALTER TABLE "DealTagLink" DROP CONSTRAINT "DealTagLink_dealId_fkey";

-- DropForeignKey
ALTER TABLE "DealTagLink" DROP CONSTRAINT "DealTagLink_tagId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationTagLink" DROP CONSTRAINT "OrganizationTagLink_createdById_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationTagLink" DROP CONSTRAINT "OrganizationTagLink_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationTagLink" DROP CONSTRAINT "OrganizationTagLink_tagId_fkey";

-- DropForeignKey
ALTER TABLE "TechnologyTagLink" DROP CONSTRAINT "TechnologyTagLink_createdById_fkey";

-- DropForeignKey
ALTER TABLE "TechnologyTagLink" DROP CONSTRAINT "TechnologyTagLink_tagId_fkey";

-- DropForeignKey
ALTER TABLE "TechnologyTagLink" DROP CONSTRAINT "TechnologyTagLink_technologyId_fkey";

-- DropForeignKey
ALTER TABLE "WebsiteTagLink" DROP CONSTRAINT "WebsiteTagLink_tagId_fkey";

-- DropForeignKey
ALTER TABLE "WebsiteTagLink" DROP CONSTRAINT "WebsiteTagLink_websiteId_fkey";

-- DropForeignKey
ALTER TABLE "WebsiteTechnologyLink" DROP CONSTRAINT "WebsiteTechnologyLink_technologyId_fkey";

-- DropForeignKey
ALTER TABLE "WebsiteTechnologyLink" DROP CONSTRAINT "WebsiteTechnologyLink_websiteId_fkey";

-- DropTable
DROP TABLE "DealTagLink";

-- DropTable
DROP TABLE "OrganizationTagLink";

-- DropTable
DROP TABLE "TechnologyTagLink";

-- DropTable
DROP TABLE "WebsiteTagLink";

-- DropTable
DROP TABLE "WebsiteTechnologyLink";

-- CreateTable
CREATE TABLE "website_technology_link" (
    "websiteId" TEXT NOT NULL,
    "technologyId" TEXT NOT NULL,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_technology_link_pkey" PRIMARY KEY ("websiteId","technologyId")
);

-- CreateTable
CREATE TABLE "website_tag_link" (
    "websiteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" TEXT,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_tag_link_pkey" PRIMARY KEY ("websiteId","tagId")
);

-- CreateTable
CREATE TABLE "organization_tag_link" (
    "organizationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdById" TEXT,
    "source" TEXT,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_tag_link_pkey" PRIMARY KEY ("organizationId","tagId")
);

-- CreateTable
CREATE TABLE "deal_tag_link" (
    "dealId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdById" TEXT,
    "source" TEXT,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_tag_link_pkey" PRIMARY KEY ("dealId","tagId")
);

-- CreateTable
CREATE TABLE "technology_tag_link" (
    "technologyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdById" TEXT,
    "source" TEXT,
    "detectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technology_tag_link_pkey" PRIMARY KEY ("technologyId","tagId")
);

-- CreateIndex
CREATE INDEX "website_technology_link_technologyId_idx" ON "website_technology_link"("technologyId");

-- CreateIndex
CREATE INDEX "website_technology_link_websiteId_idx" ON "website_technology_link"("websiteId");

-- CreateIndex
CREATE INDEX "website_tag_link_tagId_idx" ON "website_tag_link"("tagId");

-- CreateIndex
CREATE INDEX "website_tag_link_websiteId_idx" ON "website_tag_link"("websiteId");

-- CreateIndex
CREATE INDEX "organization_tag_link_tagId_idx" ON "organization_tag_link"("tagId");

-- CreateIndex
CREATE INDEX "organization_tag_link_organizationId_idx" ON "organization_tag_link"("organizationId");

-- CreateIndex
CREATE INDEX "deal_tag_link_tagId_idx" ON "deal_tag_link"("tagId");

-- CreateIndex
CREATE INDEX "deal_tag_link_dealId_idx" ON "deal_tag_link"("dealId");

-- CreateIndex
CREATE INDEX "technology_tag_link_tagId_idx" ON "technology_tag_link"("tagId");

-- CreateIndex
CREATE INDEX "technology_tag_link_technologyId_idx" ON "technology_tag_link"("technologyId");

-- AddForeignKey
ALTER TABLE "website_technology_link" ADD CONSTRAINT "website_technology_link_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_technology_link" ADD CONSTRAINT "website_technology_link_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_tag_link" ADD CONSTRAINT "website_tag_link_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_tag_link" ADD CONSTRAINT "website_tag_link_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_tag_link" ADD CONSTRAINT "organization_tag_link_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_tag_link" ADD CONSTRAINT "organization_tag_link_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_tag_link" ADD CONSTRAINT "organization_tag_link_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tag_link" ADD CONSTRAINT "deal_tag_link_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tag_link" ADD CONSTRAINT "deal_tag_link_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_tag_link" ADD CONSTRAINT "deal_tag_link_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_tag_link" ADD CONSTRAINT "technology_tag_link_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_tag_link" ADD CONSTRAINT "technology_tag_link_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technology_tag_link" ADD CONSTRAINT "technology_tag_link_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
