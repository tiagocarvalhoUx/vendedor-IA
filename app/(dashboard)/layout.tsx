import { DashboardShell } from "@/components/layout/dashboard-shell";

// Shell do painel (mobile-first). O sino de notificações se alimenta sozinho
// via /api/notificacoes (polling), então o layout não precisa buscar dados.
export default function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
