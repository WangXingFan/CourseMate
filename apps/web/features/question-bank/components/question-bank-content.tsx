"use client";

import { ArrowLeft, ArrowRight, RotateCcw, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuestionBank } from "@/features/question-bank/hooks/use-question-bank";
import { cn } from "@/lib/utils";
import { QuestionBankQuestion } from "./shared/question-bank-question";

export function QuestionBankContent({ accessToken, embedded }: { accessToken: string; embedded: boolean }) {
  const t = useTranslations("learningLabs.questionBank");
  const model = useQuestionBank(accessToken);
  const total = model.categories.reduce((sum, category) => sum+category.count, 0);
  const pages = Math.max(1, Math.ceil((model.data?.total ?? 0)/20));
  return <div className={cn("min-h-0 min-w-0 bg-background", !embedded && "h-full flex-1 overflow-y-auto")}>
    <div className={cn("mx-auto w-full min-w-0", embedded ? "pb-12" : "max-w-6xl px-5 py-8 md:px-10 md:py-10")}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <h1 className="font-display text-3xl font-normal tracking-[-0.015em] md:text-4xl">{t("title")}</h1>
        {model.categories.length > 0 && <span className="font-mono text-sm tabular-nums">{t("total", { count: total })}</span>}
      </header>
      <div className={cn("grid min-w-0 items-start gap-7", embedded ? "2xl:grid-cols-[12rem_minmax(0,1fr)]" : "lg:grid-cols-[13rem_minmax(0,1fr)]")}>
        <aside className="min-w-0">
          <label htmlFor="question-bank-category" className="mb-2 block text-sm font-medium">{t("category")}</label>
          <select id="question-bank-category" value={model.category} onChange={(event) => model.selectCategory(event.target.value)} className={cn("h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm", embedded ? "2xl:hidden" : "lg:hidden")}>
            <option value="">{t("all")} ({total})</option>
            {model.categories.map((category) => <option key={category.id} value={category.id}>{t(`categories.${category.id}`)} ({category.count})</option>)}
          </select>
          <nav aria-label={t("category")} className={cn("hidden space-y-1", embedded ? "2xl:block" : "lg:block")}>
            {[{ id: "", count: total }, ...model.categories].map((category) => <button key={category.id} type="button" aria-pressed={model.category === category.id} onClick={() => model.selectCategory(category.id)} className={cn("flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", model.category === category.id ? "bg-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}>
              <span>{category.id ? t(`categories.${category.id}`) : t("all")}</span><span className="font-mono text-xs tabular-nums">{category.count}</span>
            </button>)}
          </nav>
        </aside>
        <main className="min-w-0">
          <label htmlFor="question-bank-search" className="mb-2 flex items-center gap-2 text-sm font-medium"><Search className="size-4" strokeWidth={1.6} aria-hidden />{t("search")}</label>
          <div className="flex gap-2">
            <Input id="question-bank-search" type="search" maxLength={200} value={model.query} onChange={(event) => model.search(event.target.value)} placeholder={t("searchPlaceholder")} className="min-w-0 flex-1" />
            {model.query && <Button variant="outline" size="icon" aria-label={t("clear")} onClick={() => model.search("")}><X className="size-4" aria-hidden /></Button>}
          </div>
          <div className="mt-5 flex min-h-8 items-center justify-between gap-3 border-b border-border pb-3 text-sm" aria-live="polite">
            <span>{model.loading ? t("loading") : model.data ? t("results", { count: model.data.total }) : t("loadFailed")}</span>
            {model.data && model.data.total > 0 && <span className="font-mono text-xs tabular-nums">{t("page", { page: model.page, pages })}</span>}
          </div>
          {model.error ? <div role="alert" className="space-y-4 py-10"><p className="text-sm text-destructive">{model.error}</p><Button variant="outline" onClick={model.retry}><RotateCcw className="size-4" aria-hidden />{t("retry")}</Button></div> : model.loading ? <div role="status" className="py-14 text-sm text-muted-foreground">{t("loading")}</div> : model.data?.questions.length ? <div className="divide-y divide-border">
            {model.data.questions.map((question, index) => <QuestionBankQuestion key={`${model.page}:${model.category}:${question.id}`} question={question} number={(model.page-1)*20+index+1} initiallyOpen={index === 0} />)}
          </div> : <div className="space-y-4 py-14"><p className="font-display text-xl">{t("empty")}</p><Button variant="outline" onClick={() => { model.search(""); model.selectCategory(""); }}>{t("reset")}</Button></div>}
          {model.data && model.data.total > 20 && <nav aria-label={t("pagination")} className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
            <Button variant="outline" disabled={model.page <= 1} onClick={() => model.setPage(model.page-1)}><ArrowLeft className="size-4" aria-hidden />{t("previous")}</Button>
            <span className="font-mono text-sm tabular-nums">{model.page} / {pages}</span>
            <Button variant="outline" disabled={model.page >= pages} onClick={() => model.setPage(model.page+1)}>{t("next")}<ArrowRight className="size-4" aria-hidden /></Button>
          </nav>}
        </main>
      </div>
    </div>
  </div>;
}
