import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password | KingAqua Academy",
  description: "Request password assistance or contact superadmin via WhatsApp.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(150deg, #0b2944 0%, #154267 52%, #0284c7 100%)",
            color: "#ffffff",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          Loading password assistance...
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
