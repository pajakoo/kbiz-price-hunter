import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);

  return {
    title: "Ловец на цени",
    description: dict.home.intro,
    alternates: {
      canonical: `/${normalizedLocale}`,
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}`;

  return (
    <main>
      <section className="container hero">
        <span className="pill">{dict.home.pill}</span>
        <h1>{dict.home.title}</h1>
        <p>{dict.home.intro}</p>
        <div className="hero-actions">
          <Link className="button" href={`${basePath}/products`}>
            {dict.home.browse}
          </Link>
          <Link className="button ghost" href={`${basePath}/login`}>
            {dict.home.magic}
          </Link>
        </div>
      </section>

      <section className="section">
        <div
          className="container grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
        >
          {dict.home.cards.map((card) => (
            <div className="card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>{dict.home.howTitle}</h2>
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
          >
            {dict.home.how.map((item) => (
              <div className="card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
