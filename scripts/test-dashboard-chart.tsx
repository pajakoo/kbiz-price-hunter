import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import PriceChart from "../app/dashboard/PriceChart";

const props = {
  productLabel: "Продукт",
  storeLabel: "Магазин",
  cityLabel: "Град",
  allStoresLabel: "Всички магазини",
  allCitiesLabel: "Всички градове",
  currencyLabel: "EUR",
  emptyStateLabel: "Няма данни",
  loadingLabel: "Зареждане",
};

const withProduct = renderToStaticMarkup(
  <PriceChart {...props} extraProducts={[{ name: "Тестов продукт", slug: "test-product" }]} />
);
assert.match(withProduct, /value="test-product" selected=""/);
assert.match(withProduct, /Зареждане/);

const sampleOnly = renderToStaticMarkup(<PriceChart {...props} />);
assert.match(sampleOnly, /value="olive-oil" selected=""/);
assert.doesNotMatch(sampleOnly, /Зареждане/);

console.log("Dashboard chart initial product and loading checks passed.");
