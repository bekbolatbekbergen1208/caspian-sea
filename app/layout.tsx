import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CaspianWatch AI — Monitoring the Caspian through science",
  description:
    "Explore the Caspian coast with satellite observations, NDWI and date-based forecasts",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
