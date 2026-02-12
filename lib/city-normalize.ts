const CITY_PATTERN = /гр\.?\s*([A-Za-zА-Яа-я-]+(?:\s+[A-Za-zА-Яа-я-]+)*)/i;

function cleanCity(value: string) {
  return value.split(/[,/]/)[0]?.trim() ?? "";
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
  if (!trimmedCity || numericCity) {
    return extractCityFromStoreName(storeName);
  }

  return cleanCity(trimmedCity) || null;
}
