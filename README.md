# 🌱 GreenER - Plataforma para Estimativa do Impacto Ambiental de Aplicações de Software

[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%20%2B%20TypeScript-E0234E?logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Container-Docker%20%26%20Compose-2496ED?logo=docker)](https://www.docker.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens)](https://jwt.io/)

> **Entrega atual:** Sprint 2 concluída — autenticação, descoberta, coleta, cálculo ambiental, exibição de energia e CO₂e, fallback de carbono e documentação Swagger.

---

## 📌 Visão Geral do Projeto

O **GreenER** é uma plataforma web para monitorar aplicações de software distribuídas e transformar métricas técnicas de infraestrutura (CPU, memória, armazenamento e rede) em **indicadores ambientais**, estimando o **consumo energético (kWh)** e a **emissão de dióxido de carbono equivalente (CO₂e)**.

O projeto foi concebido no âmbito da disciplina de **Aprendizagem Baseada em Projetos (ABP)** do 3º semestre do curso de Desenvolvimento de Software Multiplataforma (DSM) da **FATEC Jacareí** (período 2026-2), em parceria com a **UniLaunch**.

### 🎯 Problema & Solução

* **Problema:** empresas operam dezenas ou centenas de microsserviços em nuvem. As métricas tradicionais de telemetria medem desempenho e disponibilidade, mas não oferecem visibilidade sobre o custo ambiental e a pegada de carbono da infraestrutura.
* **Solução:** o GreenER descobre dinamicamente os serviços ativos no Agregador de Métricas da UniLaunch, coleta periodicamente as métricas de cada serviço e, a partir da intensidade de carbono de cada região, estima o consumo de energia e as emissões, apresentando rankings, histórico e visualização geográfica em um dashboard.

---

## ✅ Funcionalidades

### Implementadas (Sprint 2)

- Ambiente completo com Docker Compose: frontend, backend e PostgreSQL.
- Esquema do banco (`users`, `services`, `metric_collections`) criado por migrações TypeORM.
- Login administrativo com e-mail e senha, senha com hash bcrypt e emissão de JWT.
- Rota protegida por JWT (`GET /api/auth/profile`).
- Descoberta de serviços no Agregador de Métricas da UniLaunch, com gravação da localização (país, região, cidade e coordenadas).
- Coleta periódica de métricas de CPU, memória, armazenamento e rede, com histórico consultável por período.
- Tratamento de falhas: serviços inalcançáveis ficam `UNAVAILABLE`, serviços sem métricas válidas ficam `NO_METRICS`, e a falha de um serviço não interrompe a coleta dos demais.
- Frontend com Observatório público (intervalo e última coleta), modal de login e Área do Administrador protegida.
- Testes unitários com Jest para coleta, descoberta, autenticação, cálculo ambiental e integrações HTTP simuladas.
- Documentação interativa Swagger em `/api/docs`.

Distribuição das entregas no [plano de entregas](greener/docs/plano-de-entregas.md).

---

## 🎨 Design System e Wireframes (Figma)

- **Projeto no Figma:** [Acessar Projeto no Figma](https://www.figma.com/design/xfX1ubXK9GIpWeV8TNYL1q/greenER---ABP-3%C2%BASEMESTRE?node-id=4-3&t=uQXMxQQpH5LZaIfk-1)
- **🔗 Protótipo interativo (navegável):** [Abrir protótipo](https://www.figma.com/proto/xfX1ubXK9GIpWeV8TNYL1q/greenER---ABP-3%C2%BASEMESTRE?node-id=10-41&t=QK9tYfSXJ4x1c5a1-0&scaling=min-zoom&content-scaling=fixed&page-id=4%3A3&starting-point-node-id=10%3A41&show-proto-sidebar=1)

Usuários, tarefas, fluxo de navegação e decisões de interface: [`greener/docs/interface.md`](greener/docs/interface.md).

### Teste de usabilidade (IHC)

Avaliação inicial do protótipo com 2 participantes, com roteiro de tarefas, observação direta e inspeção heurística (Nielsen e WCAG 2.1).

- **Resultado:** os participantes aprovaram a navegação, as cores e o design.
- **Pontos de fricção e ajustes:** contraste das bordas, estados do login, confirmação de ação destrutiva, consistência de contagens e idioma.
- **Próximo passo:** avaliação com usuários representativos na Sprint 3.

📄 **Relatório completo:** [`greener/docs/ihc/relatorio-usabilidade.md`](greener/docs/ihc/relatorio-usabilidade.md)

---

## 🏗️ Arquitetura e Fluxo de Dados

O backend em **NestJS** consulta o Agregador de Métricas da UniLaunch, persiste o histórico no **PostgreSQL** e alimenta a interface em **React**. O frontend nunca chama as APIs da UniLaunch diretamente.

```text
┌─────────────────────────────────────────────────────────┐
│               Frontend (React + Vite)                   │
│        Observatório · Login · Área do Administrador     │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / REST  (/api)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                     │
│     auth  ·  services  ·  metrics  ·  aggregator        │
└──────────────┬────────────────────────────┬─────────────┘
               │ TypeORM                    │ HTTP (timeout 5 s)
               ▼                            ▼
┌──────────────────────────┐    ┌─────────────────────────┐
│   Banco PostgreSQL       │    │   APIs UniLaunch        │
│ - users                  │    │ - Metrics Aggregator    │
│ - services               │    │ - Carbon Intensity API  │
│ - metric_collections     │    │   (Sprint 2)            │
└──────────────────────────┘    └─────────────────────────┘
```

Componentes, fluxos e decisões arquiteturais: [`greener/docs/arquitetura.md`](greener/docs/arquitetura.md).

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia | Uso no projeto |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript, Vite, Tailwind CSS, Axios, React Router | Interface web |
| **Backend** | NestJS 12 + TypeScript | API REST organizada em módulos, controllers e services |
| **Banco de Dados** | PostgreSQL 15 + TypeORM | Persistência com migrações versionadas |
| **Autenticação** | JWT (Passport) + bcrypt | Proteção das rotas administrativas |
| **Testes** | Jest (backend) e Vitest (frontend) | Testes unitários executáveis dentro dos containers |
| **Containerização** | Docker & Docker Compose | Execução unificada dos três serviços |
| **Runtime** | Node.js 24 LTS (`^24.15.0`) | Imagens Docker (`node:24-alpine`), campo `engines` dos dois `package.json` e CI |

---

## 📂 Estrutura do Repositório

```text
.
├── README.md                  # Este arquivo
├── compose.yaml               # Orquestração de frontend, backend e PostgreSQL
├── .env.example               # Modelo de variáveis de ambiente (sem segredos)
└── greener/
    ├── frontend/              # React + TypeScript (ver frontend/README.md)
    │   ├── Dockerfile
    │   └── src/               # pages, components, services, hooks, contexts, providers
    ├── backend/               # NestJS + TypeScript (ver backend/README.md)
    │   ├── Dockerfile
    │   └── src/
    │       ├── auth/          # Login, JWT, bcrypt e guard
    │       ├── services/      # Consulta de serviços
    │       ├── metrics/       # Coleta periódica e histórico
    │       ├── modules/aggregator/  # Cliente e descoberta no Agregador
    │       ├── entities/      # Entidades TypeORM
    │       ├── migrations/    # Migrações do banco
    │       └── seeds/         # Usuário de teste
    └── docs/                  # Documentação do projeto (ver docs/README.md)
```

---

## ⚡ Execução com Docker

### Pré-requisitos

* [Git](https://git-scm.com/)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) com Docker Compose

### 🚀 Passo a passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/CyberChese/greener-fatec-3dsm.git
   cd greener-fatec-3dsm
   ```

2. **Criar o arquivo de variáveis de ambiente** a partir do modelo. Configure `POSTGRES_PASSWORD`, informe `CARBON_INTENSITY_FALLBACK_G_PER_KWH` com o fator aprovado para o ambiente e gere `JWT_SECRET` com pelo menos 32 bytes aleatórios antes de iniciar o backend:
   ```bash
   cp .env.example .env
   ```

3. **Subir os containers:**
   ```bash
   docker compose up --build -d
   ```

4. **Criar as tabelas no banco** (necessário na primeira execução e após novas migrações):
   ```bash
   docker compose exec greener-backend npm run migration:run
   ```

5. **Opcionalmente, criar um usuário local** para o login: no `.env`, habilite `LOCAL_DEVELOPMENT_SEED_ENABLED=true` e informe `LOCAL_DEVELOPMENT_SEED_EMAIL` e `LOCAL_DEVELOPMENT_SEED_PASSWORD` com valores próprios. O seed só funciona com `NODE_ENV=development`.
   ```bash
   docker compose exec greener-backend npm run seed
   ```
   As credenciais são lidas somente pelo backend e nunca são impressas pelo seed.

6. **Acessar:**

   | Serviço | Endereço |
   |---|---|
   | Frontend | <http://localhost:3000> |
   | API | <http://localhost:3001/api> |
   | Swagger UI | <http://localhost:3001/api/docs> |
   | OpenAPI JSON | <http://localhost:3001/api/docs/openapi.json> |
   | PostgreSQL | `localhost:5432` |

7. **Encerrar:**
   ```bash
   docker compose down
   ```
   Para apagar também os dados do banco: `docker compose down -v`.

### ✔️ Como verificar a versão entregue

| Verificação | Resultado esperado |
|---|---|
| Abrir <http://localhost:3000> | Observatório com o intervalo de coleta e a última coleta registrada |
| Clicar em "Área do Administrador" e entrar com o usuário local configurado | Acesso à Área do Administrador com a sessão autenticada |
| `GET http://localhost:3001/api/services` | Lista de serviços descobertos e seus estados |
| `GET http://localhost:3001/api/metrics/collection-config` | Intervalo de coleta e horário da última coleta |
| `GET http://localhost:3001/api/metrics/summary` | Totais de energia, CO₂e e serviços por estado |
| Abrir <http://localhost:3001/api/docs> | Swagger UI com rotas, parâmetros, schemas e respostas |
| `GET http://localhost:3001/api/auth/profile` sem token | HTTP `401` |

---

## ⚙️ Variáveis de Ambiente

Definidas no arquivo `.env` na raiz (modelo em [`.env.example`](.env.example)):

| Variável | Uso | Valor do modelo |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciais e nome do banco | `greener_user`, `troque_esta_senha_local`, `greener_db` |
| `POSTGRES_HOST`, `POSTGRES_PORT` | Endereço do banco visto pelo backend | `greener-postgres`, `5432` |
| `JWT_SECRET` | Chave aleatória de pelo menos 32 bytes para assinatura do JWT; obrigatória fora de testes | Definida localmente; nunca no frontend |
| `JWT_EXPIRATION` | Validade do token | `1d` |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | Tentativas de login por origem ou identidade (padrão `5`) | `5` |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | Janela do limite de login em segundos (padrão `60`) | `60` |
| `LOCAL_DEVELOPMENT_SEED_ENABLED` | Habilita explicitamente o seed local (exige `NODE_ENV=development`) | `false` |
| `LOCAL_DEVELOPMENT_SEED_EMAIL`, `LOCAL_DEVELOPMENT_SEED_PASSWORD` | Credenciais locais fornecidas ao seed | Vazias no modelo |
| `AGGREGATOR_API_URL` | URL base do Agregador de Métricas | `https://metrics.unilaunch.org` |
| `AGGREGATOR_SERVICES_PATH` | Rota de descoberta | `/services` |
| `AGGREGATOR_TIMEOUT` | Timeout das chamadas ao Agregador (ms) | `5000` |
| `METRICS_COLLECTION_INTERVAL_SECONDS` | Intervalo entre ciclos de coleta (s) | `30` |
| `CARBON_INTENSITY_API_URL` | URL base da API de intensidade de carbono | `https://carbon.unilaunch.org` |
| `CARBON_INTENSITY_TIMEOUT_MS` | Timeout da API de intensidade de carbono (ms) | `5000` |
| `CARBON_INTENSITY_FALLBACK_G_PER_KWH` | Fator de fallback aprovado, em gCO₂e/kWh | Definido localmente |
| `VITE_API_URL` | Endereço da API acessado pelo **navegador** | `http://localhost:3001/api` |
| `FRONTEND_ORIGIN` | Origem permitida pelo CORS do backend | `http://localhost:3000` |

O arquivo `.env` não é versionado (está no `.gitignore`).

### Coleta periódica de métricas

* O primeiro ciclo começa `METRICS_COLLECTION_INTERVAL_SECONDS` após a inicialização do backend, e cada ciclo seguinte começa esse mesmo tempo depois do término do anterior, sem sobreposição.
* Para cada serviço com endpoint de métricas, o coletor chama `GET {AGGREGATOR_API_URL}{metrics_path}`.
* Resposta válida grava a coleta e define `ACTIVE`; resposta sem métricas válidas define `NO_METRICS`; timeout, falha de conexão, HTTP 404 ou HTTP 500 define `UNAVAILABLE`. As transições não apagam o histórico.
* A descoberta de serviços é executada na inicialização do backend.

Mapeamento dos campos do Agregador:

| Campo do Agregador | Campo persistido | Unidade |
| --- | --- | --- |
| `cpu_percent` | `cpu_usage` | percentual |
| `memory_gb` | `memory_usage` | GB |
| `disk_gb` | `storage_usage` | GB |
| `network_gb` | `network_io` | GB |

Contrato completo: [`greener/docs/contrato-agregador.md`](greener/docs/contrato-agregador.md).

---

## 🔌 Endpoints da API

Rotas implementadas na Sprint 2 (prefixo `/api`):

| Método | Endpoint | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api` | Público | Verificação de que a API está no ar |
| `POST` | `/api/auth/login` | Público | Autentica o usuário e retorna o JWT em `access_token` |
| `GET` | `/api/auth/profile` | JWT | Dados do usuário autenticado |
| `GET` | `/api/services` | Público | Serviços monitorados e seus estados (`ACTIVE`, `UNAVAILABLE`, `NO_METRICS`) |
| `GET` | `/api/services/:id/history?from=&to=` | Público | Histórico de coletas do serviço (datas ISO-8601, limites inclusivos) |
| `GET` | `/api/metrics/collection-config` | Público | Intervalo de coleta e horário da última coleta |
| `GET` | `/api/metrics/summary` | Público | Totais de energia, CO₂e e contagem por estado |

A documentação interativa está disponível em <http://localhost:3001/api/docs>. Ela descreve os parâmetros, schemas, respostas de sucesso e erros. Use o botão **Authorize** para informar um JWT nas rotas protegidas.

As rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>`.

As seguintes rotas administrativas ainda não estão implementadas e permanecem planejadas:

| Método | Endpoint | Acesso | Finalidade |
| :--- | :--- | :--- | :--- |
| `PUT` | `/api/config/interval` | JWT | Alterar o intervalo de coleta |
| `POST` | `/api/services/refresh` | JWT | Forçar a redescoberta dos serviços |

Parâmetros, respostas e códigos de erro: [`greener/docs/api.md`](greener/docs/api.md).

---

## 🗄️ Modelo de Dados

* **`users`**: id (UUID), nome, e-mail (único), hash da senha (bcrypt), data de criação.
* **`services`**: id (UUID), identificador externo (único), nome, endpoint de métricas, `region_code` opcional, status (`ACTIVE`, `UNAVAILABLE`, `NO_METRICS`), país, região, cidade, latitude, longitude, data de criação, última vez observado na descoberta.
* **`metric_collections`**: id (UUID), serviço (FK), CPU, memória, armazenamento, rede, energia em kWh, intensidade de carbono, CO₂e em gramas e quilogramas, fallback utilizado e instante da coleta.

O cálculo de energia usa CPU, memória e duração: `energy_kwh = potência_total × duração_segundos ÷ 3.600.000`. A emissão usa `co2e_g = energy_kwh × intensidade_gco2e_por_kwh` e `co2e_kg = co2e_g ÷ 1.000`. As fórmulas detalhadas estão em [`greener/docs/calculos.md`](greener/docs/calculos.md). DER em [`greener/docs/diagramas/DER_GreenER.png`](greener/docs/diagramas/DER_GreenER.png).

---

## 🧪 Testes

O backend possui testes unitários com Jest que cobrem a coleta de métricas e as transições de estado, a descoberta de serviços, o cliente do Agregador, a autenticação e o limite de tentativas, a configuração, os motores de energia e carbono e o fallback de intensidade. Os testes substituem o banco e as APIs externas por *doubles*. O frontend tem testes unitários com Vitest, em `greener/frontend/tests`.

Os testes exigem **Node.js 24.15 ou superior**, porque o NestJS 12 é distribuído como ESM. A política de runtime do projeto é **Node 24 LTS** em todos os lugares: imagens Docker (`node:24-alpine`), campo `engines` dos dois `package.json` (`^24.15.0`) e CI.

Pelo Docker (forma oficial), com os containers no ar:

```bash
docker compose exec greener-backend npm test
docker compose exec greener-frontend npm test
```

Sem Docker:

```bash
cd greener/backend && npm ci && npm test
cd ../frontend && npm ci && npm test
```

> Depois de trocar a versão do Node das imagens, suba de novo com `docker compose up --build -d --renew-anon-volumes`, para o `node_modules` do container ser recriado.

---

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| [`greener/docs/README.md`](greener/docs/README.md) | Índice da documentação |
| [`plano-de-entregas.md`](greener/docs/plano-de-entregas.md) | Critérios por sprint, responsáveis, evidências e participação |
| [`sprints/sprint-1.md`](greener/docs/sprints/sprint-1.md) | Sprint 1: backlog, histórias, DoD, review e retrospectiva |
| [`arquitetura.md`](greener/docs/arquitetura.md) | Componentes, fluxo de dados e decisões |
| [`api.md`](greener/docs/api.md) | Endpoints da API |
| [`interface.md`](greener/docs/interface.md) | Usuários, tarefas, protótipos e usabilidade |
| [`calculos.md`](greener/docs/calculos.md) | Dados de entrada e cálculos de energia e CO₂e |
| [`contrato-agregador.md`](greener/docs/contrato-agregador.md) | Contrato da API do Agregador de Métricas |
| [GitHub Projects](https://github.com/orgs/CyberChese/projects/2/views/3) | Kanban, histórias e tasks |

---

## 👥 Equipe do Projeto

| Nome | Função | Perfil no GitHub |
| :--- | :--- | :--- |
| **Gabriel Moura** | Scrum Master | [@gafmoura7](https://github.com/gafmoura7) |
| **Lucas Fernando Cobra** | Product Owner (PO) | [@LucasCobraFatec](https://github.com/LucasCobraFatec) |
| **Luka Gomes** | Developer | [@LukaGomes](https://github.com/LukaGomes) |
| **Gustavo Zago de Lima** | Developer | [@Gustavo-Zago](https://github.com/Gustavo-Zago) |
| **Isabelly Marinho** | Oracle Developer | [@isabellymarinho20](https://github.com/isabellymarinho20) |
| **Ronaldo** | Developer | [@RonaldoAvilaa](https://github.com/RonaldoAvilaa) |

---

## 📜 Licença e Créditos

Este projeto foi desenvolvido como **Aprendizagem Baseada em Projetos (ABP)** pelo time de alunos do **3º DSM da FATEC Jacareí (2026-2)** sob orientação dos professores e em parceria com a **UniLaunch**.
