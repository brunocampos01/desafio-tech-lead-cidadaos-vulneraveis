"use client";

import { useMemo } from "react";

import {
  DashboardAtrasosPorSecretariaCard,
  type TerritorioAtrasoRow,
} from "@/components/dashboard/dashboard-atrasos-por-secretaria-card";
import { DashboardPressaoReclamacoesCard } from "@/components/dashboard/dashboard-pressao-reclamacoes-card";
import {
  TerritorialDelaysChart,
  TerritorialSecretariaStackChart,
  type TerritorialDelayPoint,
} from "@/components/dashboard/dashboard-territorial-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "@/lib/api-client";
import { PIC_RESOURCE_GUIDE } from "@/lib/pic-context";

const CHART_MARGIN = { top: 12, right: 16, left: 4, bottom: 36 };
const SUBPREF_TOP_N = 10;
const TERRITORIAL_STACK_TOP_N = 20;

function truncateLabel(value: string, max = 24): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

interface ChartColors {
  grid: string;
  axis: string;
  primary: string;
  secondary: string;
  tertiary: string;
  tooltipBg: string;
  tooltipFg: string;
}

function TooltipBox({
  colors,
  title,
  lines,
}: {
  colors: ChartColors;
  title: string;
  lines: string[];
}) {
  return (
    <div
      className="rounded-md border px-3 py-2 text-sm shadow-md"
      style={{
        backgroundColor: colors.tooltipBg,
        borderColor: colors.grid,
        color: colors.tooltipFg,
      }}
    >
      <p className="font-medium">{title}</p>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function buildWorstPrazoChartData(
  rows: Array<{
    territorio: string;
    total_chamados: number;
    taxa_resolucao_prazo: number | null;
  }>,
  topN: number,
): TerritorialDelayPoint[] {
  return [...rows]
    .filter((r) => r.taxa_resolucao_prazo != null)
    .sort(
      (a, b) =>
        Number(a.taxa_resolucao_prazo ?? Infinity) - Number(b.taxa_resolucao_prazo ?? Infinity),
    )
    .slice(0, topN)
    .map((r) => ({
      territorio: r.territorio,
      territorio_curto: truncateLabel(r.territorio, 30),
      total_chamados: r.total_chamados,
      taxa_resolucao_prazo: Number(r.taxa_resolucao_prazo),
    }));
}

function pivotSecretaria<T extends { secretaria: string; total_chamados: number }>(
  rows: T[],
  keyField: keyof T,
): Array<Record<string, string | number>> {
  const byKey = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    const key = String(row[keyField]);
    const entry = byKey.get(key) ?? { label: truncateLabel(key, 20), territorio: key };
    entry[row.secretaria] = row.total_chamados;
    byKey.set(key, entry);
  }
  return Array.from(byKey.values()).sort(
    (a, b) =>
      Number(b.SMS ?? 0) + Number(b.SME ?? 0) + Number(b.SMAS ?? 0) -
      (Number(a.SMS ?? 0) + Number(a.SME ?? 0) + Number(a.SMAS ?? 0)),
  );
}

function topTerritoriesByVolume(
  pivoted: Array<Record<string, string | number>>,
  topN: number,
): Array<Record<string, string | number>> {
  const volume = (row: Record<string, string | number>) =>
    Number(row.SMS ?? 0) + Number(row.SME ?? 0) + Number(row.SMAS ?? 0);
  return [...pivoted].sort((a, b) => volume(b) - volume(a)).slice(0, topN);
}

export function DashboardAllocationSection({
  data,
  colors,
}: {
  data: DashboardData;
  colors: ChartColors;
}) {
  const bySubpref = useMemo(
    () => buildWorstPrazoChartData(data.by_subprefeitura ?? [], SUBPREF_TOP_N),
    [data.by_subprefeitura],
  );

  const byRegiaoAtrasos = useMemo(
    () => buildWorstPrazoChartData(data.by_regiao_atrasos ?? [], SUBPREF_TOP_N),
    [data.by_regiao_atrasos],
  );

  const subprefStack = useMemo(() => {
    const pivoted = pivotSecretaria(data.subprefeitura_x_secretaria ?? [], "subprefeitura");
    return topTerritoriesByVolume(pivoted, TERRITORIAL_STACK_TOP_N);
  }, [data.subprefeitura_x_secretaria]);

  const regiaoStackVol = useMemo(() => {
    const pivoted = pivotSecretaria(data.regiao_x_secretaria_vol ?? [], "regiao");
    return topTerritoriesByVolume(pivoted, TERRITORIAL_STACK_TOP_N);
  }, [data.regiao_x_secretaria_vol]);

  const atrasosSubprefRows = useMemo<TerritorioAtrasoRow[]>(() => {
    const orgaosByKey = new Map<string, Array<{ orgao: string; pct_do_atraso: number }>>();
    for (const o of data.atrasos_subpref_orgao ?? []) {
      const key = `${o.secretaria}|${o.subprefeitura}`;
      const list = orgaosByKey.get(key) ?? [];
      list.push({ orgao: o.orgao, pct_do_atraso: Number(o.pct_do_atraso) });
      orgaosByKey.set(key, list);
    }
    return (data.atrasos_subpref_por_secretaria ?? []).map((row) => ({
      territorio: row.subprefeitura,
      secretaria: row.secretaria,
      chamados_atrasados: Number(row.chamados_atrasados ?? 0),
      taxa_resolucao_prazo: Number(row.taxa_resolucao_prazo ?? 0),
      top_orgaos: orgaosByKey.get(`${row.secretaria}|${row.subprefeitura}`),
    }));
  }, [data.atrasos_subpref_por_secretaria, data.atrasos_subpref_orgao]);

  const atrasosRegiaoRows = useMemo<TerritorioAtrasoRow[]>(() => {
    const orgaosByKey = new Map<string, Array<{ orgao: string; pct_do_atraso: number }>>();
    for (const o of data.atrasos_regiao_orgao ?? []) {
      const key = `${o.secretaria}|${o.regiao}`;
      const list = orgaosByKey.get(key) ?? [];
      list.push({ orgao: o.orgao, pct_do_atraso: Number(o.pct_do_atraso) });
      orgaosByKey.set(key, list);
    }
    return (data.atrasos_regiao_por_secretaria ?? []).map((row) => ({
      territorio: row.regiao,
      secretaria: row.secretaria,
      chamados_atrasados: Number(row.chamados_atrasados ?? 0),
      taxa_resolucao_prazo: Number(row.taxa_resolucao_prazo ?? 0),
      top_orgaos: orgaosByKey.get(`${row.secretaria}|${row.regiao}`),
    }));
  }, [data.atrasos_regiao_por_secretaria, data.atrasos_regiao_orgao]);

  const pressao = (data.pressao_reclamacoes ?? []).map((p) => ({
    ...p,
    territorio_curto: truncateLabel(p.territorio, 22),
  }));

  const pressaoSubpref = (data.pressao_reclamacoes_subpref ?? []).map((p) => ({
    ...p,
    territorio_curto: truncateLabel(p.territorio, 22),
  }));

  const hasAllocationContent =
    bySubpref.length > 0 ||
    byRegiaoAtrasos.length > 0 ||
    atrasosSubprefRows.length > 0 ||
    atrasosRegiaoRows.length > 0 ||
    subprefStack.length > 0 ||
    regiaoStackVol.length > 0 ||
    pressao.length > 0 ||
    pressaoSubpref.length > 0;

  if (!hasAllocationContent) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{PIC_RESOURCE_GUIDE.titulo}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{PIC_RESOURCE_GUIDE.intro}</p>
      </div>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Subprefeituras</h3>
        <TerritorialSecretariaStackChart
          title="Total de chamados por secretaria em cada subprefeitura"
          data={subprefStack}
          colors={colors}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <TerritorialDelaysChart
            title="Subprefeituras com mais atrasos em chamados"
            data={bySubpref}
            colors={colors}
          />
          <DashboardPressaoReclamacoesCard
            title="Pressão por reclamações (Subprefeituras)"
            data={pressaoSubpref}
            colors={colors}
          />
        </div>
        <DashboardAtrasosPorSecretariaCard
          title="Secretarias e subprefeituras com mais atrasos em chamados"
          guide={PIC_RESOURCE_GUIDE.atrasosSubpref}
          rows={atrasosSubprefRows}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Regiões administrativas</h3>
        <TerritorialSecretariaStackChart
          title="Total de chamados por secretaria em cada região administrativa"
          data={regiaoStackVol}
          colors={colors}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <TerritorialDelaysChart
            title="Regiões administrativas com mais atrasos em chamados"
            data={byRegiaoAtrasos}
            colors={colors}
          />
          <DashboardPressaoReclamacoesCard
            title="Pressão por reclamações (região)"
            description={PIC_RESOURCE_GUIDE.reclamacoes}
            data={pressao}
            colors={colors}
          />
        </div>
        <DashboardAtrasosPorSecretariaCard
          title="Secretarias e regiões administrativas com mais atrasos em chamados"
          guide={PIC_RESOURCE_GUIDE.atrasosRegiao}
          rows={atrasosRegiaoRows}
        />
      </section>
    </div>
  );
}
