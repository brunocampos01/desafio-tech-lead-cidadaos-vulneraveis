import { DataMeta } from "@/lib/api-client";

export function formatDataMeta(meta: DataMeta | null | undefined): string | null {
  if (!meta?.atualizado_em) return null;

  const d = new Date(meta.atualizado_em);
  if (Number.isNaN(d.getTime())) return null;

  return `Dados atualizado em ${d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
}
