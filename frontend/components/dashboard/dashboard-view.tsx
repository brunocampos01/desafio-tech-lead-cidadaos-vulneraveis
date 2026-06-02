"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardAllocationSection } from "@/components/dashboard/dashboard-allocation-section";
import { DashboardCategoriaCard } from "@/components/dashboard/dashboard-categoria-card";
import { PicDashboardGuide } from "@/components/dashboard/pic-dashboard-guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "@/lib/api-client";
import { PIC_RESOURCE_GUIDE, SECRETARIA_COLORS, SECRETARIA_LABELS } from "@/lib/pic-context";

function useChartColors() {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState({
    grid: "#e2e8f0",
    axis: "#64748b",
    primary: "#2563eb",
    secondary: "#16a34a",
    tertiary: "#ca8a04",
    quaternary: "#dc2626",
    tooltipBg: "#ffffff",
    tooltipFg: "#0f172a",
  });

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const hsl = (name: string) => `hsl(${styles.getPropertyValue(name).trim()})`;

    setColors({
      grid: hsl("--chart-grid"),
      axis: hsl("--chart-axis"),
      primary: hsl("--chart-primary"),
      secondary: hsl("--chart-secondary"),
      tertiary: "#ca8a04",
      quaternary: "#dc2626",
      tooltipBg: hsl("--card"),
      tooltipFg: hsl("--card-foreground"),
    });
  }, [resolvedTheme]);

  return colors;
}

const CHART_MARGIN = { top: 12, right: 16, left: 4, bottom: 36 };

function ChartYAxis({ stroke, tickFill }: { stroke: string; tickFill: string }) {
  return (
    <YAxis
      width={72}
      stroke={stroke}
      tick={{ fill: tickFill, fontSize: 11 }}
      tickMargin={6}
      tickFormatter={(value: number) => Number(value).toLocaleString("pt-BR")}
    />
  );
}

interface ChartTooltipColors {
  tooltipBg: string;
  tooltipFg: string;
  grid: string;
}

function ChartTooltipBox({
  colors,
  title,
  lines,
}: {
  colors: ChartTooltipColors;
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
      <p className="font-medium" style={{ color: colors.tooltipFg }}>
        {title}
      </p>
      {lines.map((line) => (
        <p key={line} style={{ color: colors.tooltipFg }}>
          {line}
        </p>
      ))}
    </div>
  );
}

function SecretariaTooltip({
  active,
  payload,
  label,
  colors,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string; payload?: { taxa_resolucao_prazo?: number | null } }>;
  label?: string;
  colors: ChartTooltipColors;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const total = Number(payload[0]?.value ?? 0);
  const taxa = row?.taxa_resolucao_prazo;
  const lines = [`Chamados: ${total.toLocaleString("pt-BR")}`];
  if (taxa != null) lines.push(`Taxa no prazo: ${taxa.toFixed(1)}%`);

  return <ChartTooltipBox colors={colors} title={String(label ?? "")} lines={lines} />;
}

function SlaPieTooltip({
  active,
  payload,
  colors,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number }>;
  colors: ChartTooltipColors;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = String(item?.name ?? "");
  const total = Number(item?.value ?? 0);

  return (
    <ChartTooltipBox
      colors={colors}
      title={name}
      lines={[`${total.toLocaleString("pt-BR")} chamados`]}
    />
  );
}

function VolumeChartTooltip({
  active,
  payload,
  label,
  colors,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number }>;
  label?: string;
  colors: ChartTooltipColors;
}) {
  if (!active || !payload?.length) return null;
  const lines = payload.map((p) => {
    const prefix = p.name ? `${p.name}: ` : "";
    return `${prefix}${Number(p.value ?? 0).toLocaleString("pt-BR")} chamados`;
  });
  return <ChartTooltipBox colors={colors} title={String(label ?? "")} lines={lines} />;
}

function TopTiposTooltip({
  active,
  payload,
  colors,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number; payload?: { tipo?: string; secretaria?: string } }>;
  colors: ChartTooltipColors;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const total = Number(payload[0]?.value ?? 0);
  const title =
    row?.tipo && row?.secretaria ? `${row.tipo} (${row.secretaria})` : String(row?.tipo ?? "");

  return (
    <ChartTooltipBox
      colors={colors}
      title={title}
      lines={[`${total.toLocaleString("pt-BR")} chamados`]}
    />
  );
}

function chartTooltipContent(colors: ChartTooltipColors) {
  function ChartTooltip(props: {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number }>;
    label?: string;
  }) {
    return (
      <VolumeChartTooltip
        active={props.active}
        payload={props.payload}
        label={props.label as string}
        colors={colors}
      />
    );
  }
  ChartTooltip.displayName = "ChartTooltip";
  return ChartTooltip;
}

