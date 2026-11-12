import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import StapleProfile from "../app/products/StapleProfile";
import { getCuratedProfile } from "../lib/curated-profiles";
import { stapleProducts } from "../lib/staple-profiles";

const drafts = [
  { slug: "brashno-sofiya-mel-ekstra-1kg", term: "пшенично", source: "sofiamel.bg" },
  { slug: "mineralna-voda-devin-1-5l", term: "стек", source: "devin2u.bg" },
];

for (const { slug, term, source } of drafts) {
  const profile = getCuratedProfile(slug);
  assert.ok(profile);
  assert.ok(!stapleProducts.some(p => p.slug === slug), "Drafts must not enter the price-refresh list implicitly");
  assert.equal(profile.checked, "2026-11-07");
  assert.ok(profile.description.bg && profile.description.en);
  assert.ok(profile.facts.every(f => f.bg && f.en));
  assert.ok(profile.facts.some(f => f.bg.toLowerCase().includes(term)));
  assert.ok(profile.sources.every(s => new URL(s.url).protocol === "https:" && s.url.includes(source)));
  for (const bg of [true, false]) {
    const html = renderToStaticMarkup(<StapleProfile profile={profile} bg={bg} />);
    assert.ok(html.includes(bg ? "За продукта" : "About this product"));
    assert.ok(html.includes(profile.facts[0][bg ? "bg" : "en"]));
    assert.ok(html.includes(profile.sources[0].url));
  }
}

const flour = getCuratedProfile(drafts[0].slug);
const water = getCuratedProfile(drafts[1].slug);
assert.ok(flour?.values.some(([label, value]) => label.includes("Energy") && value.includes("1448")));
assert.ok(water?.facts.some(f => f.bg.includes("не е цена за бутилка")));
assert.equal(water?.values.length, 0);
console.log("Two source-backed draft profiles render in BG/EN; no implicit price-refresh enrollment.");
