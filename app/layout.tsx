import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allo — Inventory",
  description: "Multi-warehouse inventory and order-fulfilment platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ position: "relative", zIndex: 1 }}>
          <header style={{
            borderBottom: "1px solid var(--border)",
            background: "rgba(245,242,237,0.92)",
            backdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}>
            <div style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0 24px",
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)", letterSpacing: "-0.02em" }}>allo</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500 }}>inventory</span>
              </a>
              <span style={{ fontSize: 12, color: "var(--ink-muted)", fontStyle: "italic", fontFamily: "var(--serif)" }}>
                multi-warehouse fulfilment
              </span>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
