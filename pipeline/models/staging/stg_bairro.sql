select
    cast(id_bairro as varchar) as id_bairro,
    cast(nome as varchar) as nome,
    cast(subprefeitura as varchar) as subprefeitura,
    cast(nome_regiao_administrativa as varchar) as regiao_administrativa,
    cast(nome_regiao_planejamento as varchar) as area_planejamento,
    cast(geometry_wkt as varchar) as geometry_wkt
from read_parquet('../data/raw/bairro.parquet')
