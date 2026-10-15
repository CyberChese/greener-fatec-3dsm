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
| `metrics_path` | string | Caminho **relativo** do endpoint de métricas do serviço | `metricsPath` (TASK-014 decide como gravar em `Service.endpoint`) |
| `location.region_code` | string | Código da região de nuvem | `location.regionCode` |
| `location.country` | string | País | `location.country` |
| `location.region` | string | Região/Estado | `location.region` |
| `location.city` | string | Cidade | `location.city` |
| `location.latitude` | number | Latitude | `location.lat` |
| `location.longitude` | number | Longitude | `location.lng` |

> A resposta **não** traz os campos `endpoint` nem `status`. A localização vem aninhada em `location`.

## Regras do cliente
- Item sem `id` ou `name` é descartado e contado em log (nenhum valor é inventado).
- `location` e `metrics_path` são opcionais: ausência de coordenadas não impede o serviço (RF13).
- Resposta que não é array → `AggregatorContractError`.
- Falhas viram erros tipados (`AggregatorTimeoutError`, `AggregatorHttpError`, `AggregatorUnavailableError`, `AggregatorConfigError`, `AggregatorContractError`), todas registradas em log. Quem chama deve capturar (RNF05).

## Pendências a confirmar
- Formato real de `GET /metrics/{id}` (campos, unidades, `network_io` em bytes ou MB?). **Não foi verificado**: confira antes da TASK de coleta.
- Existe campo de estado do serviço na descoberta? Nas respostas observadas, não.