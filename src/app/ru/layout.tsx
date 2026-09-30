import type { ReactNode } from "react";

import { geologica } from "@/app/_site/fonts";
import { layoutMetadata, siteViewport } from "@/app/_site/metadata";
import { SiteDocument } from "@/components/site-document";

export const metadata = layoutMetadata();
export const viewport = siteViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <SiteDocument locale="ru" fontClassName={geologica.variable}>
      {children}
    </SiteDocument>
  );
}
