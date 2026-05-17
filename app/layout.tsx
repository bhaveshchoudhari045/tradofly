import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRADO-FLY | Indian Stock Market Dashboard",
  description: "Real-time NSE/BSE paper trading and analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
