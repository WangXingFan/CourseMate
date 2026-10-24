import Script from "next/script";

const BANNER_SCRIPT = `
(() => {
  const key = "__COURSEMATE_DEVTOOLS_BANNER__";
  if (globalThis[key]) return;
  globalThis[key] = true;
  console.log("%c课知伴", "color:#087f8c;font-family:ui-monospace,monospace;font-size:20px;font-weight:700");
  console.log("Repository: https://github.com/WangXingFan/CourseMate | License: Apache License 2.0 | Third-party notices: https://github.com/WangXingFan/CourseMate/blob/main/NOTICE");
})();
`;

export function DevtoolsBrandBanner() {
  return (
    <Script id="coursemate-devtools-brand" strategy="afterInteractive">
      {BANNER_SCRIPT}
    </Script>
  );
}
