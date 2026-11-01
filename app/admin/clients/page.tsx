import { Suspense } from "react";

import { ClientsScreen } from "@/components/clients/clients-screen";

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsScreen />
    </Suspense>
  );
}
