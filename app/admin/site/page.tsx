import { Suspense } from "react";

import { SiteScreen } from "@/components/site/site-screen";

export default function SitePage() {
  return (
    <Suspense>
      <SiteScreen />
    </Suspense>
  );
}
