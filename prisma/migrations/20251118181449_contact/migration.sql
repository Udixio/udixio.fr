/*
  Warnings:

  - You are about to drop the `Contact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ClientContacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_OrganizationContacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ProjectContacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UserContacts` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('EMAIL', 'PHONE_MOBILE', 'PHONE_LANDLINE', 'LINKEDIN', 'WHATSAPP', 'SLACK', 'TELEGRAM', 'WEBSITE', 'OTHER');

-- DropForeignKey
ALTER TABLE "_ClientContacts" DROP CONSTRAINT "_ClientContacts_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClientContacts" DROP CONSTRAINT "_ClientContacts_B_fkey";

-- DropForeignKey
ALTER TABLE "_OrganizationContacts" DROP CONSTRAINT "_OrganizationContacts_A_fkey";

-- DropForeignKey
ALTER TABLE "_OrganizationContacts" DROP CONSTRAINT "_OrganizationContacts_B_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectContacts" DROP CONSTRAINT "_ProjectContacts_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectContacts" DROP CONSTRAINT "_ProjectContacts_B_fkey";

-- DropForeignKey
ALTER TABLE "_UserContacts" DROP CONSTRAINT "_UserContacts_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserContacts" DROP CONSTRAINT "_UserContacts_B_fkey";

-- DropTable
DROP TABLE "Contact";

-- DropTable
DROP TABLE "_ClientContacts";

-- DropTable
DROP TABLE "_OrganizationContacts";

-- DropTable
DROP TABLE "_ProjectContacts";

-- DropTable
DROP TABLE "_UserContacts";

-- DropEnum
DROP TYPE "ContactKind";

-- CreateTable
CREATE TABLE "ContactPoint" (
    "id" TEXT NOT NULL,
    "channel" "ContactChannel" NOT NULL DEFAULT 'EMAIL',
    "value" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactPoint_organizationId_idx" ON "ContactPoint"("organizationId");

-- CreateIndex
CREATE INDEX "ContactPoint_clientId_idx" ON "ContactPoint"("clientId");

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
