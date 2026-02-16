"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type Props = {
  slug: string;
  basePath: string;
  label: string;
  confirmLabel: string;
  successLabel: string;
  errorLabel: string;
};

export default function ProductDeleteButton({
  slug,
  basePath,
  label,
  confirmLabel,
  successLabel,
  errorLabel,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(confirmLabel)) {
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/products?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setStatus(errorLabel);
        setLoading(false);
        return;
      }

      setStatus(successLabel);
      router.push(`${basePath}/products`);
      router.refresh();
    } catch {
      setStatus(errorLabel);
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        className="button ghost button--icon"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 size={18} aria-hidden="true" />
        {loading ? "..." : label}
      </button>
      {status ? <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>{status}</p> : null}
    </div>
  );
}
