import { Suspense } from "react";

import { MaterialDetailScreen } from "@/components/materials/material-detail";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <MaterialDetailScreen id={decodeURIComponent(id)} />
    </Suspense>
  );
}
