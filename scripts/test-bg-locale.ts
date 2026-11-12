import assert from "node:assert/strict";
import { defaultLocale, locales, getDictionary } from "../lib/i18n";
import { getLocaleAlternates } from "../lib/seo";

assert.equal(defaultLocale, "bg");
assert.deepEqual([...locales], ["bg"]);
assert.ok(getDictionary(defaultLocale).nav.products);

for (const path of ["", "/products", "/products/sample-product"]) {
  const alternates = getLocaleAlternates(path, "bg");
  assert.equal(alternates?.canonical, `/bg${path}`);
  assert.deepEqual(alternates?.languages, {
    bg: `/bg${path}`,
    "x-default": `/bg${path}`,
  });
}

console.log("BG-only locale and metadata checks passed.");
