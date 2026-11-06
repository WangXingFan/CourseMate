"use client";

import { StreamdownRender } from "@/shared/components/markdown/streamdown-render";
import { normalizeQuestionMath } from "@/shared/lib/question-math";
import { cn } from "@/lib/utils";

export function QuestionContent({ content, className }: { content: string; className?: string }) {
  return <StreamdownRender content={normalizeQuestionMath(content)} className={cn("text-base leading-7 [&_.chat-font-content]:[font-size:inherit] [&_.chat-font-content]:[line-height:inherit] [&_.chat-font-content]:text-inherit", className)} />;
}
