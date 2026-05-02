-- CreateTable
CREATE TABLE "pending_connections" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accounts_json" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_connections_token_key" ON "pending_connections"("token");
