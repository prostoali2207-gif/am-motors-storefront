import type { ReactNode } from "react";

import localFont from "next/font/local";

import { geologica } from "@/app/_site/fonts";
import { layoutMetadata, siteViewport } from "@/app/_site/metadata";
import { SiteDocument } from "@/components/site-document";

/**
 * Arabic companion: Noto Kufi Arabic (SIL OFL 1.1, ../fonts/OFL-NotoKufiArabic.txt), weights
 * 400–700, Arabic block only (Latin and figures stay in Geologica). Loaded only by this layout.
 * Why this face: docs/ux-benchmark.md → "Phase 7". Build steps: ../fonts/README.md.
 */
const notoKufiArabic = localFont({
  src: "../fonts/noto-kufi-arabic.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-arabic",
  // No fallback in this variable: the Arabic page stack (globals.css) falls back to Geologica and
  // the system Arabic face; Latin never renders in this face (unicode-range).
  fallback: [],
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200F, U+FD3E-FD3F" }],
});

export const metadata = layoutMetadata();
export const viewport = siteViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <SiteDocument locale="ar" fontClassName={`${geologica.variable} ${notoKufiArabic.variable}`}>
      {children}
    </SiteDocument>
  );
}
