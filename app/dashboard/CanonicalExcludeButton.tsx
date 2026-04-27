"use client";

import { useState } from "react";

type Props = {
  productId: string;
  label: string;
};

export default function CanonicalExcludeButton({ productId, label }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/canonical/exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      window.location.reload();
    } catch (error) {
      console.error("Exclude from canonical group failed", error);
      window.alert("Failed to exclude product. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="button ghost" onClick={handleClick} disabled={loading}>
      {loading ? "..." : label}
    </button>
  );
}
