import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("prepare", Path(__file__).with_name("prepare-price-input.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
HEADER = ','.join('"' + h + '"' for h in module.HEADERS.values()) + '\n'
ROW = '"10135","Store","Milk","123","2.50","0"\n'


class InputTests(unittest.TestCase):
    def test_delimiters_and_equivalent_prices(self):
        for delimiter in (',', ';', '\t'):
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); f = root / '2026-01-16.csv'
                f.write_text((HEADER + ROW + ROW.replace('2.50', '2.500')).replace(',', delimiter))
                batch = module.prepare(f, root)[0]
                self.assertEqual(batch['rejected'], [])
                self.assertEqual(batch['files'][0]['rows'], 1)

    def test_decimal_notation(self):
        for value in ('3.', '3,', '3.00'):
            self.assertEqual(module.price(value), 3)
        for value in ('3..', '3EUR', '-3', 'NaN'):
            with self.assertRaises(ValueError): module.price(value)

    def test_malformed_entry_reports_actual_line(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); f = root / '2026-01-16.zip'
            with zipfile.ZipFile(f, 'w') as z:
                z.writestr('good.csv', HEADER + ROW)
                z.writestr('bad.csv', HEADER + ROW + ROW.replace('Milk', 'Milk ","brand"'))
            batch = module.prepare(f, root)[0]
            self.assertEqual(batch['rejected'][0]['line'], 3)
            self.assertEqual([f['source'] for f in batch['files']], ['good.csv'])

    def test_exporter_quotes_and_header_spaces(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); f = root / '2026-01-16.csv'
            f.write_text(HEADER.replace(',', ', ') + ROW.replace('Milk', 'Milk "brand"'))
            batch = module.prepare(f, root)[0]
            self.assertEqual(batch['rejected'], [])
            self.assertEqual(batch['files'][0]['repairedQuoteRows'], 1)
            row = json.loads(Path(batch['files'][0]['filePath']).read_text())
            self.assertEqual(row['productName'], 'Milk "brand"')
            self.assertEqual(row['amount'], '2.50')

    def test_archive_dates_and_multiline(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source, out = root / "in", root / "out"
            source.mkdir(); out.mkdir()
            for day in ["2026-01-16", "2026-10-14"]:
                with zipfile.ZipFile(source / f'{day}.zip', 'w') as z:
                    z.writestr('supplier.csv', HEADER + ROW.replace('"Milk"', '"Milk\n400g"'))
            batches = module.prepare(source, out)
            self.assertEqual([b['date'] for b in batches], ['2026-01-16', '2026-10-14'])
            row = json.loads(Path(batches[0]['files'][0]['filePath']).read_text())
            self.assertEqual(row['amount'], '2.50')
            self.assertFalse(row['isPromo'])
            self.assertEqual(row['productName'], 'Milk\n400g')

    def test_rejected_price_and_duplicate_row(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); f = root / '2026-01-16.csv'
            f.write_text(HEADER + ROW + ROW + ROW.replace('2.50', '2.50oops').replace('123', '456'))
            b = module.prepare(f, root)[0]
            self.assertEqual(b['files'][0]['rows'], 1)
            self.assertEqual(len(b['rejected']), 1)

    def test_quarantine_removes_first_conflicting_value_too(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); f = root / '2026-01-16.csv'
            f.write_text(HEADER + ROW + ROW.replace('2.50', '9.00') + ROW.replace('123', '456'))
            batch = module.prepare(f, root)[0]
            rows = [json.loads(line) for line in Path(batch['files'][0]['filePath']).read_text().splitlines()]
            self.assertEqual([row['productCode'] for row in rows], ['456'])
            self.assertEqual(len(batch['rejected']), 2)

    def test_invalid_date_and_conflict(self):
        for name, fallback in [('2026-02-30.zip', None), ('2026-01-16.zip', '2026-01-17')]:
            with self.assertRaises(ValueError): module.observation_date(name, fallback)

    def test_unsafe_and_nested_archive(self):
        for entry in ['../escape.csv', '/escape.csv', 'nested.zip']:
            with tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp); f = root / '2026-01-16.zip'
                with zipfile.ZipFile(f, 'w') as z: z.writestr(entry, HEADER + ROW)
                with self.assertRaises(ValueError): module.prepare(f, root)

    def test_renamed_zip_same_digest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); f = root / '2026-01-16.zip'
            with zipfile.ZipFile(f, 'w') as z: z.writestr('supplier.csv', HEADER + ROW)
            before = module.prepare(f, root)[0]
            renamed = root / 'prices_2026-01-16_copy.zip'; f.rename(renamed)
            after = module.prepare(renamed, root)[0]
            self.assertEqual(before['digest'], after['digest'])
            self.assertEqual(before['logicalKey'], after['logicalKey'])


if __name__ == '__main__': unittest.main()
