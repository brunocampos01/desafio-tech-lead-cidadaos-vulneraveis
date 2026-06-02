-- Grain subprefeitura (territorio) · top 12 pressão reclamações · fonte int_pic_chamados
-- Card (dashboard-pressao-reclamacoes-card.tsx): Pressão por reclamações (Subprefeituras) — seção Alocação de recursos

with pressao_por_subprefeitura as (
    select
        subprefeitura as territorio,
        count(*) filter (where reclamacoes >= 2) as com_reclamacoes_repetidas
    from {{ ref('int_pic_chamados') }}
    where subprefeitura is not null
      and reclamacoes is not null
    group by 1
),

top_doze as (
    select
        *,
        row_number() over (order by com_reclamacoes_repetidas desc) as posicao
    from pressao_por_subprefeitura
)

select territorio, com_reclamacoes_repetidas
from top_doze
where posicao <= 12
order by com_reclamacoes_repetidas desc
