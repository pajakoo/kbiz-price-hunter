CREATE TABLE "CsvImportBatch" (
    "id" TEXT NOT NULL,
    "logicalKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" DATE NOT NULL,
    "currency" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CsvImportBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CsvImportBatch_logicalKey_key" ON "CsvImportBatch"("logicalKey");

CREATE TABLE "CsvProductIdentity" (
    "sourceKey" TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CsvProductIdentity_productId_idx" ON "CsvProductIdentity"("productId");
