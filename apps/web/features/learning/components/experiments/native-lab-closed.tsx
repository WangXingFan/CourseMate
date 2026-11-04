"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SpinnerLabel } from "@/components/ui/spinner";

export function NativeLabClosed({ loading, error, refresh }: { loading: boolean; error: boolean; refresh: () => void }) {
  const t = useTranslations("learning.virtualLab");
  return <section className="space-y-5 py-12" data-lab-closed>
    <p role="status" className="text-base leading-7">{error ? t("access.failed") : loading ? <SpinnerLabel>{t("access.checking")}</SpinnerLabel> : t("access.closed")}</p>
    <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={refresh}>{t("access.refresh")}</Button><Button asChild variant="ghost"><Link href="/learn/experiments">{t("back")}</Link></Button></div>
  </section>;
}
