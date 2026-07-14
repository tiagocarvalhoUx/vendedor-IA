import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  MessagesSquare,
  KanbanSquare,
  BookOpen,
  Inbox,
  Bot,
} from "lucide-react";
import type { Route } from "next";

export interface ItemNav {
  readonly href: Route;
  readonly rotulo: string;
  readonly Icone: LucideIcon;
}

/** Navegação do painel do operador ("fiscal de robôs"). */
export const NAV: readonly ItemNav[] = [
  { href: "/overview", rotulo: "Visão geral", Icone: LayoutDashboard },
  { href: "/carteira", rotulo: "Carteira", Icone: Wallet },
  { href: "/conversas", rotulo: "Conversas", Icone: MessagesSquare },
  { href: "/pedidos", rotulo: "Pedidos", Icone: KanbanSquare },
  { href: "/base-conhecimento", rotulo: "Base de conhecimento", Icone: BookOpen },
  { href: "/escalonamentos", rotulo: "Escalonamentos", Icone: Inbox },
  { href: "/vendedores", rotulo: "Vendedores IA", Icone: Bot },
];
