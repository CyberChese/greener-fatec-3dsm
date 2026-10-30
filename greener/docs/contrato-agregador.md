# Contrato — Greener Metrics Aggregator API (UniLaunch)

Documentação oficial: https://metrics.unilaunch.org/docs
Cliente no GreenER: `AggregatorClientService` (`backend/src/modules/aggregator`).

> Conferido em 14/10/2026 chamando a API real (`GET /services`, HTTP 200, sem autenticação).

## Configuração
| Variável | Função | Padrão |
|---|---|---|
| `AGGREGATOR_API_URL` | URL base da API | — (obrigatória) |
| `AGGREGATOR_SERVICES_PATH` | Rota de descoberta | `/services` |
| `AGGREGATOR_TIMEOUT` | Timeout em ms | `5000` |

## Descoberta de serviços (RF01)
- **Método e rota:** `GET /services`
- **Autenticação:** nenhuma (a chamada sem credenciais retornou 200)
- **Formato da resposta:** array JSON de objetos
- **Identificador estável:** `id` (ex.: `billing-api`)
- **Natureza dinâmica:** a lista muda entre chamadas (serviços entram/saem). Em uma consulta, `billing-api` estava presente; em outra, não.

### Exemplo real
```json
{
  "id": "billing-api",
  "name": "Billing API",
  "location": {
    "region_code": "br-sudeste",
    "country": "Brazil",
    "region": "Sudeste",
    "city": "Sao Paulo",
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "metrics_path": "/metrics/billing-api"
}
```

### Campos
| Campo | Tipo | Significado | Vira no GreenER |
|---|---|---|---|
| `id` | string | Identificador estável do serviço (obrigatório) | `externalId` → `Service.external_id` |
| `name` | string | Nome do serviço (obrigatório) | `name` |
| `metrics_path` | string | Caminho **relativo** do endpoint de métricas do serviço | `Service.endpoint` (TASK-014) e usado pelo coletor |
| `location.region_code` | string | Código da região de nuvem | `location.regionCode` (lido, mas ainda não gravado no banco; previsto para a Sprint 2) |
| `location.country` | string | País | `location.country` |
| `location.region` | string | Região/Estado | `location.region` |
| `location.city` | string | Cidade | `location.city` |
| `location.latitude` | number | Latitude | `location.lat` |
| `location.longitude` | number | Longitude | `location.lng` |

> A resposta **não** traz os campos `endpoint` nem `status`. A localização vem aninhada em `location`.

## Regras do cliente
- Item sem `id` ou `name` é descartado e contado em log (nenhum valor é inventado).
- Uma lista em que todos os itens são válidos é considerada uma descoberta completa; itens descartados tornam a resposta incompleta, portanto omissões não indicam remoção.
- `location` e `metrics_path` são opcionais: ausência de coordenadas não impede o serviço (RF13).
- Resposta que não é array → `AggregatorContractError`.
- Falhas viram erros tipados (`AggregatorTimeoutError`, `AggregatorHttpError`, `AggregatorUnavailableError`, `AggregatorConfigError`, `AggregatorContractError`), todas registradas em log. Quem chama deve capturar (RNF05).

## Coleta de métricas (RF03/RF04/RF10)
- **Método e rota:** `GET {metrics_path}` retornado pela descoberta (ex.: `/metrics/billing-api`).
- **Formato:** objeto com `collection_interval_seconds` e `metrics`.
- **Mapeamento persistido:** `cpu_percent` → `cpu_usage` (**percentual**); `memory_gb` → `memory_usage` (**GB**); `disk_gb` → `storage_usage` (**GB**); `network_gb` → `network_io` (**GB**).
- `collection_interval_seconds` é o intervalo informado pelo agregador e não substitui o intervalo de agendamento local.
- O coletor persiste o instante da resposta em `MetricCollection.timestamp`. Serviços ativos sem `metrics_path` não são coletados até que tenham um endpoint configurado.
- **Estados por tipo de falha ao buscar métricas (TASK-034):**

  | Situação | Estado persistido | Motivo |
  |---|---|---|
  | Timeout, falha de conexão ou HTTP 500 (ou outro erro HTTP que não seja 404) | `UNAVAILABLE` | O Agregador não entregou uma resposta utilizável: o serviço está indisponível. |
  | HTTP 404 | `NO_METRICS` | Pela OpenAPI, 404 significa que o serviço foi removido ou não tem métricas. O Agregador respondeu, então o serviço não está indisponível: ele está sem métricas. |
  | Resposta 200 sem métricas válidas, ou serviço sem `metrics_path` | `NO_METRICS` | Resposta alcançável, porém sem dados utilizáveis. |
  | Resposta 200 com métricas válidas, gravadas | `ACTIVE` | Única situação que ativa um serviço. |

- O 404 é registrado como aviso, sem stack trace; os demais erros são registrados como erro. Em todos os casos a coleta continua para os demais serviços e tenta novamente no ciclo seguinte, o que permite a recuperação: um serviço em `UNAVAILABLE` ou `NO_METRICS` volta a `ACTIVE` na primeira resposta válida. O estado anterior nunca é mantido após uma falha, e o histórico de coletas não é removido por essas transições.
- Descobrir um serviço não o ativa por si só. Um serviço ausente de uma descoberta completa é marcado como `UNAVAILABLE` (sem apagar histórico); ausência em resposta incompleta ou falha da API não conta como remoção.
- A regra do 404 está concentrada em `statusForFetchError` (`backend/src/metrics/metrics.service.ts`), com testes em `metrics.service.spec.ts`.
- A especificação foi conferida em `GET /openapi.json` e com `GET /metrics/billing-api` em 16/10/2026.