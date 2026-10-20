# 🌱 GreenER — Sprint 1: Fundação, Autenticação, Descoberta e Ingestão de Métricas

Sprint dedicada a estruturar a base técnica da plataforma GreenER de ponta a ponta. O ambiente utiliza Docker para executar os serviços de forma unificada, PostgreSQL para persistência dos dados, NestJS para o backend, autenticação segura via JWT, descoberta automática de serviços e coleta periódica de métricas. O frontend é desenvolvido com React e TypeScript.

---

## 📊 Burndown e Demonstração

<img width="689" height="413" alt="Captura de tela 2026-10-17 184919" src="https://github.com/user-attachments/assets/08f3cf83-fe52-4330-9a67-2fbf92ef8a6a" />

---

- **Vídeo de demonstração da Sprint 1:** [Assistir à demonstração](https://youtu.be/ubfME7MER6U)

---

## 🎯 Objetivo da Sprint

Comprovar que a infraestrutura base e os fluxos críticos de ingestão do GreenER funcionam de ponta a ponta, incluindo:

- Containers em execução.
- Autenticação JWT.
- Descoberta de serviços ativos por meio do Agregador UniLaunch.
- Coleta periódica de métricas de infraestrutura.
- Tratamento resiliente de falhas de comunicação.

---

## 📦 Entregáveis Esperados

- [x] Execução dos serviços Frontend (React + Vite), Backend (NestJS) e Banco de Dados (PostgreSQL) com `docker compose up --build`.
- [x] Banco PostgreSQL com schema relacional (`services`, `metric_collections` e `users`) aplicado via migrações/ORM.
- [x] Módulo de autenticação (`AuthModule`, `AuthService`, `AuthController` e `JwtAuthGuard`) com hash de senhas usando Bcrypt e emissão de tokens JWT.
- [x] Cliente HTTP para comunicação com a API externa do Agregador de Métricas UniLaunch.
- [x] Lógica de *upsert* para cadastrar e atualizar serviços e seus metadados de geolocalização.
- [x] Agendador periódico para coleta de métricas de CPU, memória, armazenamento e rede (ver [alteração A1](#-alterações-no-planejamento)).
- [x] Tratamento de erros e exceções, identificando serviços inalcançáveis como `UNAVAILABLE` ou sem suporte a métricas como `NO_METRICS`.
- [x] Frontend React + TypeScript configurado com Axios, roteamento e tela de login integrada à autenticação JWT.
- [ ] Descoberta periódica de serviços: nesta versão a descoberta roda apenas na inicialização do backend (pendência, ver [Situação das tasks](#-situação-das-tasks-e-pendências)).

---

## 🚫 Fora do Escopo desta Sprint

Os seguintes itens serão desenvolvidos nas Sprints 2 e 3:

- Dashboard visual consolidado de métricas e gráficos em tempo real.
- Cálculo e conversão das métricas em estimativas de pegada de carbono (CO₂e) e consumo de energia em kWh.
- Ranking comparativo e relatórios de sustentabilidade com exportação em PDF/CSV.

---

## 📋 Tabela de Tasks — Sprint 1

**Período:** 29/09/2026 a 20/10/2026  
**Status:** 🟢 Entregue com pendências registradas  
**Total:** 60 pontos em 19 tasks

**Objetivo:** estabelecer a infraestrutura básica da plataforma GreenER, a autenticação administrativa via JWT e o motor de ingestão e monitoramento de serviços.

### Capacidade da equipe

A equipe tem 6 integrantes e distribuiu os 60 pontos de forma que cada pessoa assumisse entre 7 e 13 pontos, com ao menos uma task técnica ou de modelagem para cada integrante.

| Integrante | Tasks | Pontos |
|---|---|---:|
| Lucas Cobra | TASK-001, TASK-002, TASK-010, TASK-011 | 11 |
| Gustavo Zago | TASK-004, TASK-015, TASK-016 | 11 |
| Ronaldo | TASK-006, TASK-007, TASK-013 | 13 |
| Isabelly Marinho | TASK-003, TASK-005, TASK-017 | 9 |
| Gabriel Moura | TASK-014, TASK-018, TASK-019 | 9 |
| Luka Gomes | TASK-008, TASK-009, TASK-012 | 7 |
| **Total** | **19 tasks** | **60** |

### Justificativa da seleção dos itens

Os itens foram selecionados por dependência técnica: sem o ambiente Docker, o banco e a autenticação, nenhuma funcionalidade das sprints seguintes pode ser verificada; sem a descoberta e a coleta de métricas, não há dados para calcular energia e CO₂e na Sprint 2. Por isso as tasks de infraestrutura, autenticação, descoberta e coleta receberam prioridade crítica, e o dashboard e os cálculos ficaram fora do escopo desta sprint.

### Tabela de Rastreabilidade

A escala de pontos utiliza a sequência de Fibonacci:

- **1 ponto:** tipo/configuração.
- **2 pontos:** arquivo simples.
- **3 pontos:** lógica de média complexidade.
- **5 ou 8 pontos:** múltiplos arquivos ou lógica complexa.

| Task | Responsável | Tipo | Módulo | Nome | RFs | RNFs / RPs | Prioridade | Pts |
|---|---|---|---|---|---|---|---|---:|
| TASK-001 | Lucas Cobra (`@LucasCobraFatec`) | INFRA | Docker | Docker Compose unificado (React, NestJS, PostgreSQL) | — | RNF05 · RNF06 · RP05 | 🔴 Crítica | 3 |
| TASK-002 | Lucas Cobra (`@LucasCobraFatec`) | BE | Infra | Bootstrap do servidor NestJS e conexão TypeORM | — | RNF08 · RP02 · RP03 | 🔴 Crítica | 2 |
| TASK-003 | Isabelly Marinho (`@isabellymarinho20`) | DB | Modelagem | DER e Schema do PostgreSQL (`services`, `metrics`, `users`) | RF01 · RF10 | RP03 · RNF06 | 🔴 Crítica | 3 |
| TASK-004 | Gustavo Zago (`@Gustavo-Zago`) | UML | Modelagem | Diagrama de Casos de Uso no Astah | RF01 · RF03 · RF16 | RP06 | ⚪ Baixa | 3 |
| TASK-005 | Isabelly Marinho (`@isabellymarinho20`) | DB | Modelagem | Desenho e Diagrama da Modelagem do Banco de Dados (DER/MER) | RF01 · RF03 · RF10 | RP03 · RP06 · RNF04 | 🟡 Alta | 3 |
| TASK-006 | Ronaldo (`@RonaldoAvilaa`) | FIGMA | Design | Wireframes e Design System (Acessibilidade/IHC) | RF09 · RF16 | RNF01 · RNF02 · RP09 | 🟢 Média | 5 |
| TASK-007 | Ronaldo (`@RonaldoAvilaa`) | FIGMA | Design | Protótipo Navegável e Teste de Usabilidade com Usuários | — | RNF01 · RP09 | 🟢 Média | 3 |
| TASK-008 | Luka Gomes (`@LukaGomes`) | FE | Infra | Bootstrap React + TypeScript, Vite e Estrutura de Pastas | — | RNF01 · RP01 | 🟡 Alta | 2 |
| TASK-009 | Luka Gomes (`@LukaGomes`) | FE | Infra | Configuração do Cliente HTTP (Axios) e Rotas Públicas/Privadas | RF16 | RNF01 · RNF08 | 🟡 Alta | 2 |
| TASK-010 | Lucas Cobra (`@LucasCobraFatec`) | BE | Auth | DTOs de login, Hash Bcrypt e módulo JWT | RF16 | RNF06 · RP07 | 🟡 Alta | 3 |
| TASK-011 | Lucas Cobra (`@LucasCobraFatec`) | BE | Auth | `AuthController`, `AuthService` e `JwtAuthGuard` | RF16 | RNF06 · RNF07 | 🔴 Crítica | 3 |
| TASK-012 | Luka Gomes (`@LukaGomes`) | FE | Auth | Tela de Login, Estado de Autenticação e consumo do JWT | RF16 | RNF01 · RNF06 | 🟢 Média | 3 |
| TASK-013 | Ronaldo (`@RonaldoAvilaa`) | BE | Discovery | Cliente HTTP para consumo do Agregador de Métricas | RF01 · RF12 | RNF05 · RP04 | 🔴 Crítica | 5 |
| TASK-014 | Gabriel Moura (`@gafmoura7`) | BE | Discovery | Lógica de upsert de serviços e metadados de geolocalização | RF01 · RF02 · RF05 | RNF05 | 🔴 Crítica | 5 |
| TASK-015 | Gustavo Zago (`@Gustavo-Zago`) | BE | Metrics | Agendador de coleta periódica no `/metrics/{id_servico}` | RF03 · RF04 · RF10 | RNF03 · RNF04 | 🔴 Crítica | 5 |
| TASK-016 | Gustavo Zago (`@Gustavo-Zago`) | BE | Metrics | Tratamento de exceções, timeouts e marcação de `UNAVAILABLE`/`NO_METRICS` | RF05 · RF06 | RNF02 · RNF05 · RNF07 | 🟡 Alta | 3 |
| TASK-017 | Isabelly Marinho (`@isabellymarinho20`) | BE | Testes | Testes unitários do Coletor de Métricas e Autenticação JWT | RF01 · RF16 | RNF07 | 🟡 Alta | 3 |
| TASK-018 | Gabriel Moura (`@gafmoura7`) | DOCS | Docs | Atualização do `README.md` com instruções Docker e Swagger | — | RNF08 · RP06 | ⚪ Baixa | 2 |
| TASK-019 | Gabriel Moura (`@gafmoura7`) | DOCS | Gestão | Acompanhamento do Gráfico de Burndown da Sprint 1 | — | RP06 · RNF08 | ⚪ Baixa | 2 |

---

## 🗂️ Princípios de Leitura

| Símbolo | Significado | Escopo |
|---|---|---|
| BE | Backend | Código em NestJS/Node.js (`/backend`) |
| FE | Frontend | Código em React + TypeScript (`/frontend`) |
| INFRA | Infraestrutura | Containers Docker, Docker Compose e scripts de ambiente |
| FIGMA | Design/IHC | Protótipo de telas, Design System e avaliação de usabilidade |
| UML | Modelagem | Diagrama de Casos de Uso e Sequência no Astah |
| DB | Banco de Dados | Modelagem do esquema relacional (DER) no PostgreSQL |
| DOCS | Documentação | Documentação técnica, README, evidências e manuais |

Este documento funciona como visão operacional da Sprint 1.

---

## 📝 Legenda de Requisitos

### Requisitos Funcionais (RFs)

| Código | Descrição |
|---|---|
| RF01 | Descoberta automática de serviços ativos através da API do Agregador UniLaunch. |
| RF02 | Extração de metadados de serviços, como provedor de nuvem, região geográfica e zona. |
| RF03 | Coleta automatizada e periódica de métricas de infraestrutura (CPU, memória, armazenamento e rede, conforme o contrato do Agregador). |
| RF04 | Armazenamento de séries temporais de métricas de coleta no PostgreSQL. |
| RF05 | Detecção de falhas de conectividade e alteração dinâmica de estado (`ACTIVE`, `UNAVAILABLE`). |
| RF06 | Identificação de serviços sem suporte a métricas (`NO_METRICS`) sem interromper a coleta. |
| RF10 | Armazenamento histórico e persistente de métricas para consultas de sustentabilidade. |
| RF12 | Integração com o Agregador de Métricas da UniLaunch por meio de cliente HTTP resiliente. |
| RF16 | Autenticação administrativa obrigatória via e-mail/senha e emissão de token JWT. |

### Requisitos Não Funcionais (RNFs)

| Código | Descrição |
|---|---|
| RNF01 | Interface limpa, responsiva e acessível, desenvolvida em React + TypeScript. |
| RNF02 | Tempo de resposta adequado e resiliência com tratamento de timeout de 5 segundos. |
| RNF03 | Agendamento preciso de coletas automatizadas em segundo plano, sem sobreposição de ciclos. |
| RNF04 | Persistência relacional otimizada no PostgreSQL com chaves primárias UUID. |
| RNF05 | Containerização completa da aplicação utilizando Docker. |
| RNF06 | Orquestração do ambiente por meio de um único comando com Docker Compose. |
| RNF07 | Segurança e proteção de endpoints utilizando JWT e hash Bcrypt para senhas. |
| RNF08 | Documentação técnica clara e padronizada (Swagger/OpenAPI/README). |

### Requisitos do Projeto (RPs)

| Código | Descrição |
|---|---|
| RP01 | Padrão e boas práticas de arquitetura no Frontend em React. |
| RP02 | Padrão e arquitetura em camadas no Backend NestJS. |
| RP03 | Modelagem do Banco de Dados PostgreSQL conforme boas práticas. |
| RP04 | Consumo correto da API REST externa do Agregador de Métricas. |
| RP05 | Execução e isolamento corretos via Docker Compose. |
| RP06 | Documentação de Engenharia de Software e UML atualizadas. |
| RP07 | Práticas de segurança cibernética, incluindo hash de senhas e validação de DTOs. |
| RP09 | Aplicação de princípios de IHC (Interação Humano-Computador) e usabilidade. |

---

## 📖 User Stories — Sprint 1

Cada User Story segue o formato padrão do Scrum:

**Como** [tipo de usuário]  
**Quero** [ação ou funcionalidade]  
**Para que** [benefício entregue].

### US-01 · HU-01 — Configuração do Monorepo e Docker Compose

**Tasks:** `TASK-001`, `TASK-008`, `TASK-018`

**Como** desenvolvedor da equipe GreenER,  
**quero** subir todo o ambiente de desenvolvimento (React, NestJS e PostgreSQL) com um único comando,  
**para que** a equipe tenha um ambiente padronizado, reprodutível e isolado, sem conflitos de dependências locais.

**Critérios de aceitação:**

- O comando `docker compose up --build` deve compilar e iniciar os três containers sem erros.
- O backend NestJS deve se conectar automaticamente ao banco PostgreSQL no ambiente Docker.
- O frontend React deve subir servido pelo Vite na porta `5173` do container, publicada em `http://localhost:3000`.
- As instruções de execução e as variáveis de ambiente devem estar documentadas no `README.md`.

### US-02 · HU-02 — Mapeamento de Entidades e Conexão PostgreSQL via ORM

**Tasks:** `TASK-002`, `TASK-003`

**Como** engenheiro de software,  
**quero** conectar o servidor NestJS ao PostgreSQL, mapeando as entidades `User`, `Service` e `MetricCollection`,  
**para que** a aplicação possa persistir e recuperar dados relacionais de forma estruturada e segura.

**Critérios de aceitação:**

- O ORM TypeORM deve estabelecer a conexão com o PostgreSQL na inicialização da aplicação.
- As tabelas `users`, `services` e `metric_collections` devem ser criadas no banco com chaves primárias UUID.
- A entidade `User` deve conter os campos `idUsers`, `nameUsers`, `email`, `password_hash` (com `select: false`) e `created_at`.
- A entidade `Service` deve mapear campos de identificação e metadados, como `external_id`, `country`, `region`, `city`, `latitude`, `longitude` e `status` (alterado, ver [A3](#-alterações-no-planejamento)).

### US-03 · HU-03 — Autenticação Administrativa via JWT

**Tasks:** `TASK-009`, `TASK-010`, `TASK-011`, `TASK-012`

**Como** gestor ou administrador do GreenER,  
**quero** me autenticar com e-mail e senha para receber um token JWT,  
**para que** eu possa acessar a área administrativa do sistema de forma segura.

**Critérios de aceitação:**

- O envio de credenciais válidas para `POST /api/auth/login` deve retornar HTTP `200 OK` com `access_token` e dados do usuário (`{ access_token, user }`).
- O envio de e-mail ou senha incorretos deve retornar HTTP `401 Unauthorized` com a mensagem genérica `"Credenciais inválidas."`.
- As senhas gravadas no banco de dados devem obrigatoriamente ser protegidas por hash utilizando Bcrypt com salt.
- O decorator `@UseGuards(JwtAuthGuard)` deve bloquear requisições sem token válido nas rotas protegidas, retornando HTTP `401`.
- O frontend deve guardar o token em memória e atualizar o estado global de autenticação (alterado, ver [A2](#-alterações-no-planejamento)).

### US-04 · HU-04 — Descoberta Automática de Serviços Ativos

**Tasks:** `TASK-013`, `TASK-014`

**Como** sistema GreenER,  
**quero** consumir a API externa do Agregador UniLaunch para mapear os serviços ativos,  
**para que** novos serviços cadastrados na infraestrutura sejam descobertos e cadastrados automaticamente no banco de dados.

**Critérios de aceitação:**

- O `AggregatorClientService` deve realizar requisições HTTP para a API externa do Agregador de Métricas.
- O sistema deve realizar a operação de *upsert* (inserir se novo, atualizar se existente) para cada serviço retornado.
- Metadados de geolocalização (país, região, cidade, latitude e longitude) devem ser extraídos e armazenados na tabela `services` (alterado, ver [A3](#-alterações-no-planejamento)).
- A requisição externa deve possuir timeout configurado em 5 segundos para evitar travamentos.

### US-05 · HU-05 — Coleta Periódica de Métricas de Infraestrutura

**Tasks:** `TASK-015`

**Como** sistema GreenER,  
**quero** executar um agendador automatizado para consultar os endpoints de métricas de cada serviço,  
**para que** o histórico de consumo de CPU, memória, armazenamento e rede seja registrado continuamente.

**Critérios de aceitação:**

- O agendador deve rodar automaticamente no intervalo definido em `METRICS_COLLECTION_INTERVAL_SECONDS` (padrão de 30 segundos), sem sobrepor ciclos (alterado, ver [A1](#-alterações-no-planejamento)).
- Para cada serviço cadastrado com endpoint de métricas, qualquer que seja o status, o sistema deve realizar a coleta no `metrics_path` informado pelo Agregador (ex.: `/metrics/{id_servico}`) (alterado, ver [A4](#-alterações-no-planejamento)).
- Os dados coletados devem ser salvos na tabela `metric_collections`, associados ao ID do serviço e ao timestamp da coleta.

### US-06 · HU-06 — Tratamento de Falhas e Detecção Dinâmica de Estados

**Tasks:** `TASK-016`, `TASK-017`

**Como** administrador do sistema,  
**quero** que falhas de conexão ou ausência de suporte a métricas sejam tratadas de forma resiliente,  
**para que** o ciclo de coleta continue funcionando sem interromper o monitoramento dos demais serviços.

**Critérios de aceitação:**

- Caso um serviço fique inalcançável durante a coleta, seu status deve ser alterado dinamicamente para `UNAVAILABLE`.
- Caso o serviço responda, mas não disponibilize métricas estruturadas, seu status deve ser marcado como `NO_METRICS`.
- Falhas em um serviço específico não devem derrubar ou interromper o loop de coleta dos outros serviços ativos.
- Testes unitários em Jest devem validar os cenários de sucesso e falha do coletor de métricas e do módulo de autenticação.

---

## ✅ Definition of Done (DoD)

Uma task só é considerada **concluída** quando atende a todos os itens abaixo:

1. O código ou artefato está integrado à branch `dev`.
2. O PR está vinculado à task correspondente no [GitHub Projects](https://github.com/orgs/CyberChese/projects/2/views/3).
3. Os critérios de aceite da história relacionada foram verificados.
4. O backend compila (`npm run build`) e o frontend gera a versão de produção (`npm run build`) sem erros.
5. Regras de negócio novas têm testes unitários, e todos os testes passam.
6. Não há segredos no repositório; variáveis novas foram adicionadas ao `.env.example`.
7. Mudanças no banco de dados foram feitas por migração versionada.
8. A documentação afetada (README, [`api.md`](../api.md), [`arquitetura.md`](../arquitetura.md) etc.) foi atualizada.

Itens que atendem parcialmente à DoD aparecem como **Concluído com pendência** na tabela abaixo, e a pendência ganha nova previsão.

---

## 📌 Situação das Tasks e Pendências

| Task | Situação | Observação |
|---|---|---|
| TASK-001 | Concluído | `docker compose up --build` sobe os três containers |
| TASK-002 | Concluído | Conexão TypeORM configurada em `app.module.ts` e `data-source.ts` |
| TASK-003 | Concluído | Esquema criado pelas migrações em `backend/src/migrations` |
| TASK-004 | Concluído | [`UserCase.pdf`](../diagramas/UserCase.pdf) |
| TASK-005 | Concluído | [`DER_GreenER.png`](../diagramas/DER_GreenER.png) |
| TASK-006 | Concluído | Wireframes e design system no Figma |
| TASK-007 | Concluído com pendência | Teste realizado com integrantes da equipe; avaliação com usuários representativos prevista para a Sprint 3 |
| TASK-008 | Concluído | Estrutura `pages`, `components`, `services`, `hooks`, `contexts`, `providers` |
| TASK-009 | Concluído | `publicApi`, `privateApi` e `ProtectedRoute` |
| TASK-010 | Concluído | `LoginDto`, `PasswordHasherService` e `JwtModule` |
| TASK-011 | Concluído | `AuthController`, `AuthService` e `JwtAuthGuard` |
| TASK-012 | Concluído | Modal de login, `AuthProvider` e sessão em memória |
| TASK-013 | Concluído | `AggregatorClientService` com timeout e erros tipados |
| TASK-014 | Concluído com pendência | O *upsert* funciona, mas a descoberta roda apenas na inicialização do backend e o `region_code` ainda não é gravado → Sprint 2 |
| TASK-015 | Concluído | Ciclo periódico configurável por `METRICS_COLLECTION_INTERVAL_SECONDS` |
| TASK-016 | Concluído | Estados `UNAVAILABLE` e `NO_METRICS` sem interromper o ciclo |
| TASK-017 | Concluído com pendência | 20 testes passando com Node 24; a imagem Docker usa Node 22 e os testes não rodam dentro do container → Sprint 2 |
| TASK-018 | Concluído com pendência | README atualizado; Swagger ainda não configurado → Sprint 2 |
| TASK-019 | Concluído | Burndown no início deste documento |

### Pendências e nova previsão

| Pendência | Critério da rubrica | Nova previsão |
|---|---|---|
| Descoberta periódica de serviços | DW02 | Sprint 2 |
| Gravar o `region_code` dos serviços | DW02 | Sprint 2 |
| Imagem do backend em Node 24 para executar os testes no container | DW07, TP04 | Sprint 2 |
| Camada de repositories e divisão de responsabilidades do `MetricsService` | DW03, TP01 | Sprint 2 |
| Remover arquivos sem uso (`modules/coletas.*`, `services/entities/service.entity.ts`) | TP03 | Sprint 2 |
| Configurar Swagger em `/api/docs` | DW07 | Sprint 2 |

---

## 🔍 Como Verificar a Versão Entregue

Passo a passo completo no [README principal](../../../README.md#-execução-com-docker). Resumo:

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec greener-backend npm run migration:run
docker compose exec greener-backend npm run seed
```

| Verificação | Resultado esperado |
|---|---|
| Abrir `http://localhost:3000` | Observatório com intervalo de coleta e última coleta |
| Entrar com `teste@greener.com` / `senha123` | Acesso à Área do Administrador |
| `GET http://localhost:3001/api/services` | Lista de serviços descobertos com seus estados |
| `GET http://localhost:3001/api/services/{id}/history` | Coletas gravadas do serviço |
| `GET http://localhost:3001/api/auth/profile` sem token | HTTP `401` |
| `cd greener/backend && npm install && npm test` (Node 24.9 ou superior) | 4 suítes e 20 testes aprovados |

---

## 🎬 Sprint Review

**Data:** 20/10/2026 · **Demonstração:** [vídeo da Sprint 1](https://youtu.be/ubfME7MER6U)

### Entregas demonstradas

- Ambiente completo com Docker Compose (frontend, backend e PostgreSQL).
- Banco criado por migrações TypeORM e usuário de teste criado pelo seed.
- Login com JWT: credenciais válidas retornam o token; credenciais inválidas retornam `401` com mensagem genérica; rota protegida bloqueia acesso sem token.
- Descoberta de serviços no Agregador UniLaunch com gravação da localização.
- Coleta periódica de métricas e transições de estado `ACTIVE`, `NO_METRICS` e `UNAVAILABLE`, sem interromper o ciclo quando um serviço falha.
- Frontend com Observatório público, modal de login e Área do Administrador protegida.
- Protótipo navegável no Figma e relatório de usabilidade.

### Verificação realizada no fechamento (19/10/2026)

| Item | Resultado |
|---|---|
| Migrações em banco vazio | 3 migrações aplicadas com sucesso |
| Login válido, inválido e com corpo inválido | `200`, `401` e `400`, respectivamente |
| Rota protegida com e sem token | `200` e `401` |
| Descoberta e coleta com serviços com métricas, sem métricas e removidos | Estados `ACTIVE`, `NO_METRICS` e `UNAVAILABLE` gravados corretamente |
| Testes unitários | 20 aprovados com Node 24; falham com Node 22 (pendência registrada) |
| Build e lint do frontend | Sem erros |

### Retorno recebido

> Registrar aqui o retorno do professor e do cliente (UniLaunch) após a apresentação da Sprint 1.

---

## 🔄 Retrospectiva

Pontos levantados no fechamento da sprint, a partir das entregas e das pendências encontradas.

### O que funcionou bem

- Divisão das tasks com responsável definido para cada integrante.
- O contrato do Agregador foi documentado ([`contrato-agregador.md`](../contrato-agregador.md)) a partir de chamadas reais, o que orientou a implementação do cliente e do coletor.
- Os testes unitários cobriram cenários de falha (timeout, HTTP 500, HTTP 404, contrato inválido), e não só o caminho feliz.
- O frontend seguiu desde o início a separação entre pages, components, services, hooks e contexts.

### O que pode melhorar

- **Documentação deixada para o fim:** vários documentos de `docs/` só foram preenchidos no fechamento da sprint.
- **Critérios de aceite desatualizados:** a implementação mudou (token em memória, agendamento sem Cron, coleta de todos os serviços), mas as histórias não foram atualizadas na hora.
- **Ambiente de testes diferente do documentado:** os testes passavam na máquina dos desenvolvedores, mas não dentro do container indicado no README.
- **README à frente do código:** o README listava endpoints que ainda não existiam.

### Ações de melhoria para a Sprint 2

| Ação | Responsável | Como verificar |
|---|---|---|
| Atualizar a documentação no mesmo PR da funcionalidade (item 8 da DoD) | Toda a equipe | PRs da Sprint 2 com alteração de documentação |
| Quando a implementação mudar um critério de aceite, registrar a alteração e a justificativa na história | Lucas Cobra (PO) | Seção de alterações do `sprint-2.md` |
| Executar os testes dentro do container antes de fechar cada task de backend | Lucas Cobra | Comando de testes do README funcionando |
| Separar no README o que está implementado do que está planejado | Gabriel Moura (SM) | README e [`api.md`](../api.md) |

---

## 📝 Alterações no Planejamento

Alterações feitas nos critérios de aceite durante a sprint para refletir decisões técnicas tomadas na implementação.

| ID | Item | Antes | Depois | Justificativa |
|---|---|---|---|---|
| A1 | US-05, TASK-015, RNF03 | Agendador Cron com `@nestjs/schedule` | `setTimeout` encadeado com intervalo configurável | O próximo ciclo só começa quando o anterior termina, evitando sobreposição quando o Agregador está lento |
| A2 | US-03, TASK-012 | Token salvo no `localStorage` | Token mantido em memória | Reduz a exposição do token a ataques XSS; a sessão termina ao recarregar a página |
| A3 | US-02, US-04, TASK-014 | Metadados com provedor de nuvem (`cloud_provider`) | País, região, cidade, latitude e longitude | O Agregador não informa o provedor de nuvem, conforme o [contrato](../contrato-agregador.md) |
| A4 | US-05 | Coleta apenas de serviços `ACTIVE` | Coleta de todos os serviços com endpoint | Permite que serviços `UNAVAILABLE` ou `NO_METRICS` voltem a `ACTIVE` automaticamente |
| A5 | RF03 | Métricas de CPU, memória e requisições | CPU, memória, armazenamento e rede | Campos disponíveis no contrato do Agregador |

---

**GreenER — Plataforma para Estimativa do Impacto Ambiental de Aplicações de Software**


