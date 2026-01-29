export const locales = ["en", "bg"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

type Dictionary = {
  nav: {
    products: string;
    dashboard: string;
    access: string;
  };
  home: {
    pill: string;
    title: string;
    intro: string;
    browse: string;
    magic: string;
    cards: { title: string; body: string }[];
    howTitle: string;
    how: { title: string; body: string }[];
  };
  products: {
    title: string;
    subtitle: string;
    public: string;
    fallbackSummary: string;
    fallbackPriceNote: string;
    fallbackLastChecked: string;
  };
  product: {
    publicTag: string;
    snapshot: string;
    track: string;
    fallbackSummary: string;
    fallbackPriceNote: string;
    fallbackLastChecked: string;
    fallbackHighlights: string[];
  };
  login: {
    title: string;
    intro: string;
    email: string;
    placeholder: string;
    send: string;
    sending: string;
    devLink: string;
  };
  dashboard: {
    title: string;
    welcomeLine: string;
    lists: string;
    listsBody: string;
    stores: string;
    storesBody: string;
    alerts: string;
    alertsBody: string;
    browse: string;
    logout: string;
    createProductTitle: string;
    createProductBody: string;
    createProductSlugLabel: string;
    createProductNameLabel: string;
    createProductDescriptionLabel: string;
    createProductSlugPlaceholder: string;
    createProductNamePlaceholder: string;
    createProductDescriptionPlaceholder: string;
    createProductSubmit: string;
    createProductSubmitting: string;
    createProductSuccess: string;
    createProductError: string;
    recentProductsTitle: string;
    recentProductsBody: string;
    recentProductsEmpty: string;
  };
  chart: {
    product: string;
    store: string;
    allStores: string;
    empty: string;
  };
  footer: {
    title: string;
    body: string;
    browse: string;
    magic: string;
  };
};

const dictionary: Record<Locale, Dictionary> = {
  en: {
    nav: {
      products: "Products",
      dashboard: "Dashboard",
      access: "Get Access",
    },
    home: {
      pill: "Searchable pricing catalog",
      title: "Keep the idea. Cut the clutter.",
      intro:
        "Kbiz Price Hunter is a clean, crawlable pricing index for everyday groceries. Public product pages are optimized for search bots, while the private dashboard stays focused on your shopping workflows.",
      browse: "Browse products",
      magic: "Request a magic link",
      cards: [
        {
          title: "Indexable by default",
          body: "Product pages are server-rendered with sitemap + robots metadata so search bots actually see them.",
        },
        {
          title: "Fewer moving parts",
          body: "One Next.js app, Prisma, and Postgres. No duplicate servers or shadow APIs.",
        },
        {
          title: "Ready for alerts",
          body: "Add price-drop alerts or watchlists later without fighting a loose schema.",
        },
      ],
      howTitle: "How it works",
      how: [
        {
          title: "Public catalog",
          body: "Each product gets a clean URL and metadata. This is what search engines index.",
        },
        {
          title: "Private dashboard",
          body: "Signed-in users manage lists, compare stores, and track price history.",
        },
        {
          title: "Structured data",
          body: "Postgres keeps relationships clear: products, stores, prices, and lists stay consistent.",
        },
      ],
    },
    products: {
      title: "Product index",
      subtitle: "Public, crawlable pages for search bots and customers.",
      public: "Public product page",
      fallbackSummary: "Newly added product.",
      fallbackPriceNote: "Avg range: 8 - 24 EUR",
      fallbackLastChecked: "Updated just now",
    },
    product: {
      publicTag: "Public product page",
      snapshot: "Pricing snapshot",
      track: "What we track",
      fallbackSummary: "Newly added product.",
      fallbackPriceNote: "Avg range: 8 - 24 EUR",
      fallbackLastChecked: "Updated just now",
      fallbackHighlights: ["Track price changes", "Compare stores", "Watch for promos"],
    },
    login: {
      title: "Request a magic link",
      intro:
        "The private dashboard is invite-only. Enter your email to receive a one-time login link.",
      email: "Email address",
      placeholder: "you@domain.com",
      send: "Send magic link",
      sending: "Sending...",
      devLink: "Dev-only link:",
    },
    dashboard: {
      title: "Dashboard",
      welcomeLine:
        "Welcome back, {email}. You can now build lists and track prices in private.",
      lists: "Shopping lists",
      listsBody: "Create and share lists once auth is connected.",
      stores: "Store comparisons",
      storesBody: "Track price shifts across your preferred stores.",
      alerts: "Alerts",
      alertsBody: "Schedule price-drop alerts by product or category.",
      browse: "Browse public products",
      logout: "Log out",
      createProductTitle: "Add test product",
      createProductBody: "Create a one-off product to validate the API.",
      createProductSlugLabel: "Slug",
      createProductNameLabel: "Name",
      createProductDescriptionLabel: "Description (optional)",
      createProductSlugPlaceholder: "test-product",
      createProductNamePlaceholder: "Test Product",
      createProductDescriptionPlaceholder: "Short description",
      createProductSubmit: "Create product",
      createProductSubmitting: "Creating...",
      createProductSuccess: "Created {name}.",
      createProductError: "Unable to create product.",
      recentProductsTitle: "Recently added products",
      recentProductsBody: "Newest entries created via the dashboard form.",
      recentProductsEmpty: "No products added yet.",
    },
    footer: {
      title: "Stay in control of prices.",
      body: "Built for quick comparisons, clean indexing, and future-ready alerts.",
      browse: "Browse products",
      magic: "Request a magic link",
    },
    chart: {
      product: "Product",
      store: "Store",
      allStores: "All stores",
      empty: "No price history yet.",
    },
  },
  bg: {
    nav: {
      products: "Продукти",
      dashboard: "Табло",
      access: "Достъп",
    },
    home: {
      pill: "Каталог с индексирани цени",
      title: "Запази идеята. Намали сложността.",
      intro:
        "Kbiz Price Hunter е чист, индексиран каталог за цени на хранителни продукти. Публичните страници се виждат от търсачките, а личното табло остава фокусирано върху списъците и сравненията.",
      browse: "Виж продуктите",
      magic: "Вземи магически линк",
      cards: [
        {
          title: "Индексиране по подразбиране",
          body: "Страниците са SSR с sitemap и robots, за да се виждат от търсачките.",
        },
        {
          title: "По-малко части",
          body: "Едно Next.js приложение, Prisma и Postgres. Без двойни сървъри.",
        },
        {
          title: "Готово за аларми",
          body: "Добавяй известия за спад на цените без хаос в схемата.",
        },
      ],
      howTitle: "Как работи",
      how: [
        {
          title: "Публичен каталог",
          body: "Всеки продукт има чист URL и метаданни. Това индексират търсачките.",
        },
        {
          title: "Лично табло",
          body: "Влезлите потребители управляват списъци, сравняват магазини и история на цените.",
        },
        {
          title: "Структурирани данни",
          body: "Postgres пази връзките ясни между продукти, магазини и цени.",
        },
      ],
    },
    products: {
      title: "Каталог продукти",
      subtitle: "Публични, индексирани страници за търсачки и клиенти.",
      public: "Публична продуктова страница",
      fallbackSummary: "Току-що добавен продукт.",
      fallbackPriceNote: "Среден диапазон: 8 - 24 EUR",
      fallbackLastChecked: "Обновено току-що",
    },
    product: {
      publicTag: "Публична продуктова страница",
      snapshot: "Снимка на цените",
      track: "Какво следим",
      fallbackSummary: "Току-що добавен продукт.",
      fallbackPriceNote: "Среден диапазон: 8 - 24 EUR",
      fallbackLastChecked: "Обновено току-що",
      fallbackHighlights: [
        "Следи промени на цени",
        "Сравнявай магазини",
        "Хващай промоции",
      ],
    },
    login: {
      title: "Вземи магически линк",
      intro:
        "Личното табло е само с покана. Въведи имейл за еднократен линк.",
      email: "Имейл адрес",
      placeholder: "you@domain.com",
      send: "Изпрати линк",
      sending: "Изпращане...",
      devLink: "Линк за разработка:",
    },
    dashboard: {
      title: "Табло",
      welcomeLine:
        "Добре дошъл, {email}. Вече можеш да създаваш списъци и да следиш цените насаме.",
      lists: "Списъци",
      listsBody: "Създавай и споделяй списъци след като включим auth.",
      stores: "Сравнение на магазини",
      storesBody: "Следи промени на цените между любимите магазини.",
      alerts: "Известия",
      alertsBody: "Настрой известия за спад на цените по продукт или категория.",
      browse: "Виж продуктите",
      logout: "Изход",
      createProductTitle: "Добави тестов продукт",
      createProductBody: "Създай еднократен продукт за проверка на API.",
      createProductSlugLabel: "Слъг",
      createProductNameLabel: "Име",
      createProductDescriptionLabel: "Описание (по избор)",
      createProductSlugPlaceholder: "test-product",
      createProductNamePlaceholder: "Тестов продукт",
      createProductDescriptionPlaceholder: "Кратко описание",
      createProductSubmit: "Създай продукт",
      createProductSubmitting: "Създаване...",
      createProductSuccess: "Създаден е {name}.",
      createProductError: "Продуктът не може да бъде създаден.",
      recentProductsTitle: "Последно добавени продукти",
      recentProductsBody: "Най-новите записи, създадени през таблото.",
      recentProductsEmpty: "Все още няма добавени продукти.",
    },
    footer: {
      title: "Дръж цените под контрол.",
      body: "Създадено за бързи сравнения, чисто индексиране и бъдещи известия.",
      browse: "Виж продуктите",
      magic: "Вземи магически линк",
    },
    chart: {
      product: "Продукт",
      store: "Магазин",
      allStores: "Всички магазини",
      empty: "Все още няма история на цените.",
    },
  },
};

export function getDictionary(locale: string): Dictionary {
  if (locale === "bg") {
    return dictionary.bg;
  }
  return dictionary.en;
}
