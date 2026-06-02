"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PressaoReclamacoesRow {
  territorio: string;
  territorio_curto: string;
  com_reclamacoes_repetidas: number;
}

interface ChartColors {
  grid: string;
  axis: string;
  tertiary: string;
}

interface DashboardPressaoReclamacoesCardProps {
  title: string;
  description?: string;
  data: PressaoReclamacoesRow[];
  colors: ChartColors;
}

export function DashboardPressaoReclamacoesCard({
  title,
  description,
  data,
  colors,
}: DashboardPressaoReclamacoesCardProps) {
  if (data.length === 0) return null;

  const maxReclamacoes = Math.max(
    ...data.map((row) => row.com_reclamacoes_repetidas),
    1,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              allowDecimals={false}
              domain={[0, maxReclamacoes]}
              tickCount={Math.min(maxReclamacoes + 1, 8)}
              tickFormatter={(value) => String(Math.round(Number(value)))}
              stroke={colors.axis}
              tick={{ fill: colors.axis, fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="territorio_curto"
              width={120}
              stroke={colors.axis}
              tick={{ fill: colors.axis, fontSize: 10 }}
            />
            <Bar
              dataKey="com_reclamacoes_repetidas"
              name="2+ reclamações"
              fill={colors.tertiary}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
