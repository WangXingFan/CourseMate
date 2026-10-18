"use client";

import * as React from "react";

import { createDailySeed, createRandomSeed } from "@/features/learning/model/lab-random";

export function useLearningLabSeed() {
  const [seed, setSeed] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSeed(`${createDailySeed()}-${createRandomSeed()}`);
  }, []);

  const nextSeed = React.useCallback(() => {
    setSeed(createRandomSeed());
  }, []);

  return { seed, nextSeed };
}
