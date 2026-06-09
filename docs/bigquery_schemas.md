# Schemas BigQuery — projeto `datario`

Para cada tabela: **coluna (nome)**, **tipo** e **descrição** (`INFORMATION_SCHEMA.COLUMN_FIELD_PATHS`).

Regerar:

```bash
source .venv/bin/activate
python pipeline/scripts/generate_schema_docs.py --billing-project desafio-tech-lead-cidadaos
```

> Enunciado cita `prazo_atendimento`; no datalake atual o SLA alvo é `data_alvo_finalizacao` (alias no export).

## `datario.adm_central_atendimento_1746.chamado`

Chamados 1746; extração com filtro em data_particao.

| Coluna (nome) | Tipo | Descrição |
|---------------|------|-----------|
| `id_chamado` | STRING | Identificador único do chamado no banco de dados. |
| `id_origem_ocorrencia` | STRING | Identificador da origem da ocorrência. |
| `data_inicio` | DATETIME | Data de abertura do chamado. Ocorre quando o operador registra o chamado. |
| `data_fim` | DATETIME | Data de fechamento do chamado. O chamado é fechado quando o pedido é atendido ou quando se percebe que o pedido não pode ser atendido. |
| `id_bairro` | STRING | Identificador único, no banco de dados, do bairro onde ocorreu o fato que gerou o chamado. |
| `id_territorialidade` | STRING | Identificador único, no banco de dados, da territorialidade onde ocorreu o fato que gerou o chamado. Territorialidade é uma região da cidade do Rio de Janeiro que tem com responsável um órgão especifico. Exemplo: CDURP, que é responsável pela região do porto do Rio de Janeiro. |
| `id_logradouro` | STRING | Identificador único, no banco de dados, do logradouro onde ocorreu o fato que gerou o chamado. |
| `numero_logradouro` | INT64 | Número da porta onde ocorreu o fato que gerou o chamado. |
| `id_unidade_organizacional` | STRING | Identificador único, no banco de dados, do órgão que executa o chamado. Por exemplo: identificador da COMLURB quando o chamado é relativo a limpeza urbana. |
| `nome_unidade_organizacional` | STRING | Nome do órgão que executa a demanda. Por exemplo: COMLURB quando a demanda é relativa a limpeza urbana. |
| `id_unidade_organizacional_mae` | STRING | ID da unidade organizacional mãe do orgão que executa a demanda. Por exemplo: "CVA - Coordenação de Vigilância de Alimentos" é quem executa a demanda e obede a unidade organizacional mãe "IVISA-RIO - Instituto Municipal de Vigilância Sanitária, de Zoonoses e de Inspeção Agropecuária". A coluna se refere ao ID  deste último. |
| `unidade_organizacional_ouvidoria` | STRING | Booleano indicando se o chamado do cidadão foi feita Ouvidoria ou não. 1 caso sim, 0 caso não, |
| `categoria` | STRING | Categoria do chamado. Exemplo: Serviço, informação, sugestão, elogio, reclamação, crítica. |
| `id_tipo` | STRING | Identificador único, no banco de dados, do tipo do chamado. Ex: Iluminação pública. |
| `tipo` | STRING | Nome do tipo do chamado. Ex: Iluminação pública. |
| `id_subtipo` | STRING | Identificador único, no banco de dados, do subtipo do chamado. Ex: Reparo de lâmpada apagada. |
| `subtipo` | STRING | Nome do subtipo do chamado.  Ex: Reparo de lâmpada apagada. |
| `status` | STRING | Status do chamado. Ex. Fechado com solução, aberto em andamento, pendente etc. |
| `longitude` | FLOAT64 | Longitude do lugar do evento que motivou o chamado. |
| `latitude` | FLOAT64 | Latitude do lugar do evento que motivou o chamado. |
| `data_alvo_finalizacao` | DATETIME | Data prevista para o atendimento do chamado. Caso prazo_tipo seja D fica em branco até o diagnóstico ser feito. |
| `data_alvo_diagnostico` | DATETIME | Data prevista para fazer o diagnóstico do serviço.  Caso prazo_tipo seja F esta data fica em branco. |
| `data_real_diagnostico` | DATETIME | Data em que foi feito o diagnóstico do serviço.  Caso prazo_tipo seja F esta data fica em branco. |
| `tempo_prazo` | INT64 | Prazo para o serviço ser feito. Em dias ou horas após a abertura do chamado. Caso haja diagnóstico o prazo conta após se fazer o diagnóstico. |
| `prazo_unidade` | STRING | Unidade de tempo utilizada no prazo. Dias ou horas. D ou H. |
| `prazo_tipo` | STRING | Diagnóstico ou finalização. D ou F. Indica se a chamada precisa de diagnóstico ou não. Alguns serviços precisam de avaliação para serem feitos, neste caso é feito o diagnóstico. Por exemplo, pode de árvore. Há a necessidade de um engenheiro ambiental verificar a necessidade da poda ou não. |
| `dentro_prazo` | STRING | Indica se a data alvo de finalização do chamado ainda está dentro do prazo estipulado. |
| `situacao` | STRING | Identifica se o chamado foi encerrado |
| `tipo_situacao` | STRING | Indica o status atual do chamado entre as categorias Atendido, Atendido parcialmente, Não atendido, Não constatado e Andamento |
| `justificativa_status` | STRING | Justificativa que os órgãos usam ao definir o status. Exemplo: SEM POSSIBILIDADE DE ATENDIMENTO - justificativa: Fora de área de atuação do municipio |
| `reclamacoes` | INT64 | Quantidade de reclamações. |
| `extracted_at` | TIMESTAMP | Data e hora em que o registro foi extraído pelo Airbyte. |
| `updated_at` | STRING | Data da ultima atualização |
| `data_particao` | DATE | Data de partição dos dados. Trunc(data_inicio) |

