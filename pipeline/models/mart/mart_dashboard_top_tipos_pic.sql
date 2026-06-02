-- Grain tipo + secretaria · top 10 por volume · fonte int_pic_chamados
-- Card (dashboard-view.tsx): Principais tipos intersetoriais — barras horizontais

with contagem_por_tipo as (
    select
        tipo,
        secretaria,
        count(*) as total_chamados
    from {{ ref('int_pic_chamados') }}
    where tipo is not null
    group by 1, 2
),

top_dez as (
    select
        *,
        row_number() over (order by total_chamados desc) as posicao
    from contagem_por_tipo
)

select tipo, secretaria, total_chamados
from top_dez
where posicao <= 10
order by total_chamados desc
