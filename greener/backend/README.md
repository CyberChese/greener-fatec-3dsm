# GreenER — Backend

API REST do GreenER, construída com **NestJS 12 + TypeScript**, **TypeORM** e **PostgreSQL**.
Responsável por autenticar o administrador, descobrir os serviços no Agregador de Métricas da UniLaunch, coletar periodicamente as métricas de cada serviço e disponibilizar os dados ao frontend.

## Organização dos módulos

```text
src/
├── main.ts                  # Inicialização: prefixo /api, CORS e ValidationPipe global
├── app.module.ts            # ConfigModule, conexão TypeORM e importação dos módulos
├── data-source.ts           # DataSource usado pela CLI do TypeORM (migrações e seed)
├── auth/                    # AuthModule
│   ├── auth.controller.ts   # POST /auth/login, GET /auth/profile
│   ├── auth.service.ts      # Validação de credenciais e emissão do JWT
│   ├── password-hasher.service.ts  # Hash e comparação com bcrypt
│   ├── dto/login.dto.ts     # Validação do corpo do login
│   ├── strategies/jwt.strategy.ts  # Validação do token (Passport)
│   └── guards/jwt-auth.guard.ts    # Guard das rotas protegidas
├── services/                # ServicesModule — GET /services
├── metrics/                 # MetricsModule
│   ├── metrics.controller.ts  # GET /metrics/collection-config, GET /services/:id/history
│   └── metrics.service.ts     # Ciclo periódico de coleta, estados e histórico
├── modules/aggregator/      # AggregatorModule
│   ├── aggregator-client.service.ts   # Cliente HTTP do Agregador (timeout e erros tipados)
│   ├── aggregator.mapper.ts           # Validação e conversão da resposta de descoberta
│   ├── aggregator.errors.ts           # Hierarquia de erros do cliente
│   └── service-discovery.service.ts   # Upsert dos serviços descobertos
├── modules/carbon-intensity/          # Cliente HTTP da API de intensidade de carbono
├── entities/                # User, Service, MetricCollection
├── migrations/              # Migrações versionadas do banco
└── seeds/user.seed.ts       # Usuário de teste
```

Cada módulo separa responsabilidades: os **controllers** recebem as requisições e validam parâmetros, os **services** concentram as regras de negócio e a **persistência** é feita pelo `Repository` do TypeORM, recebido por injeção de dependência.
Detalhes em [`docs/arquitetura.md`](../docs/arquitetura.md).

> Os arquivos `src/modules/coletas.*` e `src/services/entities/service.entity.ts` não são usados pela aplicação e serão removidos ou implementados na Sprint 2.

## Variáveis de ambiente

O backend lê o `.env` da raiz do repositório (modelo em [`.env.example`](../../.env.example)).

| Variável | Uso |
|---|---|
| `PORT` | Porta HTTP (definida como `3001` no `compose.yaml`) |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Conexão com o PostgreSQL |
| `JWT_SECRET`, `JWT_EXPIRATION` | Assinatura e validade do token |
| `AGGREGATOR_API_URL`, `AGGREGATOR_SERVICES_PATH`, `AGGREGATOR_TIMEOUT` | Acesso ao Agregador de Métricas |
| `CARBON_INTENSITY_API_URL` | URL base da API oficial de intensidade de carbono |
| `CARBON_INTENSITY_TIMEOUT_MS` | Timeout da consulta de carbono (1 a 5000 ms; padrão 5000) |
| `CARBON_INTENSITY_FALLBACK_G_PER_KWH` | Fator de fallback não negativo em gCO₂e/kWh; defina no ambiente para que indisponibilidades possam usar fallback |
| `METRICS_COLLECTION_INTERVAL_SECONDS` | Intervalo entre ciclos de coleta (inteiro positivo; padrão 30) |
| `FRONTEND_ORIGIN` | Origem permitida pelo CORS |

## Execução

### Com Docker (recomendado)

Na raiz do repositório:

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec greener-backend npm run migration:run
docker compose exec greener-backend npm run seed
```

A API fica em <http://localhost:3001/api>. O seed cria o usuário `teste@greener.com` com a senha `senha123` (somente para desenvolvimento).

### Sem Docker

Requer Node.js 24 e um PostgreSQL acessível. Ajuste `POSTGRES_HOST=localhost` no `.env` e rode:

```bash
cd greener/backend
npm install
npm run migration:run
npm run seed
npm run start:dev
```

## Banco de dados e migrações (TypeORM)

O esquema é criado **somente** por migrações (`synchronize: false`). As migrações ficam em `src/migrations`:

| Migração | Alteração |
|---|---|
| `1791678624275-CreateInitialSchema` | Cria `users`, `services`, `metric_collections`, o tipo `service_status`, índices e chave estrangeira |
| `1792014000000-ExpandMetricCollectionPrecision` | Amplia a precisão das colunas de métricas para `numeric(20,6)` |
| `1792082024000-MakeServiceEndpointNullable` | Permite serviços sem endpoint de métricas |
| `1793308800000-AddCarbonIntensityData` | Persiste o código regional e os resultados/auditoria de intensidade de carbono |

| Comando | O que faz |
|---|---|
| `npm run migration:run` | Aplica as migrações pendentes |
| `npm run migration:show` | Lista as migrações e indica as já aplicadas |
| `npm run migration:revert` | Desfaz a última migração |
| `npm run migration:generate -- src/migrations/NomeDaMigracao` | Gera uma migração a partir das entidades |
| `npm run seed` | Cria o usuário de teste (não duplica se já existir) |

## Testes

```bash
npm test          # testes unitários
npm run test:cov  # testes com relatório de cobertura
```

| Arquivo | O que testa |
|---|---|
| `metrics/metrics.service.spec.ts` | Gravação das coletas, estados `ACTIVE`, `NO_METRICS` e `UNAVAILABLE`, continuidade do ciclo após falhas e filtro do histórico |
| `modules/carbon-intensity/carbon-intensity-client.service.spec.ts` | Contrato da API, timeout, região ausente/inexistente, resposta inválida e fallback |
| `modules/aggregator/service-discovery.service.spec.ts` | Serviços omitidos marcados como `UNAVAILABLE` só em descoberta completa, preservação do estado existente e nenhuma alteração quando a descoberta falha |
| `modules/aggregator/aggregator-client.service.spec.ts` | Classificação da resposta de descoberta como completa ou incompleta |
| `auth/auth.service.spec.ts` | Login válido, senha incorreta e usuário inexistente |

Os testes usam *doubles* no lugar do banco e do Agregador. Eles exigem **Node.js 24.9 ou superior**, porque o NestJS 12 é distribuído como ESM. A imagem Docker ainda usa Node 22, por isso `npm test` não roda dentro do container nesta versão (pendência da Sprint 1, prevista para a Sprint 2).

## Outros comandos

| Comando | O que faz |
|---|---|
| `npm run build` | Compila para `dist/` |
| `npm run start:dev` | Executa com recarga automática |
| `npm run start:prod` | Executa a versão compilada |
| `npm run lint` | Executa o oxlint |

## Endpoints

Documentação completa em [`docs/api.md`](../docs/api.md).
