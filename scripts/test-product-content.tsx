import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { getCuratedProfile } from "../lib/curated-profiles";
import { stapleProducts } from "../lib/staple-profiles";
import ProductQuestions from "../app/products/ProductQuestions";
import StapleProfile from "../app/products/StapleProfile";
import YogurtProfile, { yogurtSlug } from "../app/products/YogurtProfile";

assert.equal(stapleProducts.length, 8);
assert.equal(new Set(stapleProducts.map(p => p.slug)).size, 8);
let rendered = 0;
for (const product of stapleProducts) {
  const profile = getCuratedProfile(product.slug);
  assert.ok(profile);
  assert.equal(profile.checked, "2026-11-06");
  assert.equal(profile.questions?.length, 2);
  assert.ok(profile.quantity > 0);
  assert.ok(profile.sources.every(source => new URL(source.url).protocol === "https:"));
  for (const bg of [true, false]) {
    const locale = bg ? "bg" : "en";
    const html = renderToStaticMarkup(product.slug === yogurtSlug
      ? <YogurtProfile bg={bg} /> : <StapleProfile profile={profile} bg={bg} />);
    assert.equal((html.match(/id="product-questions"/g) ?? []).length, 1);
    for (const { question, answer } of profile.questions ?? []) {
      assert.ok(question.bg && question.en && answer.bg && answer.en);
      assert.ok(html.includes(question[locale]));
      assert.ok(html.includes(answer[locale]));
    }
    const quantity = new Intl.NumberFormat(locale).format(profile.quantity);
    assert.ok(html.includes(bg ? `на ${quantity}` : `by ${quantity}`));
    assert.ok(html.includes(bg ? "не потвърждава текуща наличност" : "does not confirm current availability"));
    assert.ok(html.includes(profile.checked));
    rendered++;
  }
}

// Non-priority enrichments retain their existing rendering without new empty sections.
assert.equal(renderToStaticMarkup(<ProductQuestions profile={{ quantity: 1, unit: "l" }} bg />), "");
const butter = getCuratedProfile("maslo-olimpus-200gr");
assert.ok(butter);
assert.ok(!renderToStaticMarkup(<StapleProfile profile={butter} bg />).includes("product-questions"));
const water = getCuratedProfile("mineralna-voda-velingrad-1-5l");
assert.ok(water?.questions?.some(q => q.answer.bg.includes("под 7 години") && q.answer.en.includes("under seven")));
const sugar = getCuratedProfile("byala-zahar-zahira-1kg");
assert.ok(sugar?.questions?.some(q => q.answer.bg.includes("5941223000451") && q.answer.bg.includes("5941223000458")));
assert.ok(getCuratedProfile("slanchogledovo-olio-biser-1l")?.values.length === 0);
assert.equal(getCuratedProfile("unknown-product"), null);
console.log(`Product content checks passed: ${rendered} localized priority profiles and non-priority fallback.`);
