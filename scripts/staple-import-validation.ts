export function importOptions(args: string[], env: Record<string, string | undefined>) {
  if (args.some(arg => !["--production", "--dry-run"].includes(arg))) {
    throw new Error("Unknown argument");
  }
  const production = args.includes("--production");
  const url = env[production ? "DATABASE_URL_SUPABASE" : "DATABASE_URL"];
  if (!url) throw new Error("Missing database URL");
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("Expected PostgreSQL URL");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (!production && !local) throw new Error("Remote database requires --production");
  if (production && local) throw new Error("Production URL points to localhost");
  return { production, dryRun: args.includes("--dry-run"), url };
}

export function validateRecords(input: unknown, allowed: Set<string>) {
  if (!input || typeof input !== "object" || !("records" in input) ||
      !Array.isArray(input.records) || !input.records.length) throw new Error("Missing records");
  const seen = new Set<string>();
  const slugs = new Set<string>();
  for (const row of input.records) {
    if (!row || typeof row !== "object") throw new Error("Invalid row");
    for (const key of ["slug", "supplier", "code", "name", "cityCode", "store", "date", "amount", "source"]) {
      if (typeof row[key] !== "string" || !row[key].trim()) throw new Error(`Invalid ${key}`);
    }
    if (!allowed.has(row.slug) || !/^\d+(\.\d+)?$/.test(row.amount) ||
        !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0 || typeof row.isPromo !== "boolean") {
      throw new Error("Invalid product, price or promotion");
    }
    const date = new Date(`${row.date}T00:00:00Z`);
    if (!/^2026-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== row.date) throw new Error("Invalid date");
    const key = JSON.stringify([row.slug, row.supplier, row.cityCode, row.store, row.date]);
    if (seen.has(key)) throw new Error("Duplicate observation");
    seen.add(key);
    slugs.add(row.slug);
  }
  if (slugs.size !== allowed.size) throw new Error("Incomplete product coverage");
}
