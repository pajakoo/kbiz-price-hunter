import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('staples', Path(__file__).with_name('extract-staple-prices.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MatchingTests(unittest.TestCase):
    def test_equivalent_pack_and_decimal_notation(self):
        for name in ['Минерална вода Велинград 1,5 л', 'Минерална Вода Велинград 1. 5 Л.', 'Минерална вода Велинград 1500мл']:
            self.assertEqual(module.match_product(name), 'mineralna-voda-velingrad-1-5l')
        self.assertEqual(module.match_product('Кисело мляко Боженци 2,2% 400г'), 'kiselo-mlyako-bozhentsi-2-2-400g')

    def test_different_variants_do_not_merge(self):
        for name in ['Прясно мляко Верея 3% 2л', 'Прясно мляко Верея 1.5% 1л',
                     'Кисело мляко Верея 2% БДС 400г', 'Кисело мляко Верея Чудно 2% 400г',
                     'Минерална вода Велинград газирана 1.5л', 'Лютеница Хорцето 560г',
                     'Лютеница Хорцето домашна 560г', 'Захар Захира фин кристал 1кг',
                     'Захар Захира/Джъст 1кг', 'Захар Сладея кафява 1кг']:
            self.assertIsNone(module.match_product(name), name)

    def test_case_sizes_are_excluded(self):
        for name in ['Захар Сладея 1кг*10', 'Захар Сладея 1кг/10',
                     'Минерална вода Велинград 1.5л - 6 бр.', 'Прясно мляко Верея 3% 12x1л',
                     'Прясно мляко Верея 3% 1л <12,>']:
            self.assertIsNone(module.match_product(name), name)

    def test_explicit_horceto_recipe(self):
        self.assertEqual(module.match_product('ЛЮТЕНИЦА ХОРЦЕТО ЕДРОСМЛЯНА ЗАКУСКА 560ГР'),
                         'lyutenitsa-hortseto-zakuska-560g')


if __name__ == '__main__':
    unittest.main()
