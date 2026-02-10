"use client";

import { useState } from "react";
import Link from "next/link";

type Status = {
  type: "success" | "error";
  message: string;
};

type Props = {
  productId: string;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  loginHref: string;
  title: string;
  body: string;
  enableLabel: string;
  disableLabel: string;
  loginLabel: string;
  successEnabled: string;
  successDisabled: string;
  errorLabel: string;
};

export default function FavoriteAlertToggle({
  productId,
  isAuthenticated,
  isSubscribed,
  loginHref,
  title,
  body,
  enableLabel,
  disableLabel,
  loginLabel,
  successEnabled,
  successDisabled,
  errorLabel,
}: Props) {
  const [subscribed, setSubscribed] = useState(isSubscribed);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  async function handleToggle() {
    setLoading(true);
    setStatus(null);

    const response = await fetch("/api/alerts", {
      method: subscribed ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (!response.ok) {
      setStatus({ type: "error", message: errorLabel });
      setLoading(false);
      return;
    }

    const nextSubscribed = !subscribed;
    setSubscribed(nextSubscribed);
    setStatus({
      type: "success",
      message: nextSubscribed ? successEnabled : successDisabled,
    });
    setLoading(false);
  }

  return (
    <section className="section">
      <div className="card">
        <h2>{title}</h2>
        <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>{body}</p>
        {isAuthenticated ? (
          <button
            className="button"
            type="button"
            onClick={handleToggle}
            disabled={loading}
            style={{ marginTop: 16 }}
          >
            {loading ? "..." : subscribed ? disableLabel : enableLabel}
          </button>
        ) : (
          <p style={{ marginTop: 16, color: "var(--ink-muted)" }}>
            <Link href={loginHref}>{loginLabel}</Link>
          </p>
        )}
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
