"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SECRETARIA_COLORS, SECRETARIA_LABELS } from "@/lib/pic-context";

interface ChartColors {
  grid: string;
  axis: string;
  primary: string;
  secondary: string;
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

export interface TerritorialDelayPoint {
  territorio: string;
  territorio_curto: string;
  total_chamados: number;
  taxa_resolucao_prazo: number;
}

export function TerritorialDelaysChart({
  title,
  data,
  colors,
}: {
  title: string;
  data: TerritorialDelayPoint[];
  colors: ChartColors;
}) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[26rem]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 48, left: 4, bottom: 72 }}
            barCategoryGap="20%"
          >
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="territorio_curto"
              stroke={colors.axis}
              tick={{ fill: colors.axis, fontSize: 9 }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={72}
            />
            <YAxis
              yAxisId="volume"
              stroke={colors.axis}
              tick={{ fill: colors.axis, fontSize: 11 }}
              tickFormatter={(v: number) => Number(v).toLocaleString("pt-BR")}
              width={56}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              domain={[0, 100]}
              stroke={colors.secondary}
              tick={{ fill: colors.secondary, fontSize: 10 }}
              tickFormatter={(v: number) => `${v}%`}
              width={44}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as TerritorialDelayPoint;
                const total =
                  payload.find((p) => p.dataKey === "total_chamados")?.value ?? row?.total_chamados;
                const taxa =
                  payload.find((p) => p.dataKey === "taxa_resolucao_prazo")?.value ??
                  row?.taxa_resolucao_prazo;
                return (
                  <TooltipBox
                    colors={colors}
                    title={String(row?.territorio ?? "")}
                    lines={[
                      `Total de chamados: ${Number(total ?? 0).toLocaleString("pt-BR")}`,
                      `No prazo (PIC): ${Number(taxa ?? 0).toFixed(1)}%`,
                    ]}
                  />
                );
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ color: colors.axis, fontSize: 11, paddingTop: 4 }}
            />
            <Bar
              yAxisId="volume"
              dataKey="total_chamados"
              name="Total de chamados"
              fill={colors.primary}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="taxa_resolucao_prazo"
              name="No prazo (PIC)"
              stroke={colors.secondary}
              strokeWidth={2}
              dot={{ fill: colors.secondary, stroke: "#fff", strokeWidth: 1, r: 5 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

const STACK_MARGIN = { top: 12, right: 16, left: 4, bottom: 36 };

export function TerritorialSecretariaStackChart({
  title,
  data,
  colors,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  colors: ChartColors;
}) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={STACK_MARGIN}>
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke={colors.axis}
              tick={{ fill: colors.axis, fontSize: 9 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={70}
            />
            <YAxis
              stroke={colors.axis}
              tick={{ fill: colors.axis, fontSize: 11 }}
              tickFormatter={(v: number) => Number(v).toLocaleString("pt-BR")}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const lines = payload.map(
                  (p) =>
                    `${SECRETARIA_LABELS[p.name as keyof typeof SECRETARIA_LABELS] ?? p.name}: ${Number(p.value ?? 0).toLocaleString("pt-BR")}`,
                );
                return <TooltipBox colors={colors} title={String(label ?? "")} lines={lines} />;
              }}
            />
            <Legend wrapperStyle={{ color: colors.axis, fontSize: 11 }} />
            <Bar dataKey="SMS" stackId="a" fill={SECRETARIA_COLORS.SMS} name="SMS" />
            <Bar dataKey="SME" stackId="a" fill={SECRETARIA_COLORS.SME} name="SME" />
            <Bar dataKey="SMAS" stackId="a" fill={SECRETARIA_COLORS.SMAS} name="SMAS" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
