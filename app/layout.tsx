import type { Metadata } from "next";
import { Fraunces, Manrope, Bitter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bitter = Bitter({
    variable: "--font-logo",
    subsets: ["latin"],
    weight: ["700", "900"],
});

export const metadata: Metadata = {
  title: "Eterniza.io",
    description: "Fotos e vídeos do seu evento, com a trilha sonora de cada convidado.",
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
          lang="pt-BR"
          className={`${fraunces.variable} ${manrope.variable} ${bitter.variable} h-full antialiased`}
      >
      <body className="min-h-full flex flex-col">{children}</body>
      </html>
  );
}