with

stg_chamados as (
    select * from {{ ref('stg_chamado') }}
),

tipo_para_secretaria as (
    select tipo, secretaria
    from {{ ref('secretaria_tipo_mapping') }}
),

bairros_com_poligono as (
    select
        id_bairro,
        subprefeitura,
        regiao_administrativa,
        area_planejamento,
        geometry_wkt
    from {{ ref('stg_bairro') }}
    where geometry_wkt is not null
),

chamados_com_metricas as (
    select
        c.id_chamado,
        c.data_inicio,
        c.data_fim,
        c.prazo_atendimento,
        c.tipo,
        c.subtipo,
        c.status,
        c.situacao,
        c.id_bairro,
        c.categoria,
        c.tipo_situacao,
        c.nome_unidade_organizacional,
        c.reclamacoes,
        c.longitude,
        c.latitude,
        c.data_particao,
        coalesce(map.secretaria, 'Outros') as secretaria,
        case
            when c.data_fim is not null and c.data_inicio is not null
                then date_diff('day', cast(c.data_inicio as date), cast(c.data_fim as date))
        end as dias_resolucao,
        case
            when c.data_fim is not null and c.prazo_atendimento is not null
                then c.data_fim <= c.prazo_atendimento
            else false
        end as resolvido_no_prazo
    from stg_chamados as c
    left join tipo_para_secretaria as map on c.tipo = map.tipo
),

-- Preferência 1: bairro cadastrado no chamado (id_bairro)
geo_via_id_bairro as (
    select
        c.id_chamado,
        b.subprefeitura,
        b.regiao_administrativa,
        b.area_planejamento
    from chamados_com_metricas as c
    inner join bairros_com_poligono as b on c.id_bairro = b.id_bairro
),

-- Preferência 2: ponto (lon/lat) dentro do polígono do bairro, só quando o id não resolveu
chamados_para_geo_por_coordenada as (
    select c.*
    from chamados_com_metricas as c
    left join geo_via_id_bairro as g on c.id_chamado = g.id_chamado
    where g.id_chamado is null
      and c.longitude is not null
      and c.latitude is not null
),

geo_via_coordenada_ranked as (
    select
        c.id_chamado,
        b.subprefeitura,
        b.regiao_administrativa,
        b.area_planejamento,
        row_number() over (
            partition by c.id_chamado
            order by b.subprefeitura
        ) as rn
    from chamados_para_geo_por_coordenada as c
    inner join bairros_com_poligono as b
        on st_within(
            st_point(c.longitude, c.latitude),
            st_geomfromtext(b.geometry_wkt)
        )
),

geo_via_coordenada as (
    select
        id_chamado,
        subprefeitura,
        regiao_administrativa,
        area_planejamento
    from geo_via_coordenada_ranked
    where rn = 1
),

geo_unificado as (
    select * from geo_via_id_bairro
    union all
    select * from geo_via_coordenada
),

regiao_administrativa_mestre as (
    select
        nome as regiao_administrativa,
        ap_sms
    from {{ ref('stg_regiao_administrativa') }}
    where nome is not null
)

select
    c.*,
    g.subprefeitura,
    g.regiao_administrativa,
    g.area_planejamento,
    rm.ap_sms
from chamados_com_metricas as c
left join geo_unificado as g on c.id_chamado = g.id_chamado
left join regiao_administrativa_mestre as rm
    on g.regiao_administrativa = rm.regiao_administrativa
