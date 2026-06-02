"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardData } from "@/lib/api-client";
import { PIC_RESOURCE_GUIDE } from "@/lib/pic-context";

function truncateLabel(value: string, max = 28): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

interface ChartColors {
  grid: string;
  axis: string;
  secondary: string;
}

export function DashboardCategoriaCard({
  data,
  colors,
}: {
  data: DashboardData;
  colors: ChartColors;
}) {
  const byCategoria = (data.by_categoria ?? []).map((c) => ({
    ...c,
    label: truncateLabel(c.categoria, 28),
  }));

  if (byCategoria.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipo de chamado</CardTitle>
        <p className="text-sm text-muted-foreground">{PIC_RESOURCE_GUIDE.categoria}</p>
      </CardHeader>
      <CardContent className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={byCategoria.slice(0, 10)}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
            <XAxis type="number" stroke={colors.axis} tick={{ fill: colors.axis, fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              stroke={colors.axis}
              tick={{ fill: colors.axis, fontSize: 10 }}
            />
            <Bar dataKey="total_chamados" fill={colors.secondary} name="Demandas" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
