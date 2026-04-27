-- Add isPromo flag to Price
ALTER TABLE "Price" ADD COLUMN "isPromo" BOOLEAN NOT NULL DEFAULT false;
