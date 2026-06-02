/** Programa Pequenos Cariocas — contexto de produto (UI). */

export const PIC_SECRETARIAS = ["SMS", "SME", "SMAS"] as const;

export type PicSecretaria = (typeof PIC_SECRETARIAS)[number];

export const SECRETARIA_LABELS: Record<PicSecretaria, string> = {
  SMS: "Saúde (SMS)",
  SME: "Educação (SME)",
  SMAS: "Assistência Social (SMAS)",
};

export const PIC_BANNER = {
  title: "Programa Pequenos Cariocas",
  subtitle:
    "Rede intersetorial para crianças de 0 a 6 anos e gestantes em vulnerabilidade, com o Cartão da Primeira Infância Carioca (R$ 200/mês, seleção via CadÚnico).",
};

export const PIC_EIXOS = [
  {
    secretaria: "SMS" as const,
    label: "Saúde (SMS)",
    foco: "Pré-natal, vacinação, postos e programas de saúde da criança e da gestante.",
    exemplos: "Vacinação, Posto de Saúde, Clínicas da Família, Programas de Saúde.",
  },
  {
    secretaria: "SME" as const,
    label: "Educação (SME)",
    foco: "Acesso e permanência na rede municipal — creche, escola e gestão escolar.",
    exemplos: "Creche, Escola, Educação, Gestão escolar.",
  },
  {
    secretaria: "SMAS" as const,
    label: "Assistência Social (SMAS)",
    foco: "Proteção social e benefícios — CadÚnico é o principal proxy do CPIC no dado público.",
    exemplos: "Cadastro Único, Assistência Social, CRAS/CREAS.",
  },
] as const;

export const PIC_DATA_NOTE =
  "Neste desafio, demandas do 1746 mapeadas para SMS, SME e SMAS substituem registros sensíveis de beneficiários. O painel mostra só esse recorte intersetorial — não inclui infraestrutura urbana (iluminação, buracos, trânsito etc.).";

export const PIC_KPI_GUIDE = [
  {
    titulo: "Demandas intersetoriais",
    leitura:
      "Volume total de chamados no recorte PIC. Use como linha de base antes de filtrar por secretaria, tipo ou período.",
    insight: "Crescimento sustentado pode indicar maior procura pelos serviços ou mudança no mapeamento de tipos.",
  },
  {
    titulo: "Encerradas",
    leitura: "Chamados com data de encerramento. Compare com o total para ver quanto do estoque já foi tratado.",
    insight: "Muitas abertas e poucas encerradas sugerem pressão operacional ou gargalo em um eixo (ex.: SMAS/CadÚnico).",
  },
  {
    titulo: "No prazo (PIC)",
    leitura:
      "Percentual das encerradas com prazo de atendimento (SLA) resolvidas até o prazo. O denominador não inclui fechados sem SLA — alinhado ao gráfico Composição SLA.",
    insight: "Queda no percentual com volume estável pode sinalizar atraso na rede intersetorial.",
  },
  {
    titulo: "Tempo médio de resolução",
    leitura: "Média de dias entre abertura e encerramento, apenas nos casos fechados.",
    insight: "Valores altos com boa taxa “no prazo” indicam casos longos pontuais.",
  },
  {
    titulo: "Demandas em aberto",
    leitura: "Fila atual sem data de fim.",
    insight: "Pico de abertas pode anteceder demanda por articulação entre secretarias (ex.: saúde + assistência).",
  },
  {
    titulo: "Idade média (abertas)",
    leitura:
      "Quantos dias, em média, os chamados ainda abertos aguardam desde a data de abertura.",
    insight: "Idade média alta indica fila envelhecida — priorize tipos ou territórios com filtros em cascata.",
  },
] as const;

export interface PicInsightExemplo {
  hipotese: string;
  filtros?: readonly string[];
}

export const PIC_RESOURCE_GUIDE = {
  titulo: "Alocação de recursos",
  intro:
    "Cruzamentos territoriais e operacionais para priorizar equipes entre subprefeituras, regiões e eixos SMS · SME · SMAS.",
  atrasosSubpref: {
    intro:
      "As cinco subprefeituras com menor taxa de encerramento no prazo do SLA do 1746, em cada eixo do PIC (Saúde, Educação, Assistência Social). Serve para priorizar mutirões territoriais onde o atraso é estrutural, não só volumoso.",
    bullets: [
      "% no prazo: encerrados com prazo_atendimento preenchido; fora do prazo = data_fim após o SLA.",
      "Chamados atrasados: volume absoluto de encerrados fora do prazo na subprefeitura.",
      "Unidades organizacionais (até 3): fatia percentual dos atrasos da subprefeitura atribuída a cada órgão executor (nome_unidade_organizacional).",
    ] as const,
    orgaoLabel: "unidade organizacional",
  },
  atrasosRegiao: {
    intro:
      "Mesma lógica do ranking por subprefeitura, agrupado por região administrativa (divisão oficial ligada ao bairro do endereço do chamado).",
    bullets: [
      "% no prazo e chamados atrasados: mesmas regras de SLA do 1746 aplicadas ao território por região.",
      "Unidades organizacionais (até 3): fatia percentual dos atrasos da região administrativa atribuída a cada órgão executor (nome_unidade_organizacional).",
    ] as const,
    orgaoLabel: "unidade organizacional",
  },
  categoria:
    "Tipo de chamado (categoria no 1746) — leitura macro da demanda antes do detalhe por tipo.",
  reclamacoes:
    "Regiões com mais chamados com 2+ reclamações e média de reclamações — proxy de reincidência / insatisfação.",
  evolucaoIntersetorial: {
    subtitle: "Volume mensal SMS · SME · SMAS",
    encerrados:
      "Encerrados: englobando no prazo, fora do prazo e fechados sem prazo de atendimento",
  },
} as const;

export const PIC_INSIGHTS_EXEMPLOS: readonly PicInsightExemplo[] = [
  {
    hipotese:
      "Equilíbrio intersetorial: SMS, SME e SMAS respondem em proporções esperadas ou um eixo concentra a fila?",
    filtros: ["Sem filtro inicial; depois compare secretaria SMS, SME e SMAS."],
  },
  {
    hipotese:
      "CadÚnico e vulnerabilidade: volume e SLA em tipos SMAS refletem pressão no acesso ao CPIC e à rede de proteção.",
    filtros: ["Secretaria: SMAS", "Tipo (cascata): Cadastro Único, Assistência Social"],
  },
  {
    hipotese:
      "Saúde da gestante e criança: tipos SMS (vacinação, posto, programas) com atraso indicam gargalo pré-natal/imunização.",
    filtros: ["Secretaria: SMS", "Tipo (cascata): Vacinação, Posto de Saúde, Programas de Saúde"],
  },
  {
    hipotese:
      "Educação infantil: demandas SME (creche/escola) vs. tempo de resolução mostram fila de acesso à rede.",
    filtros: [
      "Secretaria: SME",
      "Tipo (cascata): Creche, Escola ou Educação",
      "Período (opcional): data de início — ex. último ano escolar, para ver sazonalidade",
    ],
  },
  {
    hipotese:
      "Tendência temporal: picos mensais coincidem com campanhas, calendário escolar ou mutirões de cadastro?",
    filtros: ["Ajuste data de início (de/até); combine com secretaria ou tipo conforme a hipótese"],
  },
] as const;

export const SECRETARIA_COLORS: Record<PicSecretaria, string> = {
  SMS: "#2563eb",
  SME: "#16a34a",
  SMAS: "#ca8a04",
};
