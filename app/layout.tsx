import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Démasq — Le jeu des identités secrètes",
  description: "Un personnage secret, un indice, un doute. Jouez de 3 à 12, sur un téléphone ou chacun son écran.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

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