## `datario.dados_mestres.bairro`

Geo — bairros.

| Coluna (nome) | Tipo | Descrição |
|---------------|------|-----------|
| `id_bairro` | STRING | Identificador único do bairro |
| `nome` | STRING | Nome do bairro |
| `id_area_planejamento` | STRING | Identificador da área de planejamento |
| `id_regiao_planejamento` | STRING | Identificador da região de planejamento |
| `nome_regiao_planejamento` | STRING | Nome da região de planejamento |
| `id_regiao_administrativa` | STRING | Identificador da região administrativa |
| `nome_regiao_administrativa` | STRING | Nome da região administrativa |
| `subprefeitura` | STRING | Nome da subprefeitura |
| `area` | FLOAT64 | Área do bairro em metros quadrados |
| `perimetro` | FLOAT64 | Perímetro do bairro em metros |
| `geometry_wkt` | STRING | Representação da geometria em formato WKT |
| `geometry` | GEOGRAPHY | Geometria espacial do bairro |

## `datario.dados_mestres.regiao_administrativa`

Geo — regiões administrativas.

| Coluna (nome) | Tipo | Descrição |
|---------------|------|-----------|
| `id_regiao_administrativa` | STRING | Identificador da região administrativa |
| `nome` | STRING | Nome da região administrativa |
| `id_area_planejamento` | STRING | Identificador da área de planejamento |
| `id_area_planejamento_numerico` | INT64 | Identificador numérico da área de planejamento |
| `id_area_planejamento_sms` | STRING | Identificador da área de planejamento do SMS |
| `area_total` | FLOAT64 | Área total em metros quadrados |
| `area` | FLOAT64 | Área em metros quadrados |
| `perimetro` | FLOAT64 | Perímetro em metros |
| `geometry_wkt` | STRING | Representação da geometria em formato WKT |
| `geometry` | GEOGRAPHY | Geometria espacial da região administrativa |

## `datario.dados_mestres.area_planejamento`

Geo — áreas de planejamento.

| Coluna (nome) | Tipo | Descrição |
|---------------|------|-----------|
| `id_area_planejamento` | STRING | Identificador da área de planejamento (código) |
| `id_area_planejamento_numerico` | INT64 | Identificador numérico da área de planejamento |
| `area` | FLOAT64 | Área em metros quadrados |
| `perimetro` | FLOAT64 | Perímetro em metros |
| `geometry_wkt` | STRING | Representação da geometria em formato WKT |
| `geometry` | GEOGRAPHY | Geometria espacial da área de planejamento |

## `datario.dados_mestres.subprefeitura`

Geo — subprefeituras.

| Coluna (nome) | Tipo | Descrição |
|---------------|------|-----------|
| `subprefeitura` | STRING | Nome da subprefeitura |
| `area` | FLOAT64 | Área da subprefeitura em metros quadrados |
| `perimetro` | FLOAT64 | Perímetro da subprefeitura em metros |
| `geometry_wkt` | STRING | Representação da geometria em formato WKT |
| `geometria` | GEOGRAPHY | Geometria espacial da subprefeitura |
