export const yogurtSlug = "kiselo-mlyako-bozhentsi-2-2-400g";
export const yogurtSource = "https://www.elvimilk.bg/bg/products/kiselo-mljako-ay-bojenci-au-4/";

export function yogurtDescription(bg: boolean) {
  return bg
    ? "Боженци 2.2% е частично обезмаслено краве кисело мляко в кофичка от 400 г, произведено от ЕЛВИ. Сравнете записаните цени по магазини и вижте състава, хранителните стойности и историята на цените."
    : "Bozhentsi 2.2% is a partially skimmed cow’s milk yogurt in a 400 g pot, produced by ELVI. Compare recorded store prices and explore ingredients, nutrition and price history.";
}

export default function YogurtProfile({ bg }: { bg: boolean }) {
  const nutrition = [
    [bg ? "Енергия" : "Energy", "218 kJ / 52 kcal"],
    [bg ? "Мазнини" : "Fat", "2.2 g"],
    [bg ? "Наситени мастни киселини" : "Saturates", "1.4 g"],
    [bg ? "Въглехидрати" : "Carbohydrate", "4.5 g"],
    [bg ? "Захари" : "Sugars", "4.5 g"],
    [bg ? "Белтъчини" : "Protein", "3.6 g"],
    [bg ? "Сол" : "Salt", "0.10 g"],
  ];
  return (
    <section className="section" aria-labelledby="product-details">
      <h2 id="product-details">{bg ? "За продукта" : "About this product"}</h2>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <div className="card">
          <h3>{bg ? "Състав и съхранение" : "Ingredients and storage"}</h3>
          <p>{bg
            ? "Краве мляко, сухо обезмаслено краве мляко и българска закваска. Производителят посочва Lactobacillus bulgaricus и Streptococcus thermophilus като култури в закваската."
            : "Cow’s milk, skimmed milk powder and Bulgarian starter culture. The manufacturer identifies Lactobacillus bulgaricus and Streptococcus thermophilus in the culture."}</p>
          <p><strong>{bg ? "Алерген: мляко." : "Allergen: milk."}</strong></p>
          <p>{bg ? "Опаковка: 400 г. Масленост: 2.2%. Производител: ЕЛВИ ООД, с. Велковци, България." : "Pack: 400 g. Fat: 2.2%. Manufacturer: ELVI OOD, Velkovtsi, Bulgaria."}</p>
          <p>{bg ? "Съхранение: от 2 до 6°C. Посочен срок на годност: 20 дни от производството. Следвайте датата и указанията на конкретната опаковка." : "Store at 2–6°C. Stated shelf life: 20 days from production. Follow the date and instructions on your pack."}</p>
        </div>
        <div className="card table-shell">
          <table className="price-table">
            <caption>{bg ? "Хранителни стойности за 100 г" : "Nutrition per 100 g"}</caption>
            <tbody>{nutrition.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody>
          </table>
          <p>{bg ? "Солта е от естествено съдържащия се в млякото натрий според производителя." : "According to the manufacturer, salt comes from sodium naturally present in milk."}</p>
        </div>
      </div>
      <p>{bg ? "Източник: " : "Source: "}<a href={yogurtSource} rel="noopener noreferrer" target="_blank">{bg ? "ЕЛВИ — Кисело мляко Боженци" : "ELVI — Bozhentsi yogurt"}</a>
        {bg ? ". Проверено на 15.10.2026 г. Данните са за варианта 2.2%, а не за 3.6% или 4%. При разлика следвайте етикета." : ". Checked 15 October 2026. These details describe the 2.2% variant, not 3.6% or 4%. If information differs, follow the label."}
      </p>
    </section>
  );
}
