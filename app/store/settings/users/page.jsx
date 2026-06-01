"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ManageStoreUsersRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/store/settings?tab=dashboardAccess&permissionsOnly=1");
  }, [router]);

  return null;
}
