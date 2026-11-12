"""Read a published KZP daily archive and prepare only curated staple observations.

This tool does not write to a database or mutate the source archive.
"""
import argparse
import collections
from datetime import date
from decimal import InvalidOperation
from html.parser import HTMLParser
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import re
import ssl
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://kolkostruva.bg"
MAX_ZIP = 100_000_000
MAX_CSV = 200_000_000
spec = importlib.util.spec_from_file_location("extract_staples", Path(__file__).with_name("extract-staple-prices.py"))
staples = importlib.util.module_from_spec(spec)
spec.loader.exec_module(staples)
parser = staples.parser


class ArchiveLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href", "")
        url = urllib.parse.urljoin(BASE, href)
        if re.fullmatch(r"https://kolkostruva\.bg/opendata_files/\d{4}-\d{2}-\d{2}\.zip", url):
            day = url.rsplit("/", 1)[-1][:10]
            if date.fromisoformat(day).isoformat() == day:
                self.urls.add(url)


def latest_published(html):
    links = ArchiveLinks()
    links.feed(html)
    if not links.urls:
        raise ValueError("No published KZP daily ZIP links found")
    return max(links.urls)


def fetch_bounded(url, limit):
    try:
        import certifi
        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        context = ssl.create_default_context()
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, request, fp, code, msg, headers, newurl):
            raise ValueError("Unexpected redirect")

    request = urllib.request.Request(url, headers={"User-Agent": "PriceHunterResearch/0.1 (public KZP open data)"})
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=context), NoRedirect())
    with opener.open(request, timeout=30) as response:
        if int(response.headers.get("Content-Length", "0")) > limit:
            raise ValueError("Response exceeds size limit")
        payload = response.read(limit + 1)
        if len(payload) > limit:
            raise ValueError("Response exceeds size limit")
        return payload


def prepare(archive, allowed):
    archive = Path(archive)
    day = archive.stem
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day) or date.fromisoformat(day).isoformat() != day:
        raise ValueError("Archive filename must be YYYY-MM-DD.zip")
    if archive.stat().st_size > MAX_ZIP:
        raise ValueError("ZIP exceeds size limit")
    records = []
    rejected = []
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if len(entries) > 1000 or sum(e.file_size for e in entries) > 2_000_000_000:
            raise ValueError("ZIP entry limits exceeded")
        if len({e.filename for e in entries}) != len(entries):
            raise ValueError("Duplicate ZIP entry name")
        for entry in entries:
            path = PurePosixPath(entry.filename.replace("\\", "/"))
            if path.is_absolute() or ".." in path.parts or (entry.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Unsafe ZIP entry")
            if entry.is_dir() or entry.filename.startswith("__MACOSX/"):
                continue
            if path.suffix.lower() == ".zip":
                raise ValueError("Nested ZIP not supported")
            if path.suffix.lower() != ".csv":
                continue
            if entry.file_size > MAX_CSV:
                raise ValueError("CSV exceeds size limit")
            if re.search(r"\d{4}-\d{2}-\d{2}", entry.filename):
                parser.observation_date(entry.filename, day)
            with source.open(entry) as stream:
                raw = stream.read(MAX_CSV + 1)
            if len(raw) > MAX_CSV:
                raise ValueError("CSV exceeds size limit")
            reader, _ = parser.source_reader(raw.decode("utf-8-sig"))
            groups = {}
            blocked = set()
            for row in reader:
                name = row.get(parser.HEADERS["productName"]) or ""
                slug = staples.match_product(name)
                if slug not in allowed:
                    continue
                try:
                    if None in row or any(row.get(h) is None for h in parser.HEADERS.values()):
                        raise ValueError("Incomplete row")
                    fields = {key: row[h].strip() for key, h in parser.HEADERS.items()}
                    if not all(fields[k] for k in ("city", "store", "productCode")):
                        raise ValueError("Missing store, city or product code")
                    promo = parser.price(fields["promoPrice"])
                    amount = promo if promo is not None and promo > 0 else parser.price(fields["retailPrice"])
                    if amount is None or amount <= 0:
                        raise ValueError("No positive price")
                    identity = (slug, fields["city"], fields["store"])
                    record = {"slug": slug, "supplier": entry.filename, "code": fields["productCode"],
                              "name": name, "cityCode": fields["city"], "store": fields["store"],
                              "date": day, "amount": str(amount), "isPromo": bool(promo and promo > 0),
                              "source": f"{archive.name}/{entry.filename}"}
                    if identity in groups and (groups[identity]["amount"], groups[identity]["isPromo"]) != (record["amount"], record["isPromo"]):
                        blocked.add(identity)
                        raise ValueError("Conflicting selected product/store observations")
                    groups[identity] = record
                except (ValueError, InvalidOperation) as error:
                    rejected.append({"entry": entry.filename, "line": reader.line_num, "name": name, "reason": str(error)})
            records.extend(record for identity, record in groups.items() if identity not in blocked)
    if rejected:
        raise ValueError(f"{len(rejected)} selected-row conflicts/errors; first: {rejected[0]}")
    return {"date": day, "currency": "EUR", "archiveSha256": hashlib.sha256(archive.read_bytes()).hexdigest(), "records": records,
            "counts": dict(collections.Counter(r["slug"] for r in records)),
            "missing": sorted(allowed - {r["slug"] for r in records})}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    group = cli.add_mutually_exclusive_group(required=True)
    group.add_argument("--archive", type=Path, help="Existing local dated ZIP")
    group.add_argument("--download-latest", action="store_true", help="Fetch latest ZIP linked on KZP /opendata")
    cli.add_argument("--output", type=Path, help="Write prepared JSON (otherwise print summary only)")
    args = cli.parse_args()
    if args.download_latest:
        url = latest_published(fetch_bounded(f"{BASE}/opendata", 2_000_000).decode("utf-8"))
        archive = Path(__import__("tempfile").mkdtemp(prefix="price-hunter-daily-")) / url.rsplit("/", 1)[-1]
        try:
            archive.write_bytes(fetch_bounded(url, MAX_ZIP))
            result = prepare(archive, {p["slug"] for p in json.loads((ROOT / "lib/staple-products.json").read_text())})
            result["archiveUrl"] = url
        finally:
            archive.unlink(missing_ok=True)
            archive.parent.rmdir()
    else:
        result = prepare(args.archive, {p["slug"] for p in json.loads((ROOT / "lib/staple-products.json").read_text())})
    if args.output:
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "records"} | {"total": len(result["records"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
