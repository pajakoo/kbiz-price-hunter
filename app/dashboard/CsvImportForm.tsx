"use client";

import { useState } from "react";

type Status = {
  type: "success" | "error";
  message: string;
};

type Props = {
  title: string;
  body: string;
  fileLabel: string;
  dateLabel: string;
  dateHelp: string;
  submitLabel: string;
  submittingLabel: string;
  successMessage: string;
  errorMessage: string;
};

export default function CsvImportForm({
  title,
  body,
  fileLabel,
  dateLabel,
  dateHelp,
  submitLabel,
  submittingLabel,
  successMessage,
  errorMessage,
}: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const todayValue = new Date().toISOString().slice(0, 10);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || !file.name) {
      setStatus({ type: "error", message: errorMessage });
      setLoading(false);
      return;
    }

    const response = await fetch("/api/import/csv", {
      method: "POST",
      body: formData,
    });

    let payload: { error?: string; firstProduct?: { name?: string } } | null = null;
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

    const productName = payload?.firstProduct?.name ?? "";
    setStatus({
      type: "success",
      message: successMessage.replace("{name}", productName),
    });

    event.currentTarget.reset();
    setLoading(false);
    setTimeout(() => window.location.reload(), 1200);
  }

  return (
    <section className="section">
      <div className="card">
        <h2>{title}</h2>
        <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>{body}</p>
        <form className="form-shell" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <label htmlFor="csv-file">{fileLabel}</label>
          <input id="csv-file" name="file" type="file" accept=".csv" required />
          <label htmlFor="csv-date">{dateLabel}</label>
          <input id="csv-date" name="recordedAt" type="date" defaultValue={todayValue} required />
          <p style={{ marginTop: -8, color: "var(--ink-muted)" }}>{dateHelp}</p>
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
