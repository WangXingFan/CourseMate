import { Suspense } from "react";

import { KnowledgeCourse } from "@/features/learning";

export default function KnowledgePage() {
  return <Suspense><KnowledgeCourse /></Suspense>;
}
