import Link from "next/link";
import ThemeToggle from "@/app/ThemeToggle";
import LocaleSwitcher from "@/app/LocaleSwitcher";
import { getDictionary, type Locale } from "@/lib/i18n";

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

  return (
    <>
      <header className="site-header">
        <div className="container nav-wrap">
          <Link className="brand" href={basePath}>
            Kbiz Price Hunter
          </Link>
          <nav className="nav-links">
            <Link href={`${basePath}/products`}>{dict.nav.products}</Link>
            <Link href={`${basePath}/dashboard`}>{dict.nav.dashboard}</Link>
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
