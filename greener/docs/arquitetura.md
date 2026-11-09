# Arquitetura do GreenER

Este documento descreve os componentes da versão entregue na Sprint 1, suas responsabilidades, o fluxo de dados e as decisões arquiteturais. Partes previstas para sprints futuras estão indicadas como tal.

## 1. Visão geral

```text
┌──────────────────────────────┐        HTTP/JSON         ┌───────────────────────────────┐
│  Frontend (React + Vite)     │ ───────────────────────► │  Backend (NestJS)             │
│  localhost:3000              │   /api/...  (JWT nas     │  localhost:3001/api           │
│  pages · components ·        │   rotas protegidas)      │  auth · services · metrics ·  │
│  services · hooks · contexts │                          │  aggregator                   │
└──────────────────────────────┘                          └───────┬───────────────┬───────┘
                                                                  │ TypeORM       │ HTTP (timeout 5 s)
                                                                  ▼               ▼
                                                   ┌────────────────────┐  ┌──────────────────────────┐
                                                   │ PostgreSQL 15      │  │ Agregador de Métricas    │
                                                   │ users · services · │  │ UniLaunch                │
                                                   │ metric_collections │  │ GET /services            │
                                                   └────────────────────┘  │ GET /metrics/{id}        │
                                                                           └──────────────────────────┘
```

Os três componentes rodam em containers definidos em [`compose.yaml`](../../compose.yaml), na rede `greener-network`.
O frontend **nunca** chama as APIs da UniLaunch diretamente: todo acesso externo passa pelo backend.

## 2. Componentes e responsabilidades

### 2.1 Backend (`greener/backend`)

| Módulo | Arquivos principais | Responsabilidade |
|---|---|---|
| `AppModule` | [`app.module.ts`](../backend/src/app.module.ts) | Carrega variáveis de ambiente (`ConfigModule`), configura o TypeORM e importa os demais módulos |
| `AuthModule` | [`auth/`](../backend/src/auth) | Login com e-mail e senha, hash bcrypt (`PasswordHasherService`), emissão de JWT e `JwtAuthGuard` |
| `ServicesModule` | [`services/`](../backend/src/services) | Consulta pública dos serviços cadastrados |
| `AggregatorModule` | [`modules/aggregator/`](../backend/src/modules/aggregator) | Cliente HTTP do Agregador, validação do contrato da resposta e sincronização (*upsert*) dos serviços |
| `MetricsModule` | [`metrics/`](../backend/src/metrics) | Ciclo periódico de coleta, gravação das coletas, atualização de estados e consulta de histórico |

Camadas dentro de cada módulo:

- **Controllers** recebem a requisição, aplicam pipes de validação (`ValidationPipe`, `ParseUUIDPipe`) e devolvem JSON.
- **Services** concentram as regras de negócio (autenticação, transições de estado, validação do contrato).
- **Persistência** é feita pelo `Repository<Entity>` do TypeORM, recebido por injeção de dependência (`@InjectRepository`).
- **Entidades** ficam em [`entities/`](../backend/src/entities) e as **migrações** em [`migrations/`](../backend/src/migrations).

### 2.2 Frontend (`greener/frontend`)

| Pasta | Responsabilidade |
|---|---|
| `pages/` | Telas, uma por rota (`HomePage`, `AdminPage`, `ComparePage`, `NotFoundPage`) |
| `components/` | Elementos reutilizáveis (`AppLayout`, `LoginModal`, `StatusBadge`, `ProtectedRoute`...) |
| `services/` | Chamadas HTTP (`http.ts` com instâncias `publicApi` e `privateApi`), tratamento de erros e sessão |
| `hooks/` | Lógica reutilizável (`useAuth`, `useLogout`, `useLoginRedirect`) |
| `contexts/` e `providers/` | Estado compartilhado de autenticação (`AuthContext`, `AuthProvider`, `AppProviders`) |

Detalhes em [`frontend/README.md`](../frontend/README.md).

### 2.3 Banco de dados

| Tabela | Conteúdo |
|---|---|
| `users` | Usuários administrativos; senha armazenada apenas como hash bcrypt (`password_hash`, `select: false`) |
| `services` | Serviços descobertos: identificador externo, nome, endpoint de métricas, estado e localização |
| `metric_collections` | Série temporal das coletas (CPU, memória, armazenamento, rede e instante), ligada a `services` por chave estrangeira |

