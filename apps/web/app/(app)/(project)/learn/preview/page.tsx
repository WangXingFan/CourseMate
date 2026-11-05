import { Suspense } from "react";

import { KnowledgeCourse } from "@/features/learning";

export default function PreviewPage() {
  return <Suspense><KnowledgeCourse preview /></Suspense>;
}
