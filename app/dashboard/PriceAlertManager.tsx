"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Subscription = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
};

type Notification = {
  id: string;
  productName: string;
  productSlug: string;
  storeName: string;
  fromAmount: number;
  toAmount: number;
  currency: string;
  recordedAt: string;
};

type ProductOption = {
  id: string;
  name: string;
  slug: string;
};

type Status = {
  type: "success" | "error";
  message: string;
};

type Props = {
  title: string;
  body: string;
  productLabel: string;
  submitLabel: string;
  submittingLabel: string;
  removeLabel: string;
  emptyLabel: string;
  statusAdded: string;
  statusError: string;
  notificationsTitle: string;
  notificationsEmpty: string;
  basePath: string;
  locale: string;
  currencyLabel: string;
  products: ProductOption[];
  subscriptions: Subscription[];
  notifications: Notification[];
};

export default function PriceAlertManager({
  title,
  body,
  productLabel,
  submitLabel,
  submittingLabel,
  removeLabel,
  emptyLabel,
  statusAdded,
  statusError,
  notificationsTitle,
  notificationsEmpty,
  basePath,
  locale,
  currencyLabel,
  products,
  subscriptions,
  notifications,
}: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [productQuery, setProductQuery] = useState("");

  const selectedOptions = useMemo(
    () => new Set(subscriptions.map((subscription) => subscription.productId)),
    [subscriptions]
  );

  const availableProducts = products.filter((product) => !selectedOptions.has(product.id));

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) {
      return availableProducts;
    }

    return availableProducts.filter((product) => product.name.toLowerCase().includes(query));
  }, [availableProducts, productQuery]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const productId = String(formData.get("productId") ?? "").trim();

    if (!productId) {
      setStatus({ type: "error", message: statusError });
      setLoading(false);
      return;
    }

    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (!response.ok) {
      setStatus({ type: "error", message: statusError });
      setLoading(false);
      return;
    }

    setStatus({ type: "success", message: statusAdded });
    event.currentTarget.reset();
    setLoading(false);
    setTimeout(() => window.location.reload(), 800);
  }

  async function handleRemove(productId: string) {
    setLoading(true);
    setStatus(null);

    const response = await fetch("/api/alerts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (!response.ok) {
      setStatus({ type: "error", message: statusError });
      setLoading(false);
      return;
    }

    setStatus({ type: "success", message: statusAdded });
    setLoading(false);
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <section className="section">
      <div className="card">
        <h2>{title}</h2>
        <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>{body}</p>
        <form className="form-shell" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <label htmlFor="alert-product-search">Search products</label>
          <input
            id="alert-product-search"
            type="search"
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder={productLabel}
          />
          <label htmlFor="alert-product">{productLabel}</label>
          <select id="alert-product" name="productId" defaultValue="" required>
            <option value="" disabled>
              --
            </option>
            {filteredProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <button
            className="button"
            type="submit"
            disabled={loading || filteredProducts.length === 0}
          >
            {loading ? submittingLabel : submitLabel}
          </button>
        </form>
        {status ? (
          <div
            className="card"
            style={{ marginTop: 16, borderColor: status.type === "error" ? "#a23" : "#2f6" }}
          >
            <p>{status.message}</p>
          </div>
        ) : null}
        <div style={{ marginTop: 20 }}>
          {subscriptions.length ? (
            <ul style={{ paddingLeft: 18, color: "var(--ink-muted)" }}>
              {subscriptions.map((subscription) => (
                <li key={subscription.id} style={{ marginBottom: 6 }}>
                  <Link href={`${basePath}/products/${subscription.productSlug}`}>
                    {subscription.productName}
                  </Link>
                  <button
                    className="button ghost"
                    type="button"
                    style={{ marginLeft: 12 }}
                    onClick={() => handleRemove(subscription.productId)}
                  >
                    {removeLabel}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>{emptyLabel}</p>
          )}
        </div>
        <div style={{ marginTop: 24 }}>
          <h3>{notificationsTitle}</h3>
          {notifications.length ? (
            <ul style={{ marginTop: 12, paddingLeft: 18, color: "var(--ink-muted)" }}>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link href={`${basePath}/products/${notification.productSlug}`}>
                    {notification.productName}
                  </Link>
                  {` · ${notification.storeName} · ${currencyFormatter.format(
                    notification.fromAmount
                  )} → ${currencyFormatter.format(notification.toAmount)} ${currencyLabel} · ${
                    notification.recordedAt
                  }`}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>{notificationsEmpty}</p>
          )}
        </div>
      </div>
    </section>
  );
}
