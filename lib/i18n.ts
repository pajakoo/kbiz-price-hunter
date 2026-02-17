export const locales = ["en", "bg"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

type Dictionary = {
  nav: {
    products: string;
    dashboard: string;
    access: string;
    logout: string;
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
    alertTitle: string;
    alertBody: string;
    alertEnable: string;
    alertDisable: string;
    alertLogin: string;
    alertEnabled: string;
    alertDisabled: string;
    alertError: string;
    noPrices: string;
    deleteProduct: string;
    deleteProductConfirm: string;
    deleteProductSuccess: string;
    deleteProductError: string;
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
    createProductPriceLabel: string;
    createProductStoreLabel: string;
    createProductCityLabel: string;
    createProductDateLabel: string;
    createProductSlugPlaceholder: string;
    createProductNamePlaceholder: string;
    createProductDescriptionPlaceholder: string;
    createProductPricePlaceholder: string;
    createProductStorePlaceholder: string;
    createProductCityPlaceholder: string;
    createProductSubmit: string;
    createProductSubmitting: string;
    createProductSuccess: string;
    createProductError: string;
    recentProductsTitle: string;
    recentProductsBody: string;
    recentProductsEmpty: string;
    importCsvTitle: string;
    importCsvBody: string;
    importCsvFileLabel: string;
    importCsvDateLabel: string;
    importCsvDateHelp: string;
    importCsvSubmit: string;
    importCsvSubmitting: string;
    importCsvSuccess: string;
    importCsvError: string;
    priceDropsTitle: string;
    priceDropsBody: string;
    priceDropsEmpty: string;
    priceAlertsTitle: string;
    priceAlertsBody: string;
    priceAlertsProductLabel: string;
    priceAlertsSubmit: string;
    priceAlertsSubmitting: string;
    priceAlertsRemove: string;
    priceAlertsEmpty: string;
    priceAlertsStatusAdded: string;
    priceAlertsStatusError: string;
    priceAlertsNotificationsTitle: string;
    priceAlertsNotificationsEmpty: string;
  };
  chart: {
    product: string;
    store: string;
    city: string;
    allStores: string;
    allCities: string;
    empty: string;
    loading: string;
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
      logout: "Log out",
    },
    home: {
      pill: "Searchable pricing catalog",
      title: "Keep the idea. Cut the clutter.",
      intro:
        "Ловец на цени is a clean, crawlable pricing index for everyday groceries. Public product pages are optimized for search bots, while the private dashboard stays focused on your shopping workflows.",
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
      publicTag: "Public product",
      snapshot: "Price snapshot",
      track: "What to track",
      fallbackSummary: "Compare price ranges, stores, and weekly updates in one place.",
      fallbackPriceNote: "Avg range: 18 - 24 EUR",
      fallbackLastChecked: "Updated today",
      fallbackHighlights: [
        "Price history by store",
        "Category-based comparisons",
        "Alerts for price drops",
      ],
      alertTitle: "Price alerts",
      alertBody: "Get notified when the price drops below your threshold.",
      alertEnable: "Enable alert",
      alertDisable: "Disable alert",
      alertLogin: "Log in to enable alerts",
      alertEnabled: "Alert enabled.",
      alertDisabled: "Alert disabled.",
      alertError: "Unable to update alert.",
      noPrices: "No prices yet.",
      deleteProduct: "Remove product",
      deleteProductConfirm: "Are you sure you want to remove this product?",
      deleteProductSuccess: "Product removed.",
      deleteProductError: "Unable to remove product.",
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
      createProductPriceLabel: "Price (EUR)",
      createProductStoreLabel: "Store",
      createProductCityLabel: "City (optional)",
      createProductDateLabel: "Price date",
      createProductSlugPlaceholder: "test-product",
      createProductNamePlaceholder: "Test Product",
      createProductDescriptionPlaceholder: "Short description",
      createProductPricePlaceholder: "3.99",
      createProductStorePlaceholder: "Store name",
      createProductCityPlaceholder: "Sofia",
      createProductSubmit: "Create product",
      createProductSubmitting: "Creating...",
      createProductSuccess: "Created {name}.",
      createProductError: "Unable to create product.",
      recentProductsTitle: "Recently added products",
      recentProductsBody: "Newest entries created via the dashboard form.",
      recentProductsEmpty: "No products added yet.",
      importCsvTitle: "Import supplier CSV",
      importCsvBody: "Upload the Zlatna Ribka CSV to import products and prices.",
      importCsvFileLabel: "CSV file",
      importCsvDateLabel: "Price date",
      importCsvDateHelp: "All imported prices will use this date.",
      importCsvSubmit: "Import CSV",
      importCsvSubmitting: "Importing...",
      importCsvSuccess: "Imported data for {name}.",
      importCsvError: "Unable to import CSV.",
      priceDropsTitle: "Price drops",
      priceDropsBody: "Largest recent price reductions by store and product.",
      priceDropsEmpty: "No price drops recorded yet.",
      priceAlertsTitle: "Price alerts",
      priceAlertsBody: "Get notified when your favorite products drop in price.",
      priceAlertsProductLabel: "Favorite product",
      priceAlertsSubmit: "Enable alert",
      priceAlertsSubmitting: "Enabling...",
      priceAlertsRemove: "Remove",
      priceAlertsEmpty: "No favorite products yet.",
      priceAlertsStatusAdded: "Alert updated.",
      priceAlertsStatusError: "Unable to update alert.",
      priceAlertsNotificationsTitle: "Recent alerts",
      priceAlertsNotificationsEmpty: "No alerts yet.",
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
      city: "City",
      allStores: "All stores",
      allCities: "All cities",
      empty: "No price history yet.",
      loading: "Loading price history...",
    },
  },
  bg: {
    nav: {
      products: "Продукти",
      dashboard: "Табло",
      access: "Достъп",
      logout: "Изход",
    },
    home: {
      pill: "Каталог с реални цени",
      title: "Следи цените. Спестявай умно.",
      intro:
        "Ловец на цени събира цени на продукти от различни магазини в един публичен каталог. Сравняваш бързо, виждаш история на цените и получаваш известия при спад.",
      browse: "Виж продуктите",
      magic: "Вземи магически линк",
      cards: [
        {
          title: "Ясни продуктови страници",
          body: "Всяка стока има собствена страница с цена, диапазон и последна актуализация.",
        },
        {
          title: "Сравнение между магазини",
          body: "Провери къде е най-добрата цена и как се променя във времето.",
        },
        {
          title: "Известия за намаления",
          body: "Активирай алерт и получавай сигнал при спад на цена.",
        },
      ],
      howTitle: "Как помага",
      how: [
        {
          title: "Публичен каталог",
          body: "Всички продукти са с чисти URL адреси и готови за индексиране.",
        },
        {
          title: "Персонални аларми",
          body: "Запази любими продукти и настрой известия при намаление.",
        },
        {
          title: "История на цените",
          body: "Виж как се движат цените по магазини и във времето.",
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
      publicTag: "Публичен продукт",
      snapshot: "Снимка на цените",
      track: "Какво да следим",
      fallbackSummary: "Сравнявай диапазони, магазини и седмични актуализации на едно място.",
      fallbackPriceNote: "Среден диапазон: 18 - 24 EUR",
      fallbackLastChecked: "Обновено днес",
      fallbackHighlights: [
        "История на цените по магазини",
        "Сравнения по категории",
        "Известия за спад",
      ],
      alertTitle: "Известия за цена",
      alertBody: "Получавай известие, когато цената падне под избран праг.",
      alertEnable: "Активирай известие",
      alertDisable: "Спри известие",
      alertLogin: "Влез, за да активираш известия",
      alertEnabled: "Известието е активно.",
      alertDisabled: "Известието е спряно.",
      alertError: "Грешка при обновяване на известието.",
      noPrices: "Все още няма цени.",
      deleteProduct: "Премахни продукт",
      deleteProductConfirm: "Сигурни ли сте, че искате да премахнете продукта?",
      deleteProductSuccess: "Продуктът е премахнат.",
      deleteProductError: "Неуспешно премахване на продукта.",
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
      createProductPriceLabel: "Цена (EUR)",
      createProductStoreLabel: "Магазин",
      createProductCityLabel: "Град (по избор)",
      createProductDateLabel: "Дата на цената",
      createProductSlugPlaceholder: "test-product",
      createProductNamePlaceholder: "Тестов продукт",
      createProductDescriptionPlaceholder: "Кратко описание",
      createProductPricePlaceholder: "3.99",
      createProductStorePlaceholder: "Име на магазин",
      createProductCityPlaceholder: "София",
      createProductSubmit: "Създай продукт",
      createProductSubmitting: "Създаване...",
      createProductSuccess: "Създаден е {name}.",
      createProductError: "Продуктът не може да бъде създаден.",
      recentProductsTitle: "Последно добавени продукти",
      recentProductsBody: "Най-новите записи, създадени през таблото.",
      recentProductsEmpty: "Все още няма добавени продукти.",
      importCsvTitle: "Импорт на CSV",
      importCsvBody: "Качи CSV файла от Златна Рибка, за да внесеш продукти и цени.",
      importCsvFileLabel: "CSV файл",
      importCsvDateLabel: "Дата на цената",
      importCsvDateHelp: "Всички цени ще се запишат с тази дата.",
      importCsvSubmit: "Импортирай CSV",
      importCsvSubmitting: "Импортиране...",
      importCsvSuccess: "Импортирани данни за {name}.",
      importCsvError: "CSV файлът не можа да се импортира.",
      priceDropsTitle: "Намаления на цени",
      priceDropsBody: "Най-големите намаления по магазин и продукт.",
      priceDropsEmpty: "Все още няма регистрирани намаления.",
      priceAlertsTitle: "Известия за цена",
      priceAlertsBody: "Известяваме те, когато любим продукт поевтинее.",
      priceAlertsProductLabel: "Любим продукт",
      priceAlertsSubmit: "Включи известие",
      priceAlertsSubmitting: "Записване...",
      priceAlertsRemove: "Премахни",
      priceAlertsEmpty: "Все още няма любими продукти.",
      priceAlertsStatusAdded: "Известието е обновено.",
      priceAlertsStatusError: "Неуспешно обновяване на известие.",
      priceAlertsNotificationsTitle: "Последни известия",
      priceAlertsNotificationsEmpty: "Все още няма известия.",
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
      city: "Град",
      allStores: "Всички магазини",
      allCities: "Всички градове",
      empty: "Все още няма история на цените.",
      loading: "Зареждане на история на цените...",
    },
  },
};

export function getDictionary(locale: string): Dictionary {
  if (locale === "bg") {
    return dictionary.bg;
  }
  return dictionary.en;
}
