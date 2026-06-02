-- Grain categoria · fonte int_pic_chamados
-- Card (dashboard-categoria-card.tsx): Tipo de chamado — volume por categoria (top 10 na UI)

select
    categoria,
    count(*) as total_chamados
from {{ ref('int_pic_chamados') }}
where categoria is not null
group by 1
order by total_chamados desc
