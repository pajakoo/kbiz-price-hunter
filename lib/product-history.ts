export type PricePoint = {
  date: string;
  price: number;
};

export type StoreSeries = {
  store: string;
  points: PricePoint[];
};

const productHistory: Record<string, StoreSeries[]> = {
  "olive-oil": [
    {
      store: "Fresh Mart",
      points: [
        { date: "2024-10-01", price: 10.2 },
        { date: "2024-10-15", price: 9.7 },
        { date: "2024-11-01", price: 9.4 },
      ],
    },
    {
      store: "Market One",
      points: [
        { date: "2024-10-01", price: 10.8 },
        { date: "2024-10-20", price: 10.1 },
        { date: "2024-11-01", price: 9.9 },
      ],
    },
  ],
  "coffee-beans": [
    {
      store: "Fresh Mart",
      points: [
        { date: "2024-10-03", price: 18.6 },
        { date: "2024-10-21", price: 17.8 },
        { date: "2024-11-04", price: 17.2 },
      ],
    },
    {
      store: "Market One",
      points: [
        { date: "2024-10-03", price: 18.1 },
        { date: "2024-10-21", price: 17.4 },
        { date: "2024-11-04", price: 16.9 },
      ],
    },
  ],
  detergent: [
    {
      store: "Fresh Mart",
      points: [
        { date: "2024-10-05", price: 12.4 },
        { date: "2024-10-22", price: 11.2 },
        { date: "2024-11-05", price: 10.7 },
      ],
    },
    {
      store: "Market One",
      points: [
        { date: "2024-10-05", price: 12.9 },
        { date: "2024-10-22", price: 11.9 },
        { date: "2024-11-05", price: 11.3 },
      ],
    },
  ],
};

const fallbackSeries: StoreSeries[] = [
  {
    store: "Market One",
    points: [
      { date: "2024-10-01", price: 9.2 },
      { date: "2024-10-15", price: 8.9 },
      { date: "2024-11-01", price: 8.6 },
    ],
  },
];

export function getProductHistory(slug: string) {
  return productHistory[slug] ?? fallbackSeries;
}
