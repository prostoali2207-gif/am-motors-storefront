import localFont from "next/font/local";

/**
 * Geologica (SIL OFL 1.1, see ../fonts/OFL.txt), self-hosted: weights 400–700, Latin + Cyrillic.
 * Cyrillic is required because Sheet values without an approved display label are shown verbatim
 * (often in Russian) and for the Russian interface. Provisional until brand assets exist (open
 * question 14). How the file was built: ../fonts/README.md. Arabic glyphs come from the Arabic
 * companion loaded only by the Arabic layout (app/ar/layout.tsx).
 */
export const geologica = localFont({
  src: "../fonts/geologica-latin-cyrillic.woff2",
  weight: "400 700",
  display: "swap",
  variable: "--font-sans",
  fallback: ["Arial", "sans-serif"],
});
