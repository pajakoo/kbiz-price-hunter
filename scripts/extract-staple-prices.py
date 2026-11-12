"""Extract exact-variant staple observations into one canonical product per pack."""
import collections
import importlib.util
import json
import re
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('price_input', Path(__file__).with_name('prepare-price-input.py'))
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
DATES = ['2026-01-16', '2026-03-14', '2026-05-14', '2026-10-01', '2026-10-14']


def match_product(name):
    text = re.sub(r'(\d)[.,]\s*(\d)', r'\1.\2', name.lower())
    if re.search(r'\d\s*[xх×*]\s*\d|стек|пакетч|промопак|\d\s*\+\s*\d|/\s*\d|<\d|[a-zа-я]\s*[*×]\s*\d|\d\s*бр\b', text):
        return None
    sizes = re.findall(r'(?<![\d.])(\d+(?:\.\d+)?)\s*(кг|гр|мл|kg|ml|г|л|g|l)(?![a-zа-я])', text)
    amounts = [(float(n) / (1000 if unit in ('г', 'гр', 'g', 'мл', 'ml') else 1),
                'l' if unit in ('мл', 'ml', 'л', 'l') else 'kg') for n, unit in sizes]
    if len(amounts) != 1:
        return None
    size, unit = amounts[0]
    if 'верея' in text and 'мляко' in text:
        if re.search(r'чудно|без.?лакт|uht|ухт|бариста|знп|бдс', text):
            return None
        if ('прясно' in text or 'пр.' in text) and re.search(r'(?<![\d.])3\s*%', text) and (size, unit) == (1, 'l'):
            return 'pryasno-mlyako-vereya-3-1l'
        if ('кисело' in text or 'кис.' in text) and re.search(r'(?<![\d.])2\s*%', text) and (size, unit) == (0.4, 'kg'):
            return 'kiselo-mlyako-vereya-2-400g'
    if 'боженци' in text and re.search(r'2\.2\s*%', text) and (size, unit) == (0.4, 'kg') and not re.search(r'знп|бдс', text):
        return 'kiselo-mlyako-bozhentsi-2-2-400g'
    if 'захар' in text and (size, unit) == (1, 'kg'):
        if re.search(r'кафяв|тръст|пудра|жели|фин|бучк|стик|саш|sachet|джъст|диамант', text):
            return None
        if 'сладея' in text:
            return 'byala-zahar-sladeya-1kg'
        if 'захира' in text:
            return 'byala-zahar-zahira-1kg'
    if 'велинград' in text and 'мин' in text and (size, unit) == (1.5, 'l'):
        if not re.search(r'газ|spark|fruity|фрути|лимон|ябъл|ягод|праск', text):
            return 'mineralna-voda-velingrad-1-5l'
    if re.search(r'\bбисер\b', text) and 'олио' in text and (size, unit) == (1, 'l'):
        return 'slanchogledovo-olio-biser-1l'
    if 'хорцето' in text and 'закуска' in text and (size, unit) == (0.56, 'kg'):
        if not re.search(r'домаш|ръчени|фино', text):
            return 'lyutenitsa-hortseto-zakuska-560g'
    return None


def main():
    records, rejected, aliases = [], [], collections.defaultdict(set)
    for day in DATES:
        with zipfile.ZipFile(f'data/{day}.zip') as z:
            for source in sorted(z.namelist()):
                if not source.endswith('.csv'):
                    continue
                groups, blocked = {}, set()
                try:
                    reader, _ = parser.source_reader(z.read(source).decode('utf-8-sig'))
                    for raw in reader:
                        name = raw.get(parser.HEADERS['productName']) or ''
                        slug = match_product(name)
                        if not slug:
                            continue
                        if any(raw.get(h) is None for h in parser.HEADERS.values()):
                            rejected.append({'date': day, 'source': source, 'name': name, 'reason': 'Incomplete row'})
                            continue
                        row = {key: raw[h].strip() for key, h in parser.HEADERS.items()}
                        key = (slug, row['city'], row['store'])
                        try:
                            promo = parser.price(row['promoPrice'])
                            amount = promo if promo and promo > 0 else parser.price(row['retailPrice'])
                            if not amount or amount <= 0 or not row['store']:
                                raise ValueError('Missing positive price/store')
                            value = (amount, bool(promo))
                            if key in groups and groups[key]['value'] != value:
                                raise ValueError('Conflicting same-store/date observations')
                            groups[key] = {'slug': slug, 'supplier': source, 'code': row['productCode'],
                                           'name': name, 'cityCode': row['city'], 'store': row['store'],
                                           'date': day, 'amount': str(amount), 'isPromo': bool(promo),
                                           'source': f'{day}.zip/{source}', 'value': value}
                        except ValueError as error:
                            blocked.add(key)
                            rejected.append({'date': day, 'source': source, 'name': name, 'reason': str(error)})
                    for key, row in groups.items():
                        if key not in blocked:
                            row.pop('value')
                            records.append(row)
                            aliases[row['slug']].add((source, row['code'], row['name']))
                except (ValueError, UnicodeError, parser.csv.Error) as error:
                    rejected.append({'date': day, 'source': source, 'reason': str(error)})
    profiles = json.loads(Path('lib/staple-products.json').read_text())
    assert {r['slug'] for r in records} == {p['slug'] for p in profiles}, 'Missing product observations'
    summary = {}
    for p in profiles:
        rows = [r for r in records if r['slug'] == p['slug']]
        summary[p['slug']] = {'observations': len(rows), 'suppliers': len({r['supplier'] for r in rows}),
                             'stores': len({(r['supplier'], r['cityCode'], r['store']) for r in rows}),
                             'dates': sorted({r['date'] for r in rows}), 'aliases': sorted(aliases[p['slug']])}
    Path('data/staple-prices.json').write_text(json.dumps({'records': records, 'summary': summary, 'rejected': rejected}, ensure_ascii=False), encoding='utf-8')
    Path('data/staple-price-audit.json').write_text(json.dumps({'summary': summary, 'rejected': rejected}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: {a: b for a, b in v.items() if a != 'aliases'} for k, v in summary.items()}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
