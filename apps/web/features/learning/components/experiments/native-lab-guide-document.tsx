"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { createElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

type GuideNode = { text: string } | { tag: string; id?: string; className?: string; href?: string; target?: string; open?: boolean; children: GuideNode[] };
const tags = new Set(["header", "section", "div", "nav", "footer", "h1", "h2", "h3", "h4", "p", "a", "details", "summary", "span", "small", "strong", "b", "em", "i", "ol", "ul", "li", "table", "thead", "tbody", "tr", "th", "td", "code", "pre", "br", "hr"]);
function parseGuide(html: string): GuideNode[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const visit = (node: Node): GuideNode[] => {
    if (node.nodeType === Node.TEXT_NODE) return [{ text: node.textContent || "" }];
    if (!(node instanceof Element)) return [];
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "iframe", "object", "embed", "form", "input", "button", "svg"].includes(tag)) return [];
    const children = [...node.childNodes].flatMap(visit);
    if (!tags.has(tag)) return children;
    const rawHref = node.getAttribute("href") ?? "";
    const href = /^(#[a-zA-Z0-9_-]+|\/learn\/experiments(?:\/workspace)?(?:#(?:home|course\/L[123]|task\/L[123]-[1-4]|records\/L[123]))?)$/.test(rawHref) ? rawHref : undefined;
    return [{ tag, children, id: node.id || undefined, className: node.className.split(/\s+/).filter(Boolean).map((item) => `native-guide-${item}`).join(" "), href: tag === "a" ? href : undefined, target: tag === "a" && href && node.getAttribute("target") === "_blank" ? "_blank" : undefined, open: tag === "details" && node.hasAttribute("open") }];
  };
  return [...(document.querySelector("main") ?? document.body).childNodes].flatMap(visit);
}
function renderNodes(nodes: GuideNode[], print = false): React.ReactNode {
  return nodes.map((node, index) => "text" in node ? node.text : createElement(node.tag, { key: `${node.tag}-${node.id ?? index}`, id: node.id, className: node.className, href: node.href, target: node.target, rel: node.target ? "noopener noreferrer" : undefined, open: node.tag === "details" ? print || node.open : undefined }, ...((node.tag === "br" || node.tag === "hr") ? [] : [renderNodes(node.children, print)])));
}

export function NativeLabGuideDocument({ html }: { html: string }) {
  const t = useTranslations("learning.virtualLab.native");
  const [nodes, setNodes] = useState<GuideNode[] | null>(null);
  const [printing, setPrinting] = useState(false);
  useEffect(() => { setNodes(parseGuide(html)); }, [html]);
  useEffect(() => {
    if (!printing) return;
    document.body.dataset.labReport = "true";
    const finish = () => setPrinting(false);
    window.addEventListener("afterprint", finish);
    const frame = requestAnimationFrame(() => window.print());
    return () => { cancelAnimationFrame(frame); delete document.body.dataset.labReport; window.removeEventListener("afterprint", finish); };
  }, [printing]);
  return <>
    <div className="mb-5 flex justify-end"><Button variant="outline" size="sm" onClick={() => setPrinting(true)} disabled={!nodes}><Printer aria-hidden className="size-3.5" />{t("print")}</Button></div>
    <article data-native-guide className="space-y-6 text-xs leading-7 text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_details]:my-3 [&_details]:rounded-xl [&_details]:border [&_details]:border-border/60 [&_details]:bg-card [&_details]:p-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-medium [&_h3]:my-3 [&_h3]:font-medium [&_li]:my-2 [&_nav]:flex [&_nav]:flex-wrap [&_nav]:gap-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_small]:ml-3 [&_small]:text-muted-foreground [&_summary]:cursor-pointer [&_summary]:font-medium [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-3 [&_th]:border [&_th]:border-border [&_th]:p-3 [&_ul]:list-disc [&_ul]:pl-5">{nodes && renderNodes(nodes)}</article>
    {printing && nodes && createPortal(<article className="native-lab-print">{renderNodes(nodes, true)}</article>, document.body)}
  </>;
}
