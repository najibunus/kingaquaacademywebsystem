import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kingaqua Academy",
    template: "%s | Kingaqua Academy",
  },
  description:
    "Kingaqua Academy — Swimming class management portal for students, coaches, staff, and parents.",
  keywords: ["swimming academy", "aqua", "swimming classes", "Kingaqua"],
  authors: [{ name: "Kingaqua Academy" }],
  robots: "noindex, nofollow", // Internal portal — not for public indexing
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on mobile form inputs
  themeColor: "#0ea5c8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f7fafc] min-h-screen w-full m-0 p-0 text-slate-900">{children}</body>
    </html>
  );
}
