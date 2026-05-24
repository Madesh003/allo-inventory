"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Warehouse {
  id: string;
  name: string;
  location: string;
}

interface InventoryEntry {
  warehouseId: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
  warehouse: Warehouse;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  inventories: InventoryEntry[];
}

interface Props {
  products: Product[];
}

function StockBadge({ available }: { available: number }) {
  if (available === 0) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
        padding: "2px 8px", borderRadius: 999,
        background: "#FEE2E2", color: "#B91C1C",
        textTransform: "uppercase",
      }}>Out of stock</span>
    );
  }
  if (available <= 2) {
    return (
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
        padding: "2px 8px", borderRadius: 999,
        background: "#FEF3C7", color: "#B45309",
        textTransform: "uppercase",
      }}>Only {available} left</span>
    );
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: 999,
      background: "#D1FAE5", color: "#065F46",
      textTransform: "uppercase",
    }}>{available} available</span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    product.inventories[0]?.warehouseId ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInventory = product.inventories.find(
    (inv) => inv.warehouseId === selectedWarehouseId
  );
  const available = selectedInventory?.availableUnits ?? 0;

  const handleReserve = async () => {
    if (!selectedWarehouseId || available === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouseId,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error ?? "Not enough stock available.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      router.push(`/reservation/${data.reservation.id}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(parseFloat(product.price));

  return (
    <div
      className="animate-fade-in"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Image */}
      {product.imageUrl && (
        <div style={{ height: 200, overflow: "hidden", background: "#EDE9E4" }}>
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <h2 style={{ fontSize: 17, letterSpacing: "-0.01em", color: "var(--ink)", lineHeight: 1.3 }}>
              {product.name}
            </h2>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>
              {formattedPrice}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.08em", marginTop: 2 }}>
            SKU: {product.sku}
          </p>
        </div>

        {product.description && (
          <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5, flexGrow: 1 }}>
            {product.description}
          </p>
        )}

        {/* Warehouse selector */}
        <div>
          <label style={{
            fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
            fontWeight: 600, color: "var(--ink-muted)", display: "block", marginBottom: 6,
          }}>
            Fulfil from
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {product.inventories.map((inv) => (
              <button
                key={inv.warehouseId}
                onClick={() => setSelectedWarehouseId(inv.warehouseId)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: selectedWarehouseId === inv.warehouseId
                    ? "1.5px solid var(--ink)"
                    : "1.5px solid var(--border)",
                  background: selectedWarehouseId === inv.warehouseId
                    ? "rgba(26,23,20,0.04)"
                    : "transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                    {inv.warehouse.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {inv.warehouse.location}
                  </div>
                </div>
                <StockBadge available={inv.availableUnits} />
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: "10px 12px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 6,
            fontSize: 13,
            color: "#B91C1C",
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Reserve button */}
        <button
          onClick={handleReserve}
          disabled={loading || available === 0}
          style={{
            padding: "11px 20px",
            borderRadius: 6,
            border: "none",
            background: available === 0 ? "var(--border)" : "var(--ink)",
            color: available === 0 ? "var(--ink-faint)" : "var(--bg)",
            fontSize: 14,
            fontWeight: 600,
            cursor: available === 0 ? "not-allowed" : loading ? "wait" : "pointer",
            fontFamily: "var(--sans)",
            letterSpacing: "0.01em",
            transition: "opacity 0.15s ease",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Reserving…" : available === 0 ? "Out of Stock" : "Reserve — 10 min hold"}
        </button>
      </div>
    </div>
  );
}

export default function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--ink-muted)" }}>
        <p style={{ fontFamily: "var(--serif)", fontSize: 24, marginBottom: 8 }}>No products found</p>
        <p style={{ fontSize: 14 }}>Run the seed script to add sample inventory.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: 20,
    }}>
      {products.map((product, i) => (
        <div key={product.id} style={{ animationDelay: `${i * 60}ms` }}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
