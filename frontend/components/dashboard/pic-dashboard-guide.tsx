import { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PIC_BANNER,
  PIC_DATA_NOTE,
  PIC_EIXOS,
  PIC_INSIGHTS_EXEMPLOS,
  PIC_KPI_GUIDE,
  SECRETARIA_COLORS,
} from "@/lib/pic-context";

function GuideSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-md border border-border/80 bg-background/60"
      open={defaultOpen}
    >
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground transition group-open:rotate-90">▸</span>
          {title}
        </span>
      </summary>
      <div className="space-y-3 border-t border-border/80 px-3 py-3 text-sm text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

export function PicDashboardGuide() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle>{PIC_BANNER.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{PIC_BANNER.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{PIC_DATA_NOTE}</p>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Eixos intersetoriais</h3>
          <ul className="space-y-3">
            {PIC_EIXOS.map((eixo) => (
              <li
                key={eixo.secretaria}
                className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SECRETARIA_COLORS[eixo.secretaria] }}
                    aria-hidden
                  />
                  {eixo.label}
                </p>
                <p className="mt-1 text-muted-foreground">{eixo.foco}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">Exemplos no 1746: </span>
                  {eixo.exemplos}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <GuideSection title="Indicadores (KPIs)">
          <ul className="space-y-3">
            {PIC_KPI_GUIDE.map((item) => (
              <li key={item.titulo}>
                <p className="font-medium text-foreground">{item.titulo}</p>
                <p className="mt-0.5">{item.leitura}</p>
                <p className="mt-1 text-xs">
                  <span className="font-medium text-foreground/80">Insight: </span>
                  {item.insight}
                </p>
              </li>
            ))}
          </ul>
        </GuideSection>

        <GuideSection title="Exemplos de análises para o gestor">
          <ul className="space-y-4">
            {PIC_INSIGHTS_EXEMPLOS.map((exemplo) => (
              <li
                key={exemplo.hipotese}
                className="rounded-md border border-border/60 bg-background/50 px-3 py-2"
              >
                <p className="text-foreground">{exemplo.hipotese}</p>
                {exemplo.filtros?.length ? (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-foreground/80">Filtragem sugerida</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                      {exemplo.filtros.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs">
            Aplique os filtros na barra acima do painel (secretaria, tipo, datas, busca). A página{" "}
            <strong className="text-foreground">Chamados</strong> exporta os dados filtrados em CSV.
          </p>
        </GuideSection>
      </CardContent>
    </Card>
  );
}
