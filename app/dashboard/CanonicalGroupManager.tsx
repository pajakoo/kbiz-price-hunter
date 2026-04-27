"use client";

import { useState } from "react";
import Link from "next/link";

type ProductItem = {
  id: string;
  name: string;
  slug: string;
};

type GroupItem = {
  canonicalKey: string;
  count: number;
  products: ProductItem[];
};

type GroupState = GroupItem & { excluded: ProductItem[] };

type Labels = {
  keyColumn: string;
  groupColumn: string;
  excludedColumn: string;
};

type Props = {
  groups: GroupItem[];
  locale: string;
  labels: Labels;
};

export default function CanonicalGroupManager({ groups, locale, labels }: Props) {
  const [state, setState] = useState<GroupState[]>(
    groups.map((group) => ({ ...group, excluded: [] }))
  );

  const updateProduct = async (productId: string, canonicalKey: string | null) => {
    const response = await fetch("/api/canonical/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, canonicalKey }),
    });

    if (!response.ok) {
      throw new Error("Update failed");
    }
  };

  const moveProduct = async (
    groupKey: string,
    productId: string,
    target: "excluded" | "group"
  ) => {
    setState((prev) =>
      prev.map((group) => {
        if (group.canonicalKey !== groupKey) {
          return group;
        }

        const from = target === "excluded" ? group.products : group.excluded;
        const to = target === "excluded" ? group.excluded : group.products;
        const product = from.find((item) => item.id === productId);

        if (!product) {
          return group;
        }

        return {
          ...group,
          products: target === "excluded" ? from.filter((item) => item.id !== productId) : [...to, product],
          excluded: target === "excluded" ? [...to, product] : from.filter((item) => item.id !== productId),
        };
      })
    );

    try {
      await updateProduct(productId, target === "excluded" ? null : groupKey);
    } catch (error) {
      console.error("Canonical update failed", error);
      window.alert("Failed to update product. Reloading...");
      window.location.reload();
    }
  };

  if (state.length === 0) {
    return null;
  }

  return (
    <table
      className="table"
      style={{
        minWidth: 860,
        tableLayout: "fixed",
        borderCollapse: "separate",
        borderSpacing: 0,
      }}
    >
      <thead>
        <tr>
          <th style={{ border: "1px solid var(--border-subtle)", width: "26%", padding: "12px 14px" }}>
            {labels.keyColumn}
          </th>
          <th style={{ border: "1px solid var(--border-subtle)", width: "37%", padding: "12px 14px" }}>
            {labels.groupColumn}
          </th>
          <th style={{ border: "1px solid var(--border-subtle)", width: "37%", padding: "12px 14px" }}>
            {labels.excludedColumn}
          </th>
        </tr>
      </thead>
      <tbody>
        {state.map((group, index) => (
          <tr
            key={group.canonicalKey}
            style={{ backgroundColor: index % 2 === 0 ? "rgba(0, 0, 0, 0.03)" : "transparent" }}
          >
            <td style={{ border: "1px solid var(--border-subtle)", padding: "12px 14px" }}>
              {group.canonicalKey}
            </td>
            <td style={{ border: "1px solid var(--border-subtle)", padding: "12px 14px" }}>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {group.products.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => moveProduct(group.canonicalKey, product.id, "excluded")}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "inherit",
                        cursor: "pointer",
                        font: "inherit",
                        textAlign: "left",
                      }}
                    >
                      {product.name}
                    </button>
                    <Link
                      href={`/${locale}/products/${product.slug}`}
                      style={{ marginLeft: 8, color: "var(--ink-muted)" }}
                    >
                      ↗
                    </Link>
                  </li>
                ))}
              </ul>
            </td>
            <td style={{ border: "1px solid var(--border-subtle)", padding: "12px 14px" }}>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {group.excluded.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => moveProduct(group.canonicalKey, product.id, "group")}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "inherit",
                        cursor: "pointer",
                        font: "inherit",
                        textAlign: "left",
                      }}
                    >
                      {product.name}
                    </button>
                  </li>
                ))}
              </ul>
            </td>
          </tr>

        ))}
      </tbody>
    </table>
  );
}
