"""Select a diverse, source-backed 100-product Keyword Planner research batch."""
import collections
import csv
import importlib.util
import json
import re
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("price_input", Path(__file__).with_name("prepare-price-input.py"))
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)


def clean(name):
    name = re.sub(r"#[^#]*#", " ", name).lower()
    name = name.replace('*', '').replace('№', 'n')
    name = re.sub(r'\s+-\s+', ' ', name)
    name = re.sub(r"(\d)[.,]\s+(\d)", r"\1.\2", name)
    name = re.sub(r"(?<=\d)\s*(?:гр\.?|г\.?)(?=\s|$)", " г", name)
    name = re.sub(r"(?<=\d)\s*мл\.?(?=\s|$)", " мл", name)
    name = re.sub(r"(?<=\d)\s*л\.?(?=\s|$)", " л", name)
    name = re.sub(r"\s*,\s*р\s+", " ", name)
    name = re.sub(r"(?<=\d)\s*(кг|бр)\.?(?=\s|$)", r" \1", name)
    name = name.replace('паст. за зъб.', 'паста за зъби ').replace('п/в пърхот', 'против пърхот')
    name = name.replace('раф.слънчог.олио', 'рафинирано слънчогледово олио')
    name = name.replace('маслин.масло', 'маслиново масло').replace('от масл.', 'от маслиново')
    name = re.sub(r'^(\d+(?:[.,]\d+)?\s*(?:кг|г|мл|л|бр))\s+(.+)$', r'\2 \1', name)
    return re.sub(r"\s+", " ", name).strip(" .,;")


def main():
    archive = Path("data/2026-10-14.zip")
    products = {}
    errors = []
    with zipfile.ZipFile(archive) as z:
        for source in sorted(z.namelist()):
            if not source.endswith('.csv'):
                continue
            observations, blocked = {}, set()
            try:
                reader, _ = parser.source_reader(z.read(source).decode('utf-8-sig'))
                for row in reader:
                    if None in row or any(row.get(h) is None for h in parser.HEADERS.values()):
                        continue
                    key = tuple(row[parser.HEADERS[h]].strip() for h in ('productCode', 'city', 'store'))
                    try:
                        promo = parser.price(row[parser.HEADERS['promoPrice']])
                        amount = promo if promo and promo > 0 else parser.price(row[parser.HEADERS['retailPrice']])
                        if not amount or amount <= 0:
                            blocked.add(key)
                            continue
                        value = (row[parser.HEADERS['productName']].strip(), amount, bool(promo), row.get('Категория', '').strip())
                        if key in observations and observations[key] != value:
                            blocked.add(key)
                        observations[key] = value
                    except ValueError:
                        blocked.add(key)
            except (ValueError, csv.Error, UnicodeError) as error:
                errors.append({'source': source, 'error': str(error)})
                continue
            for (code, city, store), (name, amount, promo, category) in observations.items():
                if (code, city, store) in blocked:
                    continue
                if not category.isdigit() or int(category) not in (set(range(1, 75)) | set(range(79, 85))):
                    continue
                keyword = clean(name)
                if keyword == 'шоколад млечен 80 г':
                    continue  # No brand: cannot identify an exact comparable product.
                if len(keyword.split()) < 3 or len(keyword) > 80:
                    continue
                if not re.search(r'\d\s*(?:кг|г|мл|л|бр|kg|ml|g)\b', keyword):
                    continue
                fingerprint = ' '.join(sorted(re.findall(r'[\w.%]+', keyword)))
                item = products.setdefault(fingerprint, {'keyword': keyword, 'category': category,
                    'names': set(), 'locations': set(), 'identities': set()})
                item['names'].add(name)
                item['locations'].add((source, city, store))
                item['identities'].add((source, code))
    ranked = sorted(products.values(), key=lambda p: (-len(p['locations']), p['keyword']))
    selected, category_counts = [], collections.Counter()
    # Coverage is a research selection signal, not search popularity.
    for cap in (3, 5, 8, 100):
        for item in ranked:
            if len(selected) == 100:
                break
            if len(item['locations']) < 10 or item in selected or category_counts[item['category']] >= cap:
                continue
            selected.append(item)
            category_counts[item['category']] += 1
    assert len(selected) == 100, f'Only {len(selected)} eligible products'
    rows = [{'keyword': p['keyword'], 'source_date': archive.stem,
             'locations': len(p['locations']), 'supplier_count': len({s for s, _ in p['identities']}),
             'source_category': p['category'], 'source_names': sorted(p['names']),
             'supplier_codes': sorted(p['identities'])} for p in selected]
    Path('data/keyword-planner-100.txt').write_text('\n'.join(r['keyword'] for r in rows) + '\n', encoding='utf-8')
    with Path('data/keyword-planner-100.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Keyword'])
        writer.writerows([r['keyword']] for r in rows)
    Path('data/keyword-planner-100-evidence.json').write_text(json.dumps(
        {'method': 'Category-diversified store coverage; not search-volume ranking. Exact name normalization only; cross-source SKU equivalence not verified.',
         'products': rows, 'unreadable_sources': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Exported {len(rows)} unique keywords across {len(category_counts)} source categories.')
    print(f'Unreadable sources: {len(errors)}')
    for i, row in enumerate(rows, 1):
        print(f"{i}. {row['keyword']} ({row['locations']} locations)")


if __name__ == '__main__':
    main()
