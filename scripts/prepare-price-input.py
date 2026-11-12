"""Validate ZIP/CSV input without extracting archive paths. Emit JSONL staging files."""
import csv
import hashlib
import io
import json
import re
import sys
import zipfile
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path, PurePosixPath

HEADERS = {
    "city": "Населено място", "store": "Търговски обект",
    "productName": "Наименование на продукта", "productCode": "Код на продукта",
    "retailPrice": "Цена на дребно", "promoPrice": "Цена в промоция",
}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def observation_date(name, fallback):
    matches = set(re.findall(r"(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)", name))
    if len(matches) > 1:
        raise ValueError(f"Multiple dates in {name}")
    found = next(iter(matches), None)
    if found and fallback and found != fallback:
        raise ValueError(f"Date conflict for {name}: {found} versus {fallback}")
    value = found or fallback
    if not value or date.fromisoformat(value).isoformat() != value:
        raise ValueError(f"Missing/invalid observation date: {name}")
    return value


def price(value):
    value = value.strip().replace(",", ".")
    if not value:
        return None
    if not re.fullmatch(r"(?:\d+(?:\.\d*)?|\.\d+)", value):
        raise ValueError("Invalid price")
    number = Decimal(value)
    if not number.is_finite() or number > Decimal("1000000000"):
        raise ValueError("Price outside supported range")
    return number


def csv_reader(text):
    # Choose only a delimiter whose parsed header matches the source contract.
    for delimiter in (",", ";", "\t"):
        reader = csv.DictReader(io.StringIO(text, newline=""), delimiter=delimiter, strict=True, skipinitialspace=True)
        try:
            if reader.fieldnames and set(HEADERS.values()).issubset(reader.fieldnames):
                return reader
        except csv.Error:
            continue
    raise ValueError("Missing required headers")


def source_reader(text):
    reader = csv_reader(text)
    # Some exporters quote every field but fail to escape quotes inside names.
    # Recover only single-line, fully quoted records with exact field boundaries.
    try:
        for _ in reader:
            pass
        return csv_reader(text), 0
    except csv.Error:
        if reader.reader.dialect.delimiter != ',':
            return csv_reader(text), 0
    output = io.StringIO(newline='')
    writer = csv.writer(output)
    repaired = 0
    width = len(reader.fieldnames)
    for line in text.splitlines():
        if not line.strip():
            writer.writerow([])
            continue
        try:
            fields = next(csv.reader([line], strict=True, skipinitialspace=True))
        except csv.Error:
            if not (line.startswith('"') and line.endswith('"')):
                return csv_reader(text), 0
            fields = line[1:-1].split('","')
            if len(fields) != width:
                return csv_reader(text), 0
            fields = [field.replace('""', '"') for field in fields]
            repaired += 1
        if len(fields) != width:
            return csv_reader(text), 0
        writer.writerow(fields)
    return csv_reader(output.getvalue()), repaired


