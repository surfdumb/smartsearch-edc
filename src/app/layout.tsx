import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Self-hosted STATIC font weights (latin subset). Replaces next/font/google,
// which served VARIABLE font files — Chrome/Skia print-to-PDF cannot subset a
// variable font into a standard sfnt and falls back to embedding every glyph as
// a Type 3 procedure with broken bounding boxes. Adobe then drops
// spaces/punctuation mid-line. Static single-master files embed cleanly as
// TrueType/CFF. Families, weights, styles and CSS-variable names are unchanged —
// this is a font-embedding fix only, no visual change. Files sourced from the
// non-variable @fontsource/*@5 packages; the latin unicode-range (U+2000–206F)
// covers the em/en dashes and curly quotes that broke for Tara.

const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/inter-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

const sortsMillGoudy = localFont({
  src: [
    { path: "./fonts/sorts-mill-goudy-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/sorts-mill-goudy-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-sorts-mill",
  display: "swap",
});

const outfit = localFont({
  src: [
    { path: "./fonts/outfit-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "./fonts/outfit-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/outfit-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/outfit-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/outfit-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-outfit",
  display: "swap",
});

const libreFranklin = localFont({
  src: [
    { path: "./fonts/libre-franklin-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/libre-franklin-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/libre-franklin-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/libre-franklin-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/libre-franklin-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-libre-franklin",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EDC - SmartSearch",
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
      <body className={`${inter.variable} ${cormorant.variable} ${sortsMillGoudy.variable} ${outfit.variable} ${libreFranklin.variable} font-inter antialiased`}>
        {children}
      </body>
    </html>
  );
}
