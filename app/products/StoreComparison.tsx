"use client";

import { useMemo, useSyncExternalStore } from "react";
import { MAX_COMPARISON_STORES, parseComparison, toggleComparison, type ComparisonStore } from "@/lib/store-comparison";

const eventName = "price-hunter-store-comparison";
const fallback = new Map<string, string>();
function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(eventName, callback); window.removeEventListener("storage", callback); };
}
const serverSnapshot = () => "[]";

export function useStoreComparison(slug: string) {
  const key = `price-hunter:compare:${slug}`;
  const read = () => {
    if (fallback.has(key)) return fallback.get(key)!;
    try { return sessionStorage.getItem(key) ?? "[]"; }
    catch { return fallback.get(key) ?? "[]"; }
  };
  const raw = useSyncExternalStore(subscribe, read, serverSnapshot);
  const stores = useMemo(() => parseComparison(raw), [raw]);
  const write = (value: ComparisonStore[]) => {
    const encoded = JSON.stringify(value);
    fallback.set(key, encoded);
    try { sessionStorage.setItem(key, encoded); } catch { /* Keep comparison usable when storage is unavailable. */ }
    window.dispatchEvent(new Event(eventName));
  };
  return { stores, toggle: (store: ComparisonStore) => write(toggleComparison(parseComparison(read()), store)),
    clear: () => write([]) };
}

export function CompareStoreButton({ slug, store, bg }: { slug: string; store: ComparisonStore; bg: boolean }) {
  const { stores, toggle } = useStoreComparison(slug);
  const selected = stores.some(item => item.id === store.id);
  return <button type="button" className={`compare-store-button${selected ? " is-selected" : ""}`}
    aria-pressed={selected} aria-label={`${bg ? "Сравни в графиката" : "Compare in chart"}: ${store.name}`}
    disabled={!selected && stores.length >= MAX_COMPARISON_STORES} onClick={() => toggle(store)}>
    {selected ? (bg ? "✓ Избран" : "✓ Selected") : (bg ? "+ Сравни" : "+ Compare")}
  </button>;
}

export function StoreComparisonBar({ slug, bg }: { slug: string; bg: boolean }) {
  const { stores, toggle, clear } = useStoreComparison(slug);
  return <div className="store-comparison-bar">
    <div className="store-comparison-bar-heading">
      <span role="status">{bg ? "Магазини за сравнение" : "Stores to compare"}: <strong>{stores.length}/{MAX_COMPARISON_STORES}</strong></span>
      {stores.length > 0 && <div className="table-actions">
        <button type="button" className="button ghost" onClick={clear}>{bg ? "Изчисти" : "Clear"}</button>
        <a className="button" href="#price-history">{bg ? "Виж сравнението ↑" : "View comparison ↑"}</a>
      </div>}
    </div>
    {stores.length ? <div className="price-chart-chips">{stores.map(store => <button key={store.id} type="button"
      title={store.name} aria-label={`${bg ? "Премахни" : "Remove"} ${store.name}`} onClick={() => toggle(store)}>
      <span aria-hidden="true">✓</span><span>{store.name}</span><span aria-hidden="true">×</span>
    </button>)}</div> : <small>{bg ? "Избери до 5 магазина от таблицата. Изборът се запазва между страниците в този раздел на браузъра." : "Choose up to 5 stores from the table. Your selection stays across pages in this browser tab."}</small>}
  </div>;
}
