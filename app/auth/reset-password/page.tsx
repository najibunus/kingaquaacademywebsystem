import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--gradient-hero)",
      }}
    >
      <div className="card" style={{ maxWidth: 400, width: "100%" }}>
        <h1 className="page-title" style={{ fontSize: "var(--text-2xl)" }}>
          Reset Password
        </h1>
        <p className="text-secondary" style={{ marginTop: "var(--space-2)" }}>
          Password reset flow connects in Phase 1.
        </p>
      </div>
    </div>
  );
}
