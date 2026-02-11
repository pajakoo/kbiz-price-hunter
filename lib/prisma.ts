import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL;

const prismaOptions: { datasources?: { db?: { url: string } }; log: ("warn" | "error")[] } = {
  log: ["warn", "error"],
};

if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    if (url.hostname.includes("pooler.supabase.com")) {
      url.searchParams.set("pgbouncer", "true");
      url.searchParams.set("statement_cache_size", "0");
    }
    prismaOptions.datasources = { db: { url: url.toString() } };
  } catch {
    prismaOptions.datasources = { db: { url: databaseUrl } };
  }
}

export const prisma = global.prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
