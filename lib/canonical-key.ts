import { slugify } from "./slugify";

type ParsedAttributes = {
  baseName: string;
  size?: string;
  fatPercent?: string;
  form?: string;
};

const FORM_PATTERNS: { key: string; match: RegExp }[] = [
  { key: "tablets", match: /(табл|таблет|tablets?)/i },
  { key: "capsules", match: /(капсул|capsules?)/i },
  { key: "sachets", match: /(саше|sachets?)/i },
  { key: "powder", match: /(прах|powder)/i },
  { key: "cream", match: /(крем|cream)/i },
  { key: "syrup", match: /(сироп|syrup)/i },
  { key: "ointment", match: /(маз|ointment)/i },
  { key: "yogurt", match: /(кисело мляко|йогурт|yogurt)/i },
  { key: "milk", match: /(прясно мляко|milk)/i },
  { key: "cheese", match: /(сирене|cheese)/i },
  { key: "butter", match: /(масло|butter)/i },
];

function normalizeNumber(value: number) {
  const rounded = Math.round(value * 100) / 100;
  const text = rounded.toString();
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}

function extractPercent(name: string) {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) {
    return undefined;
  }

  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (Number.isNaN(amount)) {
    return undefined;
  }

  return normalizeNumber(amount);
}

function extractSize(name: string) {
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|кг|g|гр|ml|мл|l|л)\b/i);
  if (!match) {
    return undefined;
  }

  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (Number.isNaN(amount)) {
    return undefined;
  }

  const unit = match[2].toLowerCase();
  if (unit === "kg" || unit === "кг") {
    return `${normalizeNumber(amount * 1000)}g`;
  }

  if (unit === "l" || unit === "л") {
    return `${normalizeNumber(amount * 1000)}ml`;
  }

  if (unit === "ml" || unit === "мл") {
    return `${normalizeNumber(amount)}ml`;
  }

  return `${normalizeNumber(amount)}g`;
}

function extractForm(name: string) {
  const entry = FORM_PATTERNS.find((pattern) => pattern.match.test(name));
  return entry?.key;
}

function normalizeBaseName(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[\[\]\(\)\.,]/g, " ")
    .replace(/[\-_/]/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(kg|кг|g|гр|ml|мл|l|л|%|бр)\b/gi, " ")
    .replace(/\b\d+(?:[.,]\d+)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return slugify(cleaned);
}

export function parseCanonicalAttributes(name: string): ParsedAttributes {
  const baseName = normalizeBaseName(name);
  return {
    baseName,
    size: extractSize(name),
    fatPercent: extractPercent(name),
    form: extractForm(name),
  };
}

export function buildCanonicalKey(name: string) {
  const { baseName, size, fatPercent, form } = parseCanonicalAttributes(name);

  if (!baseName) {
    return null;
  }

  const parts = [baseName, form, fatPercent, size].filter(Boolean);
  return parts.join("|");
}
