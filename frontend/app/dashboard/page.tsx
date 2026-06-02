"use client";

import { DashboardContent } from "@/app/dashboard/dashboard-content";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
