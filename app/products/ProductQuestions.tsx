import type { CuratedProfile } from "../../lib/curated-profiles";

type Props = {
  profile: Pick<CuratedProfile, "quantity" | "unit" | "questions">;
  bg: boolean;
};

export default function ProductQuestions({ profile, bg }: Props) {
  if (!profile.questions?.length) return null;
  const locale = bg ? "bg" : "en";
  const quantity = new Intl.NumberFormat(locale).format(profile.quantity);
  const unit = profile.unit === "kg" ? (bg ? "кг" : "kg") : (bg ? "л" : "l");

  return <section className="section" aria-labelledby="product-questions">
    <h2 id="product-questions">{bg ? "Въпроси за продукта и сравняването на цени" : "Product and price comparison questions"}</h2>
    <div className="card">
      <h3>{bg ? "Как да сравня цената за еднакво количество?" : "How do I compare prices for the same quantity?"}</h3>
      <p>{bg
        ? `Тази разфасовка съдържа ${quantity} ${unit}. За цена за ${unit} разделете цената на опаковката на ${quantity}.`
        : `This pack contains ${quantity} ${unit}. For the price per ${unit}, divide the pack price by ${quantity}.`}</p>
      <p>{bg
        ? "Сравнявайте еднакъв продукт и еднаква дата. Най-ниската записана цена не потвърждава текуща наличност или действаща промоция; проверете датата, магазина и условията преди покупка."
        : "Compare the same product on the same date. The lowest recorded price does not confirm current availability or an active promotion; check the date, store and terms before buying."}</p>
    </div>
    {profile.questions.map(({ question, answer }) => <div className="card" key={question.en}>
      <h3>{question[locale]}</h3>
      <p>{answer[locale]}</p>
    </div>)}
  </section>;
}
