export function paginate<T>(items: T[], requestedPage: string | undefined, pageSize = 50) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const parsed = Number(requestedPage);
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, pageCount) : 1;
  const start = (page - 1) * pageSize;
  return { page, pageCount, start, items: items.slice(start, start + pageSize) };
}
