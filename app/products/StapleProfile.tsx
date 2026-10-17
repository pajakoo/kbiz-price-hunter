import type { StapleProduct } from "@/lib/staple-profiles";

export default function StapleProfile({ profile, bg }: { profile: StapleProduct; bg: boolean }) {
  const locale = bg ? "bg" : "en";
  return <section className="section" aria-labelledby="product-details">
    <h2 id="product-details">{bg ? "За продукта" : "About this product"}</h2>
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      <div className="card">
        <h3>{bg ? "Състав, употреба и разфасовка" : "Ingredients, use and pack size"}</h3>
        {profile.facts.map((fact, index) => <p key={index}>{fact[locale]}</p>)}
        {profile.gtin && <p>EAN: {profile.gtin}</p>}
      </div>
      {profile.values.length > 0 && <div className="card table-shell">
        <table className="price-table">
          <caption>{profile.valuesCaption[locale]}</caption>
          <tbody>{profile.values.map(([label, value]) => <tr key={label}>
            <th scope="row">{label.split(" / ")[bg ? 0 : 1]}</th><td>{value}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
    <p>{bg ? "Източници от производителя/марката: " : "Producer/brand sources: "}
      {profile.sources.map((source, index) => <span key={source.url}>
        {index > 0 && " · "}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>
      </span>)}
    </p>
    <p>{bg ? "Проверено: " : "Checked: "}{profile.checked}. {bg
      ? "При разлика следвайте етикета на конкретната опаковка. Цените по-долу идват от отделните търговски записи, а не от сайтовете на производителите."
      : "If details differ, follow your pack’s label. Prices below come from separate retailer records, not the producer websites."}</p>
  </section>;
}
