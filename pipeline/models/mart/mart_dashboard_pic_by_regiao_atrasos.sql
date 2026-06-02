-- Grain regiao_administrativa (territorio) · top 10 piores taxa no prazo · fonte int_pic_chamados
-- Card (dashboard-allocation-section.tsx): Regiões administrativas com mais atrasos em chamados — TerritorialDelaysChart

with por_regiao as (
    select
        regiao_administrativa as territorio,
        count(*) as total_chamados,
        {{ agg_taxa_resolucao_prazo_pct() }} as taxa_resolucao_prazo
    from {{ ref('int_pic_chamados') }}
    where regiao_administrativa is not null
    group by 1
),

piores_taxas as (
    select
        territorio,
        total_chamados,
        taxa_resolucao_prazo,
        row_number() over (
            order by taxa_resolucao_prazo asc nulls last, total_chamados desc
        ) as posicao
    from por_regiao
    where taxa_resolucao_prazo is not null
)

select territorio, total_chamados, taxa_resolucao_prazo
from piores_taxas
where posicao <= 10
order by taxa_resolucao_prazo asc, total_chamados desc
