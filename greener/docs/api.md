# API REST do GreenER

Documentação dos endpoints **implementados** no backend NestJS na versão da Sprint 1.
Endpoints ainda não implementados aparecem separadamente em [Endpoints planejados](#endpoints-planejados).

- **URL base (Docker):** `http://localhost:3001/api`
- **Prefixo global:** todas as rotas começam com `/api` (`app.setGlobalPrefix('api')` em [`main.ts`](../backend/src/main.ts)).
- **Formato:** JSON.
- **Validação:** `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e `transform`. Campos não previstos no DTO geram `400`.
- **Swagger:** ainda não configurado (previsto para a Sprint 2).

---

## Resumo

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/api` | Público | Verificação simples de que a API está no ar |
| `POST` | `/api/auth/login` | Público | Autentica o usuário e retorna um JWT |
| `GET` | `/api/auth/profile` | JWT | Retorna os dados do usuário autenticado |
| `GET` | `/api/services` | Público | Lista os serviços descobertos no Agregador e seus estados |
| `GET` | `/api/services/:id/history` | Público | Histórico de coletas de métricas de um serviço |
| `GET` | `/api/metrics/collection-config` | Público | Intervalo de coleta e horário da última coleta registrada |

---

## Autenticação

### `POST /api/auth/login`

Autentica um usuário cadastrado e emite um token JWT.

**Corpo da requisição** ([`LoginDto`](../backend/src/auth/dto/login.dto.ts)):

| Campo | Tipo | Regras |
|---|---|---|
| `email` | string | Obrigatório, e-mail válido |
| `password` | string | Obrigatório, mínimo de 6 caracteres |

```json
{ "email": "teste@greener.com", "password": "senha123" }
```

**Respostas:**

| Código | Situação | Corpo |
|---|---|---|
| `200` | Credenciais válidas | `{ "access_token": "<jwt>", "user": { "id", "email", "name" } }` |
| `400` | Corpo inválido | `{ "message": ["O email informado deve ser um endereço válido.", ...], "error": "Bad Request", "statusCode": 400 }` |
| `401` | E-mail inexistente ou senha incorreta | `{ "message": "Credenciais inválidas.", "error": "Unauthorized", "statusCode": 401 }` |

A mensagem de `401` é a mesma nos dois casos, para não revelar se o e-mail existe.
O token expira conforme `JWT_EXPIRATION` (padrão `1d`). O payload contém `sub` (id do usuário), `email` e `name`.

### `GET /api/auth/profile`

Rota protegida pelo `JwtAuthGuard`. Exige o cabeçalho:

```http
Authorization: Bearer <access_token>
```

| Código | Situação | Corpo |
|---|---|---|
| `200` | Token válido | `{ "id": "<uuid>", "email": "...", "name": "..." }` |
| `401` | Token ausente, inválido ou expirado | `{ "message": "Unauthorized", "statusCode": 401 }` |

---

## Serviços

### `GET /api/services`

Lista todos os serviços cadastrados pela descoberta no Agregador de Métricas.

**Resposta `200`:** array de serviços.

```json
[
  {
    "idServices": "b9a3f744-1f9b-4e53-8b11-31d112a49c83",
    "external_id": "billing-api",
    "nameServices": "Billing API",
    "endpoint": "/metrics/billing-api",
    "status": "ACTIVE",
    "country": "Brazil",
    "region": "Sudeste",
    "city": "Sao Paulo",
    "latitude": "-23.550500",
    "longitude": "-46.633300",
    "create_at": "2026-10-19T00:48:10.120Z",
    "last_observed_at": "2026-10-19T00:48:10.118Z"
  }
]
```

| Campo | Significado |
|---|---|
| `status` | `ACTIVE` (última coleta válida), `UNAVAILABLE` (timeout, falha de conexão, HTTP 404/500 ou ausente na descoberta completa) ou `NO_METRICS` (respondeu sem métricas válidas ou sem endpoint) |
| `endpoint` | Caminho relativo de métricas informado pelo Agregador (`metrics_path`) |
| `latitude`, `longitude` | Retornados como texto, pois a coluna é `numeric` no PostgreSQL |

### `GET /api/services/:id/history`

Retorna as coletas de métricas de um serviço, em ordem cronológica crescente.

| Parâmetro | Local | Tipo | Regras |
|---|---|---|---|
| `id` | rota | UUID | Id interno do serviço (`idServices`) |
| `from` | query | data ISO-8601 | Opcional, limite inicial inclusivo |
| `to` | query | data ISO-8601 | Opcional, limite final inclusivo |

Exemplo: `GET /api/services/b9a3f744-1f9b-4e53-8b11-31d112a49c83/history?from=2026-10-01T00:00:00Z&to=2026-10-20T00:00:00Z`

**Resposta `200`:**

```json
[
  {
    "idCollections": "6ea75d35-683d-45ed-8126-0d83bc3a89ca",
    "service_id": "b9a3f744-1f9b-4e53-8b11-31d112a49c83",
    "cpu_usage": "42.500000",
    "memory_usage": "2.100000",
    "storage_usage": "10.000000",
    "network_io": "0.300000",
    "timestamp": "2026-10-19T00:48:13.443Z"
  }
]
```

| Campo | Unidade |
|---|---|
| `cpu_usage` | percentual (0 a 100) |
| `memory_usage` | GB |
| `storage_usage` | GB |
| `network_io` | GB |
| `timestamp` | instante em que a resposta da coleta foi recebida (UTC) |

| Código | Situação |
|---|---|
| `400` | `id` não é UUID, data inválida ou `from` posterior a `to` |
| `404` | Serviço não encontrado |

---

## Métricas

### `GET /api/metrics/collection-config`

Informa o intervalo de coleta configurado e o horário da última coleta registrada.

**Resposta `200`:**

```json
{ "interval_seconds": 30, "last_collection_at": "2026-10-19T00:48:34.601Z" }
```

`last_collection_at` é `null` enquanto nenhuma coleta tiver sido gravada.
O intervalo vem de `METRICS_COLLECTION_INTERVAL_SECONDS` e é contado a partir do término de cada ciclo.

---

## Endpoints planejados

Os endpoints abaixo **ainda não existem** no backend e estão previstos no [plano de entregas](plano-de-entregas.md):

| Método | Rota prevista | Finalidade | Previsão |
|---|---|---|---|
| `GET` | `/api/metrics/summary` | Indicadores consolidados de energia (kWh) e CO₂e | Sprint 2 |
| `PUT` | `/api/config/interval` | Alterar o intervalo de coleta (protegida por JWT) | Sprint 2 |
| `POST` | `/api/services/refresh` | Forçar a redescoberta dos serviços (protegida por JWT) | Sprint 2 |
| `GET` | `/api/metrics/ranking` | Ranking de serviços por consumo ou emissão | Sprint 3 |
| `GET` | `/api/metrics/compare` | Comparação entre serviços em um período | Sprint 3 |
