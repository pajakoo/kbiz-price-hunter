import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getDictionary, type Locale } from "@/lib/i18n";
import CanonicalGroupManager from "@/app/dashboard/CanonicalGroupManager";

const GROUP_LIMIT = 100;

export default async function CanonicalKeyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}/dashboard`;
  const session = await getSession();

  if (!session) {
    redirect(`/${normalizedLocale}/login`);
  }

  const { q } = (await searchParams) ?? {};
  const query = q?.trim() ?? "";
  const products = await prisma.product.findMany({
    where: query
      ? {
          canonicalKey: { not: null },
          OR: [
            { canonicalKey: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : { canonicalKey: { not: null } },
    select: { id: true, name: true, slug: true, canonicalKey: true },
    orderBy: { name: "asc" },
  });

  const productMap = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const product of products) {
    const key = product.canonicalKey ?? "(none)";
    const list = productMap.get(key) ?? [];
    list.push({ id: product.id, name: product.name, slug: product.slug });
    productMap.set(key, list);
  }

  const groups = Array.from(productMap.entries())
    .filter(([, list]) => list.length > 1)
    .map(([canonicalKey, list]) => ({
      canonicalKey,
      count: list.length,
      products: list,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, GROUP_LIMIT);

  return (
    <main className="page-shell" suppressHydrationWarning>
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>{dict.dashboard.canonicalTitle}</h1>
            <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>
              {dict.dashboard.canonicalBody}
            </p>
          </div>
          <Link className="button ghost" href={basePath}>
            {dict.dashboard.canonicalBack}
          </Link>
        </div>

        <form className="section" method="get">
          <label htmlFor="canonical-search">{dict.dashboard.canonicalSearchLabel}</label>
          <input
            id="canonical-search"
            name="q"
            placeholder={dict.dashboard.canonicalSearchPlaceholder}
            defaultValue={query}
          />
          <button type="submit" className="button" style={{ marginTop: 12 }}>
            {dict.dashboard.canonicalSearchSubmit}
          </button>
        </form>

        {groups.length === 0 ? (
          <p style={{ marginTop: 24, color: "var(--ink-muted)" }}>{dict.dashboard.canonicalEmpty}</p>
        ) : (
          <div className="section" style={{ overflowX: "auto" }}>
            <CanonicalGroupManager
              groups={groups}
              locale={normalizedLocale}
              labels={{
                keyColumn: dict.dashboard.canonicalTableKey,
                groupColumn: dict.dashboard.canonicalGroupColumn,
                excludedColumn: dict.dashboard.canonicalExcludedColumn,
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
