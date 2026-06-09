"use client";

import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PIC_SECRETARIAS,
  SECRETARIA_COLORS,
  SECRETARIA_LABELS,
  type PicSecretaria,
} from "@/lib/pic-context";

export interface OrgaoAtrasoShare {
  orgao: string;
  pct_do_atraso: number;
}

export interface TerritorioAtrasoRow {
  territorio: string;
  secretaria: string;
  chamados_atrasados: number;
  taxa_resolucao_prazo: number;
  top_orgaos?: OrgaoAtrasoShare[];
}

function truncateOrgao(value: string, max = 36): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function taxaBadgeClass(taxa: number): string {
  if (taxa < 88) return "bg-red-500/15 text-red-400";
  if (taxa < 92) return "bg-amber-500/15 text-amber-400";
  return "bg-emerald-500/15 text-emerald-400";
}

export interface AtrasosTerritorioGuide {
  intro: string;
  bullets?: readonly string[];
  orgaoLabel?: string;
}

export function DashboardAtrasosPorSecretariaCard({
  title,
  guide,
  rows,
}: {
  title: string;
  guide?: AtrasosTerritorioGuide;
  rows: TerritorioAtrasoRow[];
}) {
  const porSecretaria = useMemo(() => {
    const grouped = new Map<PicSecretaria, TerritorioAtrasoRow[]>();
    for (const sec of PIC_SECRETARIAS) grouped.set(sec, []);

    for (const row of rows) {
      if (!PIC_SECRETARIAS.includes(row.secretaria as PicSecretaria)) continue;
      const list = grouped.get(row.secretaria as PicSecretaria)!;
      list.push({
        territorio: row.territorio,
        secretaria: row.secretaria,
        chamados_atrasados: Number(row.chamados_atrasados ?? 0),
        taxa_resolucao_prazo: Number(row.taxa_resolucao_prazo ?? 0),
        top_orgaos: row.top_orgaos,
      });
    }

    return PIC_SECRETARIAS.map((secretaria) => ({
      secretaria,
      label: SECRETARIA_LABELS[secretaria],
      color: SECRETARIA_COLORS[secretaria],
      items: grouped.get(secretaria) ?? [],
    }));
  }, [rows]);

  const hasRows = porSecretaria.some((s) => s.items.length > 0);
  if (!hasRows) return null;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="space-y-2">
        <CardTitle>{title}</CardTitle>
        {guide ? (
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>{guide.intro}</p>
            {guide.bullets && guide.bullets.length > 0 ? (
              <ul className="list-inside list-disc space-y-0.5 text-xs">
                {guide.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {porSecretaria.map(({ secretaria, label, color, items }) => (
            <div
              key={secretaria}
              className="rounded-lg border border-border/80 bg-muted/20 p-4"
            >
              <h3 className="mb-3 text-sm font-semibold" style={{ color }}>
                {label}
              </h3>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados no filtro.</p>
              ) : (
                <ol className="space-y-3">
                  {items.map((row, index) => (
                    <li
                      key={`${row.secretaria}-${row.territorio}`}
                      className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {index + 1}º
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${taxaBadgeClass(row.taxa_resolucao_prazo)}`}
                        >
                          {row.taxa_resolucao_prazo.toFixed(1)}% no prazo
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium leading-snug">{row.territorio}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.chamados_atrasados.toLocaleString("pt-BR")} chamados atrasados
                      </p>
                      {row.chamados_atrasados > 0 && (row.top_orgaos?.length ?? 0) > 0 ? (
                        <div className="mt-1.5 border-t border-border/50 pt-1.5">
                          {guide?.orgaoLabel ? (
                            <p className="mb-1 text-[10px] text-muted-foreground">
                              {guide.orgaoLabel}
                            </p>
                          ) : null}
                          <ul className="space-y-0.5">
                          {row.top_orgaos!.map((orgao) => (
                            <li
                              key={`${row.territorio}-${orgao.orgao}`}
                              className="text-[11px] leading-snug text-muted-foreground"
                            >
                              <span className="text-foreground/80">
                                {truncateOrgao(orgao.orgao)}
                              </span>
                              {" — "}
                              {orgao.pct_do_atraso.toLocaleString("pt-BR", {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                              %
                            </li>
                          ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
