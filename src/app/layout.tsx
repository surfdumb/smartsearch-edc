import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, Sorts_Mill_Goudy } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const sortsMillGoudy = Sorts_Mill_Goudy({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-sorts-mill",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartSearch — Executive Decision Card",
  description: "Executive Decision Cards for SmartSearch executive search",
  icons: {
    icon: "/logos/Logos_SmartSearch_SecondarySymbol_Gold 2.png",
    apple: "/logos/Logos_SmartSearch_SecondarySymbol_Gold 2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable} ${sortsMillGoudy.variable} font-inter antialiased`}>
        {children}
      </body>
    </html>
  );
}
