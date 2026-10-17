import Link from "next/link";
import { stapleProducts } from "@/lib/staple-profiles";
import { prisma } from "@/lib/prisma";
import { getLocaleAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const bg = (await params).locale === "bg";
  return { title: bg ? "Основни продукти — цени и история | Ловец на цени" : "Everyday staples — prices and history | Price Hunter",
    description: bg ? "Мляко, захар, олио, вода и лютеница: сравнете записаните цени по магазини и вижте информацията от производителите." : "Milk, sugar, oil, water and lyutenitsa: compare recorded store prices and producer-sourced product information.",
    alternates: getLocaleAlternates("/products/staples", bg ? "bg" : "en") };
}
export default async function StaplesPage({ params }: Props) {
  const bg = (await params).locale === "bg";
  const locale = bg ? "bg" : "en";
  const products = await prisma.product.findMany({ where: { slug: { in: stapleProducts.map(p => p.slug) } },
    select: { slug: true, _count: { select: { prices: true } } } });
  return <main className="page-shell"><div className="container">
    <h1>{bg ? "Основни продукти: състав, цени и история" : "Everyday staples: facts, prices and history"}</h1>
    <p>{bg ? "Изберете точната разфасовка. Всяка страница обединява записаните цени по магазини, с дати и източници. Наблюденията не потвърждават текуща наличност." : "Choose the exact pack. Each page combines recorded store prices with dates and sources. Observations do not confirm current availability."}</p>
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {stapleProducts.map(profile => <article className="card" key={profile.slug}>
        <h2><Link href={`/${locale}/products/${profile.slug}`}>{profile.name}</Link></h2>
        <p>{profile.description[locale]}</p>
        <p>{bg ? "Ценови наблюдения: " : "Price observations: "}{products.find(p => p.slug === profile.slug)?._count.prices ?? 0}</p>
        <Link href={`/${locale}/products/${profile.slug}#store-comparison`}>{bg ? "Сравни магазините →" : "Compare stores →"}</Link>
      </article>)}
    </div>
  </div></main>;
}
