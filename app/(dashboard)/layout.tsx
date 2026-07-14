import { DashboardShell } from "@/components/layout/dashboard-shell";
import { obterResumoOverview } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Shell do painel (mobile-first). Alimenta o sino com escalonamentos abertos.
export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { escalonamentosAbertos } = await obterResumoOverview();
  return (
    <DashboardShell escalonamentosAbertos={escalonamentosAbertos}>
      {children}
    </DashboardShell>
  );
}
