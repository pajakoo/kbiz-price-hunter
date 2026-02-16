"use client";

import { useState } from "react";

type Status = {
  type: "success" | "error";
  message: string;
};

type Props = {
  title: string;
  body: string;
  slugLabel: string;
  nameLabel: string;
  descriptionLabel: string;
  priceLabel: string;
  storeLabel: string;
  cityLabel: string;
  dateLabel: string;
  slugPlaceholder: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  pricePlaceholder: string;
  storePlaceholder: string;
  cityPlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  successMessage: string;
  errorMessage: string;
};

export default function ProductCreateForm({
  title,
  body,
  slugLabel,
  nameLabel,
  descriptionLabel,
  priceLabel,
  storeLabel,
  cityLabel,
  dateLabel,
  slugPlaceholder,
  namePlaceholder,
  descriptionPlaceholder,
  pricePlaceholder,
  storePlaceholder,
  cityPlaceholder,
  submitLabel,
  submittingLabel,
  successMessage,
  errorMessage,
}: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setStatus(null);

    const formData = new FormData(form);
    const slug = String(formData.get("slug") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const price = String(formData.get("price") ?? "").trim();
    const storeName = String(formData.get("storeName") ?? "").trim();
    const storeCity = String(formData.get("storeCity") ?? "").trim();
    const recordedAt = String(formData.get("recordedAt") ?? "").trim();

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name,
        description: description || null,
        price,
        storeName,
        storeCity: storeCity || null,
        recordedAt,
      }),
    });

    let payload: { error?: string; product?: { name?: string } } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      setStatus({ type: "error", message: payload?.error ?? errorMessage });
      setLoading(false);
      return;
    }

    const createdName = payload?.product?.name ?? name;
    setStatus({
      type: "success",
      message: successMessage.replace("{name}", createdName),
    });
    form.reset();
    setLoading(false);
  }

  return (
    <section className="section">
      <div className="card">
        <h2>{title}</h2>
        <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>{body}</p>
        <form className="form-shell" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <label htmlFor="slug">{slugLabel}</label>
          <input
            id="slug"
            name="slug"
            type="text"
            placeholder={slugPlaceholder}
            required
          />
          <label htmlFor="name">{nameLabel}</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder={namePlaceholder}
            required
          />
          <label htmlFor="description">{descriptionLabel}</label>
          <textarea
            id="description"
            name="description"
            placeholder={descriptionPlaceholder}
            rows={4}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              marginBottom: 16,
              resize: "vertical",
            }}
          />
          <label htmlFor="price">{priceLabel}</label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder={pricePlaceholder}
            required
          />
          <label htmlFor="storeName">{storeLabel}</label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            placeholder={storePlaceholder}
            required
          />
          <label htmlFor="storeCity">{cityLabel}</label>
          <input
            id="storeCity"
            name="storeCity"
            type="text"
            placeholder={cityPlaceholder}
          />
          <label htmlFor="recordedAt">{dateLabel}</label>
          <input id="recordedAt" name="recordedAt" type="date" required />
          <button className="button" type="submit" disabled={loading}>
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
      </div>
    </section>
  );
}
