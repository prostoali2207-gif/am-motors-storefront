import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";

import { AttributionCapture } from "@/components/attribution-capture";

import "./globals.css";

/**
 * Geologica (SIL OFL 1.1, see ./fonts/OFL.txt), self-hosted: weights 400–700, Latin + Cyrillic.
 * Cyrillic is required because Sheet values may be shown verbatim in Russian until an English
 * display mapping is confirmed (docs/business-rules.md, open question 6). Provisional until brand
 * assets exist (open question 14). How the file was built: ./fonts/README.md.
 */
const geologica = localFont({
  src: "./fonts/geologica-latin-cyrillic.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-sans",
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "AM Motors", template: "%s · AM Motors" },
  // No brand assets are confirmed yet; an empty icon stops the browser's /favicon.ico 404.
  icons: { icon: "data:," },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the mobile sticky action bar sit above the home indicator via env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: "#f6f5f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geologica.variable}>
      <body>
        <AttributionCapture />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <nav className="shell site-nav" aria-label="Main">
            {/* Provisional text wordmark until brand assets are confirmed (open question 14). */}
            <Link className="wordmark" href="/">
              AM Motors
            </Link>
            <Link className="nav-link" href="/cars">
              Cars
            </Link>
          </nav>
        </header>
        <main id="main" className="shell">
          {children}
        </main>
        <footer className="site-footer">
          <div className="shell">
            <span className="wordmark">AM Motors</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
