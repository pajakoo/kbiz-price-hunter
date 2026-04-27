import { prisma } from "../lib/prisma";
import { buildCanonicalKey } from "../lib/canonical-key";

type ProductRow = {
  id: string;
  name: string;
};

async function backfill() {
  const products: ProductRow[] = await prisma.product.findMany({
    where: { canonicalKey: null },
    select: { id: true, name: true },
  });

  let updated = 0;

  for (const product of products) {
    const canonicalKey = buildCanonicalKey(product.name);
    if (!canonicalKey) {
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { canonicalKey },
    });

    updated += 1;
  }

  console.log(`Updated ${updated} products with canonical keys.`);
}

backfill()
  .catch((error) => {
    console.error("Canonical key backfill failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
