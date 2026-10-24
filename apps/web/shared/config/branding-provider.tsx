"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import type { BrandingDTO } from "@/shared/api/branding";
import { resolveApiBaseURL } from "@/shared/api/http-client";
import { DEFAULT_BRANDING, localizedBrandTitle } from "@/shared/config/branding";
import { useBrandingLoader } from "@/shared/config/use-branding-loader";

const BrandingContext = React.createContext<BrandingDTO>(DEFAULT_BRANDING);

// Rendered inside the i18n provider: the document title follows the active
// locale, while an operator-set branding title always wins.
export function BrandingDocumentMetadata() {
  const branding = useBranding();
  const t = useTranslations("common");
  const title = localizedBrandTitle(branding.title, t("appName"));

  return (
    <>
      <title>{title}</title>
      <meta name="application-name" content={title} />
      <meta name="apple-mobile-web-app-title" content={title} />
      <meta name="description" content={branding.description} />
      <link rel="icon" href={branding.faviconURL} />
      <link rel="icon" href={branding.pwaIcon192URL} sizes="192x192" />
      <link rel="icon" href={branding.pwaIcon512URL} sizes="512x512" />
      <link rel="apple-touch-icon" href={branding.appleTouchIcon180URL} sizes="180x180" />
      <link
        rel="manifest"
        href={`${resolveApiBaseURL()}/api/v1/branding/manifest.webmanifest`}
      />
    </>
  );
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { branding, ready } = useBrandingLoader();

  React.useLayoutEffect(() => {
    if (ready) {
      document.documentElement.removeAttribute("data-branding-pending");
    }
  }, [ready]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingDTO {
  return React.useContext(BrandingContext);
}
