import { redirect } from "next/navigation";

// A raiz redireciona para o overview do painel do operador.
export default function HomePage(): never {
  redirect("/overview");
}
