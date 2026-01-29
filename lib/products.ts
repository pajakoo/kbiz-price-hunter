type LocalizedText = {
  en: string;
  bg: string;
};

type LocalizedList = {
  en: string[];
  bg: string[];
};

export type Product = {
  slug: string;
  name: LocalizedText;
  summary: LocalizedText;
  priceNote: LocalizedText;
  lastChecked: LocalizedText;
  highlights: LocalizedList;
};

export const products: Product[] = [
  {
    slug: "olive-oil",
    name: {
      en: "Extra Virgin Olive Oil",
      bg: "Екстра върджин зехтин",
    },
    summary: {
      en: "Track local store pricing for 1L bottles and bulk tins.",
      bg: "Следи цените за 1L бутилки и по-големи разфасовки.",
    },
    priceNote: {
      en: "Avg range: 18 - 24 EUR",
      bg: "Среден диапазон: 18 - 24 EUR",
    },
    lastChecked: {
      en: "Updated today",
      bg: "Обновено днес",
    },
    highlights: {
      en: [
        "Compare size-per-price",
        "Track regional store changes",
        "Watch for promo dips",
      ],
      bg: [
        "Сравнявай цена спрямо разфасовка",
        "Следи промени по региони",
        "Хващай промо спадове",
      ],
    },
  },
  {
    slug: "coffee-beans",
    name: {
      en: "Coffee Beans",
      bg: "Кафе на зърна",
    },
    summary: {
      en: "Single-origin and blends with roast-level filtering.",
      bg: "Филтрирай по произход и степен на изпичане.",
    },
    priceNote: {
      en: "Avg range: 12 - 22 EUR",
      bg: "Среден диапазон: 12 - 22 EUR",
    },
    lastChecked: {
      en: "Updated yesterday",
      bg: "Обновено вчера",
    },
    highlights: {
      en: [
        "Highlight roast + origin",
        "Flag subscription deals",
        "Track 250g vs 1kg",
      ],
      bg: [
        "Отбелязвай изпичане и произход",
        "Следи абонаментни оферти",
        "Сравнявай 250г срещу 1кг",
      ],
    },
  },
  {
    slug: "detergent",
    name: {
      en: "Laundry Detergent",
      bg: "Перилен препарат",
    },
    summary: {
      en: "See bulk pack value per wash across retailers.",
      bg: "Сравнявай цена на пране за големи опаковки.",
    },
    priceNote: {
      en: "Avg range: 9 - 18 EUR",
      bg: "Среден диапазон: 9 - 18 EUR",
    },
    lastChecked: {
      en: "Updated 2 days ago",
      bg: "Обновено преди 2 дни",
    },
    highlights: {
      en: [
        "Price per wash",
        "Compare concentrated formulas",
        "Spot seasonal bundles",
      ],
      bg: [
        "Цена на пране",
        "Сравнявай концентрати",
        "Лови сезонни пакети",
      ],
    },
  },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug) ?? null;
}

export function getLocalizedProduct(product: Product, locale: "en" | "bg") {
  return {
    slug: product.slug,
    name: product.name[locale],
    summary: product.summary[locale],
    priceNote: product.priceNote[locale],
    lastChecked: product.lastChecked[locale],
    highlights: product.highlights[locale],
  };
}
