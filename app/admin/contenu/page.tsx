import { Suspense } from "react";

import { ContentEditor } from "@/components/content/content-editor";

export default function ContenuPage() {
  return (
    <Suspense>
      <ContentEditor />
    </Suspense>
  );
}
