-- Grain global (1 linha) · fonte int_pic_chamados
-- Cards (dashboard-view.tsx): Demandas intersetoriais, Encerradas, No prazo (PIC), Tempo médio de resolução

select
    count(*) as total_chamados,
    count(*) filter (where data_fim is not null) as total_resolvidos,
    count(*) filter (where data_fim is null) as chamados_abertos,
    {{ agg_taxa_resolucao_prazo_pct() }} as taxa_resolucao_prazo,
    {{ agg_tempo_medio_resolucao_dias() }} as tempo_medio_resolucao_dias,
    current_timestamp as atualizado_em
from {{ ref('int_pic_chamados') }}
