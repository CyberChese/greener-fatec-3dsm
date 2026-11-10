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
│   ├── metrics.controller.ts  # summary, configuração de coleta e histórico
│   ├── metrics.controller.spec.ts # Testes do controller de métricas
│   ├── dto/metrics-summary.dto.ts # Schemas do resumo público
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

> Os arquivos vazios `src/modules/coletas.*` e a entidade duplicada `src/services/entities/service.entity.ts` foram removidos (TP03). A única entidade de serviço é `src/entities/service.entity.ts`.

## Variáveis de ambiente

O backend lê o `.env` da raiz do repositório (modelo em [`.env.example`](../../.env.example)).

| Variável | Uso |
|---|---|
| `PORT` | Porta HTTP (definida como `3001` no `compose.yaml`) |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Conexão com o PostgreSQL |
| `JWT_SECRET`, `JWT_EXPIRATION` | Assinatura e validade do token |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | Tentativas de login por IP ou e-mail na janela (padrão 5) |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | Janela do limite de login em segundos (padrão 60) |
| `LOCAL_DEVELOPMENT_SEED_ENABLED` | Habilita o seed somente com `NODE_ENV=development` e valor `true` |
| `LOCAL_DEVELOPMENT_SEED_EMAIL`, `LOCAL_DEVELOPMENT_SEED_PASSWORD` | Credenciais fornecidas para o seed local; não são registradas em logs |
| `AGGREGATOR_API_URL`, `AGGREGATOR_SERVICES_PATH`, `AGGREGATOR_TIMEOUT` | Acesso ao Agregador de Métricas |
| `CARBON_INTENSITY_API_URL` | URL base da API oficial de intensidade de carbono |
| `CARBON_INTENSITY_TIMEOUT_MS` | Timeout da consulta de carbono (1 a 5000 ms; padrão 5000) |
| `CARBON_INTENSITY_FALLBACK_G_PER_KWH` | Fator de fallback não negativo em gCO₂e/kWh; defina no ambiente para que indisponibilidades possam usar fallback |
| `METRICS_COLLECTION_INTERVAL_SECONDS` | Intervalo entre ciclos de coleta (inteiro positivo; padrão 30) |
| `FRONTEND_ORIGIN` | Origem permitida pelo CORS |

## Execução

### Com Docker (recomendado)

