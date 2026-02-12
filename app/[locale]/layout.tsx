import Link from "next/link";
import ThemeToggle from "@/app/ThemeToggle";
import LocaleSwitcher from "@/app/LocaleSwitcher";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}`;
  const session = await getSession();
  const [productCount, alertCount] = await Promise.all([
    prisma.product.count(),
    session
      ? prisma.priceAlertNotification.count({ where: { userId: session.user.id } })
      : Promise.resolve(0),
  ]);
  const alertLabel = alertCount > 9 ? "9+" : String(alertCount);
  const productLabel = productCount > 99 ? "99+" : String(productCount);

  return (
    <>
      <header className="site-header">
        <div className="container nav-wrap">
          <Link className="brand" href={basePath}>
            Kbiz Price Hunter
          </Link>
          <nav className="nav-links">
            <Link href={`${basePath}/products`} className="nav-alert">
              {dict.nav.products}
              {productCount > 0 ? <span className="nav-badge">{productLabel}</span> : null}
            </Link>
            <Link href={`${basePath}/dashboard`} className="nav-alert">
              {dict.nav.dashboard}
              {alertCount > 0 ? <span className="nav-badge">{alertLabel}</span> : null}
            </Link>
            <LocaleSwitcher locale={normalizedLocale} />
            <ThemeToggle />
            <Link href={`${basePath}/login`} className="button ghost">
              {dict.nav.access}
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h3>{dict.footer.title}</h3>
            <p>{dict.footer.body}</p>
          </div>
          <div className="footer-links">
            <Link href={`${basePath}/products`}>{dict.footer.browse}</Link>
            <Link href={`${basePath}/login`}>{dict.footer.magic}</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
