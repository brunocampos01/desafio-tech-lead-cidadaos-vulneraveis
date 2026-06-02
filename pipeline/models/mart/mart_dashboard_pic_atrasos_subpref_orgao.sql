-- Grain subprefeitura × secretaria × orgao · top 3 órgãos por fatia de atraso · fonte int_pic_chamados
-- Card (dashboard-atrasos-por-secretaria-card.tsx): coluna “unidades organizacionais” no ranking subprefeitura

with chamados_atrasados as (
    select
        secretaria,
        subprefeitura,
        nome_unidade_organizacional as orgao
    from {{ ref('int_pic_chamados') }}
    where subprefeitura is not null
      and nome_unidade_organizacional is not null
      and {{ chamado_atrasado() }}
),

total_por_subprefeitura as (
    select
        secretaria,
        subprefeitura,
        count(*) as total_atrasados
    from chamados_atrasados
    group by 1, 2
),

total_por_orgao as (
    select
        secretaria,
        subprefeitura,
        orgao,
        count(*) as chamados_atrasados
    from chamados_atrasados
    group by 1, 2, 3
),

top_tres_orgaos as (
    select
        o.secretaria,
        o.subprefeitura,
        o.orgao,
        o.chamados_atrasados,
        round(100.0 * o.chamados_atrasados / t.total_atrasados, 1) as pct_do_atraso,
        row_number() over (
            partition by o.secretaria, o.subprefeitura
            order by o.chamados_atrasados desc
        ) as posicao
    from total_por_orgao as o
    inner join total_por_subprefeitura as t
        on o.secretaria = t.secretaria
        and o.subprefeitura = t.subprefeitura
)

select secretaria, subprefeitura, orgao, chamados_atrasados, pct_do_atraso
from top_tres_orgaos
where posicao <= 3
order by secretaria, subprefeitura, chamados_atrasados desc
