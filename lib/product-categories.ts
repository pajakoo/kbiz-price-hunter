export type CategoryOption = {
  slug: string;
  label: string;
  keywords: string[];
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    slug: "lekarstva",
    label: "Лекарства",
    keywords: ["спрей", "таблетки", "капсули", "гел", "крем", "сироп", "унгв"],
  },
  {
    slug: "hrani",
    label: "Храни",
    keywords: ["сирене", "мляко", "месо", "хляб", "масло"],
  },
  {
    slug: "napitki",
    label: "Напитки",
    keywords: ["чай", "кафе", "сок", "вода"],
  },
  {
    slug: "kozmetika",
    label: "Козметика",
    keywords: ["шампоан", "лосион", "крем", "балсам"],
  },
  {
    slug: "domakinstvo",
    label: "Домакинство",
    keywords: ["препарат", "почист", "прах"],
  },
];

export const UNASSIGNED_CATEGORY = {
  slug: "neopredeleni",
  label: "Неопределени",
};

export function getCategoryOptions() {
  return [...CATEGORY_OPTIONS.map(({ slug, label }) => ({ slug, label })), UNASSIGNED_CATEGORY];
}

export function getProductCategories(name: string, description?: string | null) {
  const normalized = `${name} ${description ?? ""}`.toLowerCase();
  const matches = CATEGORY_OPTIONS.filter((category) =>
    category.keywords.some((keyword) => normalized.includes(keyword))
  ).map((category) => category.slug);

  return matches.length ? matches : [UNASSIGNED_CATEGORY.slug];
}
