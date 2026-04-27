# Canonical Key Notes

## Goal
Use a canonical product key to identify the same product across different name variants, so imports deduplicate and historical prices merge correctly.

## Concept
Canonical key = standardized identifier derived from normalized product attributes.

Example (yogurt):
- "Кисело мляко Боженци 3.6% 400г"
- "БОЖЕНЦИ КИСЕЛО МЛЯКО 400Г 3,6%"

Canonical key:
- `bozhentsi|kiselo-mlyako|3.6|400g`

Example (medicine):
- "Нурофен 200мг табл. 20 бр"
- "NUROFEN 200 MG таблетки 20бр"

Canonical key:
- `nurofen|tablets|200mg|20`

## Intended Uses
1) Deduplication on import
- Compute canonical key for new CSV rows.
- If a product with the same key exists, attach prices to it instead of creating a new product.

2) Merge historical data
- Group products by canonical key for a unified price history and product page.

3) Admin review
- Provide a UI/report listing products that share a key for manual validation.

## Suggested Components for the Key
- brand
- base product name
- fat percentage (if applicable)
- size (g/ml)
- form/type (e.g., tablets, capsules)
- qualifiers (BDS/био/без лактоза)

## Next Steps
- Implement a parser to extract normalized attributes.
- Add a `CanonicalProduct` table (or `canonicalKey` column on Product).
- Backfill existing products and link new imports to canonical keys.

## Backfill
Run:
```
npm run backfill:canonical-key
```
