import importlib.util
import tempfile
import unittest
from pathlib import Path
import zipfile

spec = importlib.util.spec_from_file_location("selected", Path(__file__).with_name("prepare-selected-daily.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

HEAD = ",".join(module.parser.HEADERS.values()) + "\n"


def line(city="София", store="Магазин 1", name="Захар Захира Кристал 1кг", code="123", price="2.50", promo=""):
    return f"{city},{store},{name},{code},{price},{promo}\n"


class SelectedTests(unittest.TestCase):
    def test_published_links_only(self):
        html = '<a href="/opendata_files/2026-11-04.zip">old</a><a href="https://kolkostruva.bg/opendata_files/2026-11-05.zip">new</a><a href="https://other.example/opendata_files/2026-11-09.zip">bad</a>'
        self.assertEqual(module.latest_published(html), "https://kolkostruva.bg/opendata_files/2026-11-05.zip")
        with self.assertRaises(ValueError):
            module.latest_published('<a href="/opendata_files/2026-02-30.zip">invalid</a>')

    def test_selected_only_and_missing_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp, "2026-11-05.zip")
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("supplier.csv", HEAD + line() + line(name="Ябълки 1кг", code="456") +
                           line(name="Захар Захира Фин кристал 1кг", code="789"))
            result = module.prepare(archive, {"byala-zahar-zahira-1kg", "kiselo-mlyako-bozhentsi-2-2-400g"})
            self.assertEqual(len(result["records"]), 1)
            self.assertEqual(result["records"][0]["amount"], "2.50")
            self.assertEqual(result["records"][0]["source"], "2026-11-05.zip/supplier.csv")
            self.assertEqual(result["missing"], ["kiselo-mlyako-bozhentsi-2-2-400g"])

    def test_conflict_blocks_export(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp, "2026-11-05.zip")
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("supplier.csv", HEAD + line() + line(code="456", price="3.00"))
            with self.assertRaisesRegex(ValueError, "selected-row conflicts"):
                module.prepare(archive, {"byala-zahar-zahira-1kg"})

    def test_invalid_selected_price_and_zip_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp, "2026-11-05.zip")
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("supplier.csv", HEAD + line(price="0"))
            with self.assertRaisesRegex(ValueError, "selected-row conflicts"):
                module.prepare(archive, {"byala-zahar-zahira-1kg"})
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("../supplier.csv", HEAD + line())
            with self.assertRaisesRegex(ValueError, "Unsafe ZIP entry"):
                module.prepare(archive, {"byala-zahar-zahira-1kg"})

    def test_promo_and_identical_rerun(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp, "2026-11-05.zip")
            with zipfile.ZipFile(archive, "w") as z:
                z.writestr("supplier.csv", HEAD + line(price="2.50", promo="1.95") + line(price="2.50", promo="1.95"))
            one = module.prepare(archive, {"byala-zahar-zahira-1kg"})
            two = module.prepare(archive, {"byala-zahar-zahira-1kg"})
            self.assertEqual(one, two)
            self.assertEqual(len(one["records"]), 1)
            self.assertEqual(one["records"][0]["amount"], "1.95")
            self.assertTrue(one["records"][0]["isPromo"])


if __name__ == "__main__":
    unittest.main()
