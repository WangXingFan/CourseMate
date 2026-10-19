"use client";

import * as React from "react";

export function useLearningTimeZone() {
  const [zone, setZone] = React.useState("UTC");
  React.useEffect(() => { setZone(Intl.DateTimeFormat().resolvedOptions().timeZone); }, []);
  return zone;
}
