with source as (
    select * from read_parquet('../data/raw/chamado.parquet')
),

renamed as (
    select
        cast(id_chamado as varchar) as id_chamado,
        cast(data_inicio as timestamp) as data_inicio,
        cast(data_fim as timestamp) as data_fim,
        cast(prazo_atendimento as timestamp) as prazo_atendimento,
        cast(tipo as varchar) as tipo,
        cast(subtipo as varchar) as subtipo,
        cast(status as varchar) as status,
        cast(situacao as varchar) as situacao,
        cast(longitude as double) as longitude,
        cast(latitude as double) as latitude,
        cast(data_particao as date) as data_particao,
        cast(id_bairro as varchar) as id_bairro,
        cast(categoria as varchar) as categoria,
        cast(tipo_situacao as varchar) as tipo_situacao,
        cast(nome_unidade_organizacional as varchar) as nome_unidade_organizacional,
        cast(reclamacoes as integer) as reclamacoes
    from source
)

select *
from renamed
where data_particao >= cast('{{ var("partition_start") }}' as date)
