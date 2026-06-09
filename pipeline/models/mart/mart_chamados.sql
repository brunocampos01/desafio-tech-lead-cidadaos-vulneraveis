-- Fato detalhe · grain id_chamado · fonte int_chamados_enriched (filtro PIC: SMS · SME · SMAS)

select
    id_chamado,
    data_inicio,
    data_fim,
    prazo_atendimento,
    tipo,
    subtipo,
    status,
    situacao,
    longitude,
    latitude,
    data_particao,
    secretaria,
    dias_resolucao,
    resolvido_no_prazo,
    subprefeitura,
    regiao_administrativa,
    area_planejamento,
    categoria,
    tipo_situacao,
    reclamacoes,
    nome_unidade_organizacional
from {{ ref('int_chamados_enriched') }}
