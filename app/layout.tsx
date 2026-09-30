import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Démasq — Le jeu des identités secrètes",
  description: "Un personnage secret, un indice, un doute. Jouez de 3 à 12, sur un téléphone ou chacun son écran.",
  applicationName: "Démasq",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Démasq", statusBarStyle: "default" },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#6942e8" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