function truncateLabel(value: string, max = 28): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export function DashboardView({ data }: { data: DashboardData }) {
  const colors = useChartColors();

  const temporal = data.temporal.map((t) => ({
    ...t,
    periodo: t.periodo.slice(0, 7),
  }));

  const bySecretariaChart = data.by_secretaria.map((s) => ({
    ...s,
    secretaria_label:
      SECRETARIA_LABELS[s.secretaria as keyof typeof SECRETARIA_LABELS] ?? s.secretaria,
  }));

  const slaChart = useMemo(() => {
    const s = data.sla_breakdown;
    if (!s) return [];
    return [
      { name: "No prazo", value: s.no_prazo, fill: colors.secondary },
      { name: "Fora do prazo", value: s.fora_prazo, fill: colors.quaternary },
      { name: "Fechado sem prazo", value: s.fechado_sem_prazo, fill: colors.tertiary },
      { name: "Em aberto", value: s.em_aberto, fill: colors.primary },
    ].filter((row) => row.value > 0);
  }, [data.sla_breakdown, colors]);

  const topTipos = data.top_tipos.map((t) => ({
    ...t,
    tipo_curto: truncateLabel(t.tipo),
  }));

  return (
    <div className="space-y-6">
      <PicDashboardGuide />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Demandas intersetoriais</CardTitle>
            <p className="text-sm text-muted-foreground">SMS · SME · SMAS</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.kpis.total_chamados.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Encerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.kpis.total_resolvidos.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>No prazo (PIC)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.kpis.taxa_resolucao_prazo.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tempo médio de resolução</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(data.kpis.tempo_medio_resolucao_dias ?? 0).toFixed(1)} dias
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demandas em aberto</CardTitle>
            <p className="text-sm text-muted-foreground">Acompanhamento intersetorial pendente</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.backlog.chamados_abertos.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Idade média (abertas)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(data.backlog.idade_media_aberto_dias ?? 0).toFixed(0)} dias
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle>Evolução intersetorial</CardTitle>
          <p className="text-sm text-muted-foreground">
            {PIC_RESOURCE_GUIDE.evolucaoIntersetorial.subtitle}
          </p>
          <p className="text-sm text-muted-foreground">
            {PIC_RESOURCE_GUIDE.evolucaoIntersetorial.encerrados}
          </p>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={temporal} margin={CHART_MARGIN}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="periodo" stroke={colors.axis} tick={{ fill: colors.axis }} />
              <ChartYAxis stroke={colors.axis} tickFill={colors.axis} />
              <Tooltip content={chartTooltipContent(colors)} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ color: colors.axis, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="total_chamados"
                stroke={colors.primary}
                name="Demandas"
                strokeWidth={2}
                dot={{ fill: colors.primary, stroke: "#fff", strokeWidth: 1, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="total_encerrados"
                stroke={colors.secondary}
                name="Encerrados"
                strokeWidth={2}
                dot={{ fill: colors.secondary, stroke: "#fff", strokeWidth: 1, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por secretaria intersetorial</CardTitle>
            <p className="text-sm text-muted-foreground">Volume e taxa no prazo por eixo PIC</p>
          </CardHeader>
          <CardContent className="flex h-80 flex-col">
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySecretariaChart} margin={CHART_MARGIN}>
                  <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="secretaria_label"
                    stroke={colors.axis}
                    tick={{ fill: colors.axis, fontSize: 10 }}
                  />
                  <ChartYAxis stroke={colors.axis} tickFill={colors.axis} />
                  <Tooltip
                    content={(props) => (
                      <SecretariaTooltip
                        active={props.active}
                        payload={
                          props.payload as Array<{
                            value?: number;
                            payload?: { taxa_resolucao_prazo?: number | null };
                          }>
                        }
                        label={props.label as string}
                        colors={colors}
                      />
                    )}
                  />
                  <Bar dataKey="total_chamados" name="Demandas">
                    {bySecretariaChart.map((row) => (
                      <Cell
                        key={row.secretaria}
                        fill={
                          SECRETARIA_COLORS[row.secretaria as keyof typeof SECRETARIA_COLORS] ??
                          "#94a3b8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Composição SLA (Acordo de Nível de Serviço)</CardTitle>
            <p className="text-sm text-muted-foreground">Recorte intersetorial (SMS · SME · SMAS)</p>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slaChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {slaChart.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <SlaPieTooltip
                      active={props.active}
                      payload={props.payload as Array<{ name?: string; value?: number }>}
                      colors={colors}
                    />
                  )}
                />
                <Legend wrapperStyle={{ color: colors.axis }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Principais tipos intersetoriais</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ex.: CadÚnico/SMAS, saúde, educação
            </p>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTipos} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                <XAxis type="number" stroke={colors.axis} tick={{ fill: colors.axis, fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="tipo_curto"
                  width={120}
                  stroke={colors.axis}
                  tick={{ fill: colors.axis, fontSize: 10 }}
                />
                <Tooltip
                  content={(props) => (
                    <TopTiposTooltip
                      active={props.active}
                      payload={
                        props.payload as Array<{
                          value?: number;
                          payload?: { tipo?: string; secretaria?: string };
                        }>
                      }
                      colors={colors}
                    />
                  )}
                />
                <Bar dataKey="total_chamados" name="Demandas">
                  {topTipos.map((row) => (
                    <Cell
                      key={row.tipo}
                      fill={
                        SECRETARIA_COLORS[row.secretaria as keyof typeof SECRETARIA_COLORS] ??
                        "#94a3b8"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <DashboardCategoriaCard data={data} colors={colors} />
      </div>

      <DashboardAllocationSection data={data} colors={colors} />

    </div>
  );
}
