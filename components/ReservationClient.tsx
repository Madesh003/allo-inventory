"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ReservationData {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: string;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    name: string;
    sku: string;
    price: string;
    imageUrl: string | null;
  };
  warehouse: {
    name: string;
    location: string;
  };
}

interface Props {
  reservation: ReservationData;
}

function useCountdown(expiresAt: string, status: string) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  return secondsLeft;
}

function CountdownRing({ seconds, total = 600 }: { seconds: number; total?: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const offset = circumference * (1 - progress);

  const color = seconds > 120 ? "var(--accent-green)" : seconds > 30 ? "#D97706" : "var(--accent)";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
      <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "var(--serif)",
          fontSize: 22,
          color: "var(--ink)",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2, letterSpacing: "0.06em" }}>
          remaining
        </span>
      </div>
    </div>
  );
}

export default function ReservationClient({ reservation: initial }: Props) {
  const router = useRouter();
  const [reservation, setReservation] = useState(initial);
  const [loading, setLoading] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<{ code: number; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const secondsLeft = useCountdown(reservation.expiresAt, reservation.status);
  const isExpired = reservation.status === "PENDING" && secondsLeft === 0;

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(parseFloat(reservation.product.price));

  const handleConfirm = useCallback(async () => {
    setLoading("confirm");
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.status === 410) {
        setError({ code: 410, message: data.error });
        setLoading(null);
        return;
      }
      if (!res.ok) {
        setError({ code: res.status, message: data.error ?? "Something went wrong." });
        setLoading(null);
        return;
      }

      setReservation((prev) => ({ ...prev, status: "CONFIRMED", confirmedAt: data.reservation.confirmedAt }));
      setSuccessMessage("Payment confirmed! Your order has been placed.");
    } catch {
      setError({ code: 0, message: "Network error. Please try again." });
    } finally {
      setLoading(null);
    }
  }, [reservation.id]);

  const handleCancel = useCallback(async () => {
    setLoading("cancel");
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError({ code: res.status, message: data.error ?? "Something went wrong." });
        setLoading(null);
        return;
      }

      setReservation((prev) => ({ ...prev, status: "RELEASED", releasedAt: data.reservation.releasedAt }));
      setSuccessMessage("Reservation cancelled. Units returned to stock.");
    } catch {
      setError({ code: 0, message: "Network error. Please try again." });
    } finally {
      setLoading(null);
    }
  }, [reservation.id]);

  const statusConfig = {
    PENDING: { label: "Awaiting payment", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
    CONFIRMED: { label: "Order confirmed", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
    RELEASED: { label: "Reservation released", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
  };

  const status = isExpired && reservation.status === "PENDING"
    ? { label: "Expired", color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" }
    : statusConfig[reservation.status as keyof typeof statusConfig];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px" }}>
      {/* Back link */}
      <a
        href="/"
        style={{
          fontSize: 13,
          color: "var(--ink-muted)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 32,
        }}
      >
        ← Back to products
      </a>

      <div
        className="animate-fade-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Product image strip */}
        {reservation.product.imageUrl && (
          <div style={{ height: 160, overflow: "hidden", background: "#EDE9E4" }}>
            <img
              src={reservation.product.imageUrl}
              alt={reservation.product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}

        <div style={{ padding: 28 }}>
          {/* Page title */}
          <div style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--ink-muted)", fontWeight: 500, marginBottom: 4,
            }}>
              Reservation #{reservation.id.slice(-8).toUpperCase()}
            </p>
            <h1 style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
              {reservation.product.name}
            </h1>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
              SKU: {reservation.product.sku}
            </p>
          </div>

          {/* Status + countdown row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            gap: 16,
          }}>
            <div>
              {/* Status badge */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 12px",
                borderRadius: 999,
                background: status.bg,
                border: `1px solid ${status.border}`,
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: status.color, letterSpacing: "0.04em" }}>
                  {status.label}
                </span>
              </div>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <DetailRow label="Warehouse" value={`${reservation.warehouse.name} — ${reservation.warehouse.location}`} />
                <DetailRow label="Quantity" value={`${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}`} />
                <DetailRow label="Total" value={formattedPrice} bold />
                {reservation.status === "CONFIRMED" && reservation.confirmedAt && (
                  <DetailRow label="Confirmed" value={new Date(reservation.confirmedAt).toLocaleString("en-IN")} />
                )}
                {reservation.status === "RELEASED" && reservation.releasedAt && (
                  <DetailRow label="Released" value={new Date(reservation.releasedAt).toLocaleString("en-IN")} />
                )}
              </div>
            </div>

            {reservation.status === "PENDING" && (
              <CountdownRing seconds={secondsLeft} total={600} />
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div
              className="animate-slide-in"
              style={{
                padding: "12px 16px",
                background: error.code === 410 ? "#FEF2F2" : "#FEF2F2",
                border: `1px solid ${error.code === 410 ? "#FECACA" : "#FECACA"}`,
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 13,
                color: "#B91C1C",
              }}
            >
              <strong>{error.code === 410 ? "⏰ Reservation expired" : "⚠ Error"}</strong>
              <br />
              {error.message}
            </div>
          )}

          {/* Success banner */}
          {successMessage && (
            <div
              className="animate-slide-in"
              style={{
                padding: "12px 16px",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 13,
                color: "#065F46",
              }}
            >
              ✓ {successMessage}
            </div>
          )}

          {/* Expiry notice */}
          {isExpired && reservation.status === "PENDING" && !error && (
            <div style={{
              padding: "12px 16px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 13,
              color: "#B91C1C",
            }}>
              ⏰ This reservation has expired. The units have been returned to stock.
            </div>
          )}

          {/* Action buttons */}
          {reservation.status === "PENDING" && !isExpired && (
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleConfirm}
                disabled={loading !== null}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--ink)",
                  color: "var(--bg)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                  fontFamily: "var(--sans)",
                  opacity: loading === "confirm" ? 0.7 : 1,
                  transition: "opacity 0.15s ease",
                }}
              >
                {loading === "confirm" ? "Processing…" : "✓ Confirm purchase"}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading !== null}
                style={{
                  padding: "12px 20px",
                  borderRadius: 6,
                  border: "1.5px solid var(--border-strong)",
                  background: "transparent",
                  color: "var(--ink-muted)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: loading ? "wait" : "pointer",
                  fontFamily: "var(--sans)",
                  opacity: loading === "cancel" ? 0.7 : 1,
                  transition: "opacity 0.15s ease",
                }}
              >
                {loading === "cancel" ? "Cancelling…" : "Cancel"}
              </button>
            </div>
          )}

          {(reservation.status !== "PENDING" || isExpired) && !successMessage && (
            <button
              onClick={() => router.push("/")}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 6,
                border: "1.5px solid var(--border)",
                background: "transparent",
                color: "var(--ink)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--sans)",
              }}
            >
              ← Browse products
            </button>
          )}

          {successMessage && (
            <button
              onClick={() => router.push("/")}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 6,
                border: "none",
                background: "var(--accent-green)",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                marginTop: 4,
              }}
            >
              Continue shopping
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ fontSize: 12, color: "var(--ink-faint)", minWidth: 72, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        color: "var(--ink)",
        fontWeight: bold ? 600 : 400,
      }}>
        {value}
      </span>
    </div>
  );
}
