import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--gradient-hero)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        textAlign: "center",
      }}
    >
      <div style={{ animation: "fadeInUp 0.4s ease both" }}>
        {/* 404 number */}
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(80px, 20vw, 160px)",
            fontWeight: 900,
            color: "rgba(255,255,255,0.08)",
            letterSpacing: "-0.06em",
            lineHeight: 1,
            marginBottom: "var(--space-4)",
            userSelect: "none",
          }}
          aria-hidden="true"
        >
          404
        </p>

        {/* Icon */}
        <div
          style={{ fontSize: 64, marginBottom: "var(--space-6)", animation: "float 4s ease-in-out infinite" }}
          aria-hidden="true"
        >
          🌊
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-3xl)",
            fontWeight: 800,
            color: "white",
            letterSpacing: "var(--tracking-tight)",
            marginBottom: "var(--space-3)",
          }}
        >
          Lost at sea
        </h1>

        <p
          style={{
            fontSize: "var(--text-base)",
            color: "rgba(255,255,255,0.6)",
            marginBottom: "var(--space-8)",
            maxWidth: 340,
            margin: "0 auto var(--space-8)",
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>

        <Link
          href="/"
          className="btn btn-lg"
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "white",
          }}
        >
          ← Back to safety
        </Link>
      </div>
    </div>
  );
}
