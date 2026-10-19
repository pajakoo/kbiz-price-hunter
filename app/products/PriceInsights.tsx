import type { Locale } from "@/lib/i18n";
import type { PriceSummary } from "@/lib/price-summary";

export default function PriceInsights({ summary, locale, unit, quantity }: {
  summary: PriceSummary; locale: Locale; unit?: string; quantity?: number;
}) {
  if (!summary.dates.length) return null;
  const bg = locale === "bg";
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const unitLabel = unit === "l" ? (bg ? "литър" : "litre") : (bg ? "килограм" : "kilogram");
  const formatDate = (value: string) => dateFormat.format(new Date(`${value}T00:00:00Z`));
  const changeText = summary.change === null ? null
    : `${summary.change > 0 ? "+" : ""}${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(summary.change)}%`;
  const first = summary.dates[0];
  const last = summary.dates.at(-1)!;

  return <section className="section" aria-labelledby="price-insights">
    <h2 id="price-insights">{bg ? "Какво показват записаните цени" : "What the recorded prices show"}</h2>
    <p>{bg
      ? `В базата има ${summary.observationCount.toLocaleString(locale)} наблюдения за този продукт от ${summary.storeCount.toLocaleString(locale)} обекта в ${summary.cityCount.toLocaleString(locale)} населени места. Числата описват само нашите записи, не целия пазар.`
      : `Our records hold ${summary.observationCount.toLocaleString(locale)} observations for this product from ${summary.storeCount.toLocaleString(locale)} locations in ${summary.cityCount.toLocaleString(locale)} settlements. These figures describe our records only, not the whole market.`}</p>
    <div className="card table-shell">
      <table className="price-table">
        <caption>{bg ? "Медиана, минимум и максимум по дата на наблюдение (EUR)" : "Median, minimum and maximum by observation date (EUR)"}</caption>
        <thead><tr>
          <th scope="col">{bg ? "Дата" : "Date"}</th>
          <th scope="col">{bg ? "Записи" : "Records"}</th>
          <th scope="col">{bg ? "Най-ниска" : "Lowest"}</th>
          <th scope="col">{bg ? "Медиана" : "Median"}</th>
          <th scope="col">{bg ? "Най-висока" : "Highest"}</th>
        </tr></thead>
        <tbody>{summary.dates.map(day => <tr key={day.date}>
          <td>{formatDate(day.date)}</td>
          <td>{day.count}</td>
          <td>{number.format(day.min)}</td>
          <td>{number.format(day.median)}</td>
          <td>{number.format(day.max)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {changeText && <p>{bg
      ? `Медианата се променя с ${changeText} между първата и последната дата с наблюдения (${formatDate(first.date)} – ${formatDate(last.date)}). Това е разлика между две наблюдения, а не измерена инфлация.`
      : `The median moved ${changeText} between the first and last dates with observations (${formatDate(first.date)} – ${formatDate(last.date)}). This is a difference between two observations, not measured inflation.`}</p>}
    {unit && quantity ? <p>{bg
      ? `За сравнение с други разфасовки: разделете цената на ${quantity.toLocaleString(locale)} и получете цена за ${unitLabel}. Така 1 кг или 1 л от различни продукти стават съпоставими.`
      : `To compare other pack sizes: divide the price by ${quantity.toLocaleString(locale)} to get the price per ${unitLabel}. That makes 1 kg or 1 l comparable across products.`}</p> : null}
    <p style={{ color: "var(--ink-muted)" }}>{bg
      ? "Липсваща дата означава липса на запис, не липса на продукт в магазина. Различните дати обхващат различен брой обекти."
      : "A missing date means we have no record, not that the store lacked the product. Coverage differs between dates."}</p>
  </section>;
}