def prepare(target, output, fallback=None):
    target, output = Path(target), Path(output)
    if fallback:
        observation_date("", fallback)
    paths = [target] if target.is_file() else sorted(
        p for p in target.rglob("*") if p.suffix.lower() in (".zip", ".csv")
        and not any(part.startswith(".") or part.lower() in ("archive", "errors")
                    for part in p.relative_to(target).parts)
    )
    batches = []
    for archive_path in paths:
        day = observation_date(archive_path.name, fallback)
        archive = zipfile.ZipFile(archive_path) if archive_path.suffix.lower() == ".zip" else None
        try:
            if archive:
                entries = []
                for item in archive.infolist():
                    entry = PurePosixPath(item.filename.replace("\\", "/"))
                    if entry.is_absolute() or ".." in entry.parts or (item.external_attr >> 16) & 0o170000 == 0o120000:
                        raise ValueError(f"Unsafe ZIP entry: {item.filename}")
                    if item.filename.startswith("__MACOSX/") or item.is_dir():
                        continue
                    if entry.suffix.lower() == ".zip":
                        raise ValueError("Nested ZIP archives are not supported")
                    if entry.suffix.lower() == ".csv":
                        entries.append(item)
                if len(entries) > 1000 or sum(e.file_size for e in entries) > 2_000_000_000:
                    raise ValueError("Archive exceeds 1000 CSVs / 2 GB uncompressed limit")
                if len({e.filename for e in entries}) != len(entries):
                    raise ValueError("Duplicate ZIP entry names")
                inputs = [(e.filename, archive.open(e)) for e in sorted(entries, key=lambda e: e.filename)]
            else:
                if archive_path.suffix.lower() != ".csv":
                    raise ValueError("Input must be CSV or ZIP")
                inputs = [(archive_path.name, archive_path.open("rb"))]
            files, hashes, seen, rejected = [], [], {}, []
            blocked = set()
            for name, stream in inputs:
                reader = None
                try:
                    raw = stream.read(200_000_001)
                    if len(raw) > 200_000_000:
                        raise ValueError(f"CSV exceeds 200 MB: {name}")
                    if re.search(r"\d{4}-\d{2}-\d{2}", name):
                        observation_date(name, day)
                    hashes.append((name, digest(raw)))
                    reader, repaired = source_reader(raw.decode("utf-8-sig"))
                    dest = output / f"{len(batches)}-{len(files)}.jsonl"
                    count = 0
                    with dest.open("w", encoding="utf-8") as out:
                        for row in reader:
                            identity = None
                            try:
                                if None in row or any(row.get(h) is None for h in HEADERS.values()):
                                    raise ValueError("Wrong number of columns")
                                record = {key: row[h].strip() for key, h in HEADERS.items()}
                                key = (name, record["productCode"], record["city"], record["store"])
                                identity = digest(json.dumps(key, ensure_ascii=False).encode())
                                if not record["store"] or not record["productName"] or not record["productCode"]:
                                    raise ValueError("Missing product code/name or store")
                                promo, retail = price(record["promoPrice"]), price(record["retailPrice"])
                                amount = promo if promo is not None and promo > 0 else retail
                                if amount is None or amount <= 0:
                                    raise ValueError("No positive price")
                                key = (name, record["productCode"], record["city"], record["store"])
                                value = (record["productName"], amount, bool(promo))
                                if key in seen:
                                    if seen[key] != value:
                                        raise ValueError("Conflicting observations for same product/store/date")
                                    continue
                                seen[key] = value
                                record.update(amount=str(amount), isPromo=bool(promo), identity=digest(json.dumps(key, ensure_ascii=False).encode()))
                                out.write(json.dumps(record, ensure_ascii=False) + "\n")
                                count += 1
                            except (ValueError, InvalidOperation) as error:
                                if identity:
                                    blocked.add(identity)
                                rejected.append({"entry": name, "line": reader.line_num, "reason": str(error),
                                                 "identity": identity, "row": row})
                    files.append({"filePath": str(dest), "source": name, "rows": count,
                                  "repairedQuoteRows": repaired})
                except (csv.Error, ValueError, UnicodeError) as error:
                    rejected.append({"entry": name, "line": reader.reader.line_num if reader else 0,
                                     "reason": f"Entire entry rejected: {error}"})
                finally:
                    stream.close()
            for file in files:
                staged = Path(file['filePath'])
                filtered = staged.with_suffix('.filtered')
                with staged.open() as source, filtered.open('w') as dest:
                    for line in source:
                        record = json.loads(line)
                        if record['identity'] in blocked:
                            file['rows'] -= 1
                            rejected.append({'entry': file['source'], 'line': 0,
                                             'reason': 'Quarantined entire ambiguous observation group',
                                             'identity': record['identity'], 'row': record})
                        else:
                            dest.write(line)
                filtered.replace(staged)
            if not files or not sum(f["rows"] for f in files):
                raise ValueError(f"No valid CSV observations in {archive_path.name}")
            batches.append({"archive": archive_path.name, "date": day, "files": files,
                            "digest": digest(json.dumps(hashes).encode()),
                            "logicalKey": digest(json.dumps([day, sorted(n for n, _ in hashes)]).encode()),
                            "rejected": rejected})
        finally:
            if archive:
                archive.close()
    if not batches:
        raise ValueError("No ZIP/CSV inputs found")
    return sorted(batches, key=lambda b: (b["date"], b["archive"]))


if __name__ == "__main__":
    try:
        result = prepare(sys.argv[1], sys.argv[2], sys.argv[3] or None)
        Path(sys.argv[2], "manifest.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