Na raiz do repositório, defina no `.env` um `JWT_SECRET` aleatório com pelo menos 32 bytes e informe `CARBON_INTENSITY_FALLBACK_G_PER_KWH` com o fator aprovado para o ambiente. Para criar um usuário de desenvolvimento, defina também `LOCAL_DEVELOPMENT_SEED_ENABLED=true` e suas próprias `LOCAL_DEVELOPMENT_SEED_EMAIL` e `LOCAL_DEVELOPMENT_SEED_PASSWORD`. O seed recusa qualquer outro ambiente e nunca imprime as credenciais.

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec greener-backend npm run migration:run
# Opcional: execute somente se o seed local estiver habilitado no .env
docker compose exec greener-backend npm run seed
```

A API fica em <http://localhost:3001/api> e a documentação interativa em <http://localhost:3001/api/docs>. O seed local é opcional e não possui credenciais padrão.

### Sem Docker

Requer Node.js 24.15 ou superior dentro da linha 24 (`^24.15.0`, declarado em `engines`) e um PostgreSQL acessível. Ajuste `POSTGRES_HOST=localhost` no `.env`, configure a chave JWT, o fallback de carbono e, se necessário, as variáveis explícitas do seed local; depois rode:

```bash
cd greener/backend
npm ci
npm run migration:run
npm run seed
npm run start:dev
```

## Banco de dados e migrações (TypeORM)

O esquema é criado **somente** por migrações (`synchronize: false`). As migrações ficam em `src/migrations`:

| Migração | Alteração |
|---|---|
| `1791678624275-CreateInitialSchema` | Cria `users`, `services`, `metric_collections`, o tipo `service_status`, índices base e chave estrangeira |
| `1792014000000-ExpandMetricCollectionPrecision` | Amplia a precisão das colunas de métricas para `numeric(20,6)` |
| `1792082024000-MakeServiceEndpointNullable` | Permite serviços sem endpoint de métricas |
| `1792082025000-AddEnergyKwhToMetricCollection` | Adiciona o campo `energy_kwh` às coletas |
| `1792082026000-AddRegionCodeToServices` | Adiciona o `region_code` opcional aos serviços |
| `1793308800000-AddCarbonIntensityData` | Adiciona intensidade de carbono, emissões em gramas e indicação de fallback às coletas |
| `1793404800000-OptimizeMetricCollectionIndexes` | Cria índice para totais com `INCLUDE` e remove índices redundantes |
| `1793491200000-AddCo2eKgToMetricCollections` | Adiciona o campo `co2e_kg` às coletas |

| Comando | O que faz |
|---|---|
| `npm run migration:run` | Aplica as migrações pendentes |
| `npm run migration:show` | Lista as migrações e indica as já aplicadas |
| `npm run migration:revert` | Desfaz a última migração |
| `npm run migration:generate -- src/migrations/NomeDaMigracao` | Gera uma migração a partir das entidades |
| `npm run seed` | Cria o usuário local configurado (somente em desenvolvimento explicitamente habilitado; não duplica se já existir) |

## Testes

```bash
npm test          # testes unitários
npm run test:cov  # testes com relatório de cobertura
```

| Arquivo | O que testa |
|---|---|
| `metrics/metrics.service.spec.ts` | Gravação das coletas, estados `ACTIVE`, `NO_METRICS` e `UNAVAILABLE`, continuidade do ciclo após falhas e filtro do histórico |
| `modules/carbon-intensity/carbon-intensity-client.service.spec.ts` | Contrato da API, timeout, região ausente/inexistente, resposta inválida e fallback |
| `engine/energy-engine.service.spec.ts` | Cálculo da energia (kWh) a partir de CPU e memória no intervalo de coleta |
| `engine/carbon-engine.service.spec.ts` | Cálculo, persistência, precisão e reprocessamento de CO₂e |
| `modules/aggregator/service-discovery.service.spec.ts` | Serviços omitidos marcados como `UNAVAILABLE` só em descoberta completa, preservação do estado existente e nenhuma alteração quando a descoberta falha |
| `modules/aggregator/aggregator-client.service.spec.ts` | Classificação da resposta de descoberta como completa ou incompleta |
| `metrics/metrics.controller.spec.ts` | Resumo público, configuração de coleta e respostas do controller de métricas |
| `auth/auth.service.spec.ts` | Login válido, senha incorreta e usuário inexistente |
| `auth/login-rate-limit.guard.spec.ts` | Bloqueio `429`, `Retry-After`, recuperação após a janela e limites por IP/e-mail |
| `config/configuration.spec.ts` | Exigência da chave JWT e validação das opções do limite de login |

Os testes usam *doubles* no lugar do banco e do Agregador. Eles exigem **Node.js 24.15 ou superior dentro da linha 24**, porque o NestJS 12 é distribuído como ESM. A imagem Docker do backend usa Node 24, então os testes também rodam dentro do container: `docker compose exec greener-backend npm test`.

## Outros comandos

| Comando | O que faz |
|---|---|
| `npm run build` | Compila para `dist/` |
| `npm run start:dev` | Executa com recarga automática |
| `npm run start:prod` | Executa a versão compilada |
| `npm run lint` | Executa o oxlint |

## Endpoints

Todas as rotas usam o prefixo global `/api`:

| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/api` | Público | Verificação de que a API está no ar |
| `POST` | `/api/auth/login` | Público | Autenticação e emissão do JWT |
| `GET` | `/api/auth/profile` | JWT | Dados do usuário autenticado |
| `GET` | `/api/services` | Público | Lista de serviços e seus estados |
| `GET` | `/api/services/:id/history` | Público | Histórico de coletas do serviço |
| `GET` | `/api/metrics/summary` | Público | Totais de energia, CO₂e e serviços por estado |
| `GET` | `/api/metrics/collection-config` | Público | Intervalo de coleta e última coleta |
| — | `/api/docs` | Público | Swagger UI com rotas, parâmetros, schemas e respostas |

As rotas protegidas exigem `Authorization: Bearer <token>`. A documentação completa está em [`docs/api.md`](../docs/api.md).
