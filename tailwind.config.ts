import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "serif"],
        "sorts-mill": ["var(--font-sorts-mill)", "Sorts Mill Goudy", "serif"],
      },
      colors: {
        // Core
        "ss-dark": "#1a1a1a",
        "ss-dark-soft": "#2c2c2c",
        "ss-header-bg": "#2d2824",

        // Gold System
        "ss-gold": "#c5a572",
        "ss-gold-light": "#d4ba8a",
        "ss-gold-pale": "#e8dbc7",
        "ss-gold-glow": "rgba(197, 165, 114, 0.15)",
        "ss-gold-deep": "#b08f5a",

        // Backgrounds
        "ss-cream": "#faf8f5",
        "ss-warm-white": "#f7f4ef",
        "ss-warm-tint": "#fdfbf7",
        "ss-page-bg": "#f0ede8",

        // Text
        "ss-gray": "#6b6b6b",
        "ss-gray-light": "#a0a0a0",
        "ss-gray-pale": "#d4d2ce",

        // Semantic — Scope Match Only
        "ss-green": "#4a7c59",
        "ss-green-soft": "#5a9469",
        "ss-green-light": "rgba(74, 124, 89, 0.10)",
        "ss-green-badge": "rgba(74, 124, 89, 0.08)",

        "ss-yellow": "#c9953a",
        "ss-yellow-light": "rgba(201, 149, 58, 0.10)",

        "ss-red": "#b85450",
        "ss-red-light": "rgba(184, 84, 80, 0.08)",

        // Context Anchor (Key Criteria pills)
        "ss-blue": "#4a6a8c",
        "ss-blue-light": "rgba(74, 106, 140, 0.10)",

        // Borders
        "ss-border": "#f0ede8",
        "ss-border-light": "#f7f5f1",

        // Obsidian (dark theme)
        "ss-obsidian": "#0a0a0a",
        "ss-obsidian-card": "#111111",
        "ss-obsidian-elevated": "#161616",
      },
      fontSize: {
        // Typography scale from spec
        "candidate-name": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.5px", fontWeight: "700" }],
        "section-label": ["0.65rem", { lineHeight: "1.4", letterSpacing: "2.5px", fontWeight: "600" }],
        "criteria-heading": ["0.92rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body": ["0.87rem", { lineHeight: "1.65", fontWeight: "400" }],
        "meta-label": ["0.68rem", { lineHeight: "1.4", letterSpacing: "1.5px", fontWeight: "600" }],
        "meta-value": ["0.92rem", { lineHeight: "1.4", fontWeight: "400" }],
        "context-pill": ["0.68rem", { lineHeight: "1.4", fontWeight: "600" }],
        "footer": ["0.74rem", { lineHeight: "1.4", fontWeight: "400" }],
      },
      maxWidth: {
        card: "820px",
      },
      borderRadius: {
        card: "20px",
        pill: "12px",
        seasoning: "10px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 8px 30px rgba(0,0,0,0.06), 0 30px 80px rgba(0,0,0,0.04)",
      },
      spacing: {
        "header-x": "48px",
        "header-top": "36px",
        "header-bottom": "32px",
        "section-x": "48px",
        "section-y": "20px",
        "criteria-y": "18px",
        "seasoning-x": "20px",
        "seasoning-y": "14px",
        "page-top": "40px",
        "page-bottom": "80px",
      },
    },
  },
  plugins: [],
};
export default config;
