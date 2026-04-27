ALTER TABLE "Product" ADD COLUMN "canonicalKey" TEXT;
CREATE INDEX "Product_canonicalKey_idx" ON "Product"("canonicalKey");
