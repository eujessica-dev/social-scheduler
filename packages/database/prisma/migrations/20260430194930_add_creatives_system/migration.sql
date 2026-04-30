-- CreateEnum
CREATE TYPE "CreativeStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'archived');

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "description" TEXT,
ADD COLUMN     "logo_storage_key" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "creatives" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "hashtags" TEXT[],
    "status" "CreativeStatus" NOT NULL DEFAULT 'draft',
    "ai_prompt" TEXT,
    "created_by" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_media" (
    "id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "creative_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_approvals" (
    "id" TEXT NOT NULL,
    "creative_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "client_name" TEXT,
    "client_email" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_comments" (
    "id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creatives_organization_id_brand_id_idx" ON "creatives"("organization_id", "brand_id");

-- CreateIndex
CREATE INDEX "creatives_organization_id_status_idx" ON "creatives"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "creative_media_creative_id_media_asset_id_key" ON "creative_media"("creative_id", "media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "creative_approvals_token_key" ON "creative_approvals"("token");

-- CreateIndex
CREATE INDEX "creative_approvals_token_idx" ON "creative_approvals"("token");

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creatives" ADD CONSTRAINT "creatives_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_media" ADD CONSTRAINT "creative_media_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_media" ADD CONSTRAINT "creative_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_approvals" ADD CONSTRAINT "creative_approvals_creative_id_fkey" FOREIGN KEY ("creative_id") REFERENCES "creatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_comments" ADD CONSTRAINT "creative_comments_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "creative_approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