Todas as chaves primárias são UUID. O DER está em [`diagramas/DER_GreenER.png`](diagramas/DER_GreenER.png).

## 3. Fluxo de dados

### 3.1 Descoberta de serviços

1. Na inicialização do backend, o `ServiceDiscoveryService` chama `AggregatorClientService.fetchDiscoveredServices()`.
2. O cliente faz `GET {AGGREGATOR_API_URL}/services` com timeout de `AGGREGATOR_TIMEOUT` ms.
3. O `aggregator.mapper` valida cada item: itens sem `id` ou `name` são descartados e a descoberta passa a ser considerada incompleta.
4. Os serviços válidos são gravados com *upsert* pela coluna `external_id`, preservando valores anteriores quando um campo não vem na resposta.
5. Se a descoberta estiver completa, serviços ausentes da lista são marcados como `UNAVAILABLE` (o histórico é mantido).

> **Limitação conhecida:** a descoberta roda apenas na inicialização. A execução periódica está prevista para a Sprint 2.

### 3.2 Coleta periódica de métricas

1. O `MetricsService` agenda o primeiro ciclo ao iniciar o módulo e, ao final de cada ciclo, agenda o próximo após `METRICS_COLLECTION_INTERVAL_SECONDS`.
2. Para cada serviço cadastrado, chama `GET {AGGREGATOR_API_URL}{endpoint}`.
3. A resposta é validada contra o contrato (CPU entre 0 e 100, demais valores não negativos).
4. Resultado de cada serviço:

| Situação | Ação |
|---|---|
| Resposta válida | Grava a coleta e muda o estado para `ACTIVE` |
| Resposta fora do contrato ou serviço sem endpoint | Muda o estado para `NO_METRICS` |
| HTTP 404 (serviço removido ou sem métricas, segundo a OpenAPI) | Muda o estado para `NO_METRICS` |
| Timeout, falha de conexão ou HTTP 500 | Muda o estado para `UNAVAILABLE` |

5. A falha de um serviço é registrada em log e **não interrompe** a coleta dos demais.

### 3.3 Autenticação

1. O usuário envia e-mail e senha pelo modal de login do frontend.
2. O backend valida o DTO, busca o usuário e compara a senha com o hash bcrypt.
3. Em caso de sucesso, devolve `access_token` (JWT) e os dados básicos do usuário.
4. O frontend guarda o token em memória e o envia como `Authorization: Bearer` apenas nas chamadas da área administrativa (`privateApi`).

## 4. Decisões arquiteturais

| Decisão | Justificativa |
|---|---|
| **TypeORM com migrações versionadas** (`synchronize: false`) | O esquema do banco evolui de forma rastreável e reproduzível em um banco vazio |
| **Agendamento com `setTimeout` encadeado** em vez de Cron | O próximo ciclo só começa depois que o anterior termina, o que evita ciclos sobrepostos quando o Agregador está lento |
| **Coleta de todos os serviços, inclusive `UNAVAILABLE` e `NO_METRICS`** | Permite que um serviço volte a `ACTIVE` sozinho quando o Agregador voltar a responder |
| **Erros tipados no cliente do Agregador** (`AggregatorTimeoutError`, `AggregatorHttpError`...) | O coletor decide o estado do serviço pelo tipo de falha, sem depender de mensagens de texto |
| **Validação do contrato antes de gravar** | Evita apresentar métricas inválidas como corretas |
| **Token JWT apenas em memória no frontend** | Reduz a exposição do token a ataques XSS; a sessão termina ao recarregar a página |
| **Duas instâncias Axios** (`publicApi` e `privateApi`) | Um token vencido não quebra o dashboard público, e um 401 no login não é confundido com sessão expirada |
| **Status do serviço comunicado por cor, forma e texto** | A informação não depende apenas de cor (acessibilidade) |

## 5. Evolução prevista

| Sprint | Mudança arquitetural |
|---|---|
| Sprint 2 | Integração com o serviço de intensidade de carbono; cálculo de energia e CO₂e ([`calculos.md`](calculos.md)); camada de repositories por módulo; descoberta periódica; Swagger |
| Sprint 3 | Endpoints de ranking e comparação; revisão final da arquitetura |
