import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CaspianWatch AI — Каспийді ғылыммен бақылаймыз",
  description:
    "Каспий жағалауын спутниктік деректер мен NDWI арқылы зерттеу платформасы",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="kk" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
