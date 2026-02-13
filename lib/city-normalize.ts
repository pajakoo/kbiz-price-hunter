import fs from "node:fs";
import path from "node:path";

const CITY_PATTERN = /гр\.?\s*([A-Za-zА-Яа-я-]+(?:\s+[A-Za-zА-Яа-я-]+)*)/i;
const EKATTE_PATH = path.join(process.cwd(), "lib", "ekatte_regions.csv");

let cachedCityMap: Map<string, string> | null = null;

function cleanCity(value: string) {
  return value.split(/[,/]/)[0]?.trim() ?? "";
}

function loadCityMap() {
  if (cachedCityMap) {
    return cachedCityMap;
  }

  const map = new Map<string, string>();
  try {
    const content = fs.readFileSync(EKATTE_PATH, "utf-8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    lines.slice(1).forEach((line) => {
      const parts = line.split(",");
      const code = parts[0]?.trim();
      const name = parts[1]?.trim();
      if (code && name) {
        map.set(code, name);
      }
    });
  } catch {
    // ignore missing map
  }

  cachedCityMap = map;
  return map;
}

function lookupCityByCode(code: string) {
  const map = loadCityMap();
  return map.get(code) ?? null;
}

function extractCityFromStoreName(storeName: string) {
  const match = storeName.match(CITY_PATTERN);
  if (!match?.[1]) {
    return null;
  }
  const cleaned = cleanCity(match[1]);
  return cleaned || null;
}

export function normalizeCity(rawCity: string | null | undefined, storeName: string) {
  const trimmedCity = rawCity?.trim() ?? "";
  if (trimmedCity && /[A-Za-zА-Яа-я]/.test(trimmedCity)) {
    return cleanCity(trimmedCity) || null;
  }

  const numericCity = trimmedCity && /^[0-9]+$/.test(trimmedCity);
  if (numericCity) {
    const mapped = lookupCityByCode(trimmedCity);
    if (mapped) {
      return mapped;
    }
  }

  if (!trimmedCity || numericCity) {
    return extractCityFromStoreName(storeName);
  }

  return cleanCity(trimmedCity) || null;
}
