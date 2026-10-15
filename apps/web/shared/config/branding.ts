import type { BrandingDTO } from "@/shared/api/branding";
import { pwaAsset } from "@/shared/pwa/assets";

export const DEFAULT_BRANDING: BrandingDTO = {
  title: "CourseMate",
  shortName: "CourseMate",
  description: "CourseMate is a multi-model AI conversation system.",
  logoURL: "",
  faviconURL: "/favicon.ico",
  pwaIcon192URL: pwaAsset("/pwa/icon-192.png"),
  pwaIcon512URL: pwaAsset("/pwa/icon-512.png"),
  pwaMaskableIcon512URL: pwaAsset("/pwa/icon-maskable-512.png"),
  appleTouchIcon180URL: pwaAsset("/pwa/apple-touch-icon.png"),
};

let brandingSnapshot = DEFAULT_BRANDING;

export function getBrandingSnapshot(): BrandingDTO {
  return brandingSnapshot;
}

export function setBrandingSnapshot(branding: BrandingDTO): void {
  brandingSnapshot = branding;
}

// Product titles shipped with the app, one per locale, that are also the
// deployment defaults. A branding title equal to any of them means the
// deployment kept the built-in branding, so the localized copy in the
// message bundles is already correct and stays untouched.
export const DEFAULT_BRAND_TITLES: readonly string[] = ["CourseMate", "课知伴"];

export function isDefaultBrandTitle(brandTitle: string): boolean {
  return DEFAULT_BRAND_TITLES.includes(brandTitle);
}

export function replaceDefaultBrandTitle(value: string, brandTitle: string): string {
  if (isDefaultBrandTitle(brandTitle)) {
    return value;
  }
  return DEFAULT_BRAND_TITLES.reduce(
    (replaced, defaultTitle) => replaced.replaceAll(defaultTitle, () => brandTitle),
    value,
  );
}

// Falls back to the locale-specific built-in title until an operator sets a
// custom branding title for the deployment.
export function localizedBrandTitle(brandTitle: string, localizedDefault: string): string {
  return isDefaultBrandTitle(brandTitle) ? localizedDefault : brandTitle;
}
