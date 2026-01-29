"use client";

import { useState } from "react";

type Props = {
  locale: string;
  emailLabel: string;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
  devLinkLabel: string;
};

export default function LoginForm({
  locale,
  emailLabel,
  placeholder,
  sendLabel,
  sendingLabel,
  devLinkLabel,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    setLink(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    const response = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });

    let payload: { error?: string; message?: string; magicLink?: string } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      setStatus(payload?.error ?? "Unable to send magic link.");
      setLoading(false);
      return;
    }

    setStatus(payload?.message ?? "Magic link sent.");
    setLink(payload?.magicLink ?? null);
    setLoading(false);
  }

  return (
    <div className="section">
      <form className="form-shell" onSubmit={handleSubmit}>
        <label htmlFor="email">{emailLabel}</label>
        <input id="email" name="email" type="email" placeholder={placeholder} required />
        <button className="button" type="submit" disabled={loading}>
          {loading ? sendingLabel : sendLabel}
        </button>
      </form>
      {status ? (
        <div className="card" style={{ marginTop: 20 }}>
          <p>{status}</p>
          {link ? (
            <p style={{ marginTop: 8 }}>
              {devLinkLabel} <a href={link}>{link}</a>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
