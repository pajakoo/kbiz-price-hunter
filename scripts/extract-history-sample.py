"""Extract a repeatable 10x10x5 sample without unpacking entire archives."""
import collections
import csv
import io
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DATES = ["2026-01-16", "2026-03-14", "2026-05-14", "2026-10-01", "2026-10-14"]
SUPPLIER = "BulMag (ТРЪНЧЕВ ООД)_127585839.csv"


def positive(value):
    try:
        number = Decimal((value or "").strip().replace(",", "."))
        return number if number.is_finite() and number > 0 else None
    except InvalidOperation:
        return None


observations = {}
for day in DATES:
    rows = {}
    with ZipFile(ROOT / "data" / f"{day}.zip") as archive:
        with archive.open(SUPPLIER) as stream:
            for row in csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline="")):
                promo = positive(row["Цена в промоция"])
                amount = promo or positive(row["Цена на дребно"])
                if amount is None:
                    continue
                key = tuple(row[column].strip() for column in [
                    "Код на продукта", "Наименование на продукта", "Населено място", "Търговски обект"
                ])
                value = {"amount": str(amount), "isPromo": promo is not None}
                if key in rows and rows[key] != value:
                    raise ValueError(f"Conflicting observation: {day} {key}")
                rows[key] = value
    observations[day] = rows

common = set.intersection(*(set(rows) for rows in observations.values()))
by_product = collections.defaultdict(set)
for code, name, city, store in common:
    by_product[(code, name)].add((city, store))
products = []
stores = None
for product in sorted(by_product, key=lambda key: (-len(by_product[key]), key)):
    overlap = by_product[product] if stores is None else stores & by_product[product]
    if len(overlap) >= 10:
        products.append(product)
        stores = overlap
    if len(products) == 10:
        break
if len(products) != 10:
    raise ValueError("No complete 10-product / 10-store sample")
stores = sorted(stores)[:10]
records = []
for day in DATES:
    for code, name in products:
        for city, store in stores:
            records.append({"date": day, "code": code, "name": name, "cityCode": city,
                            "store": store, "source": f"{day}.zip/{SUPPLIER}",
                            **observations[day][(code, name, city, store)]})
assert len(records) == 500
output = ROOT / "data" / "history-sample.json"
output.write_text(json.dumps({"supplier": SUPPLIER, "dates": DATES, "records": records},
                            ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Extracted {len(records)} observations to {output}")
print("Dates:", ", ".join(DATES))
for _, name in products:
    print(name)
