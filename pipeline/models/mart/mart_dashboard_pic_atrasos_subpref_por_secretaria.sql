-- Grain subprefeitura × secretaria · top 5 piores taxa / secretaria · fonte int_pic_chamados
-- Card (dashboard-atrasos-por-secretaria-card.tsx via allocation-section): Secretarias e subprefeituras com mais atrasos

with por_subprefeitura as (
    select
        secretaria,
        subprefeitura,
        count(*) as total_chamados,
        {{ agg_chamados_atrasados() }} as chamados_atrasados,
        {{ agg_taxa_resolucao_prazo_pct() }} as taxa_resolucao_prazo
    from {{ ref('int_pic_chamados') }}
    where subprefeitura is not null
    group by 1, 2
),

piores_cinco_por_secretaria as (
    select
        secretaria,
        subprefeitura,
        total_chamados,
        chamados_atrasados,
        taxa_resolucao_prazo,
        row_number() over (
            partition by secretaria
            order by taxa_resolucao_prazo asc nulls last, total_chamados desc
        ) as posicao
    from por_subprefeitura
    where taxa_resolucao_prazo is not null
)

select secretaria, subprefeitura, chamados_atrasados, taxa_resolucao_prazo
from piores_cinco_por_secretaria
where posicao <= 5
order by secretaria, taxa_resolucao_prazo asc, total_chamados desc
