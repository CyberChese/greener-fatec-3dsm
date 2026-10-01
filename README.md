# 🌱 GreenER - Plataforma para Estimativa do Impacto Ambiental de Aplicações de Software

[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS%20%2B%20TypeScript-E0234E?logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Container-Docker%20%26%20Compose-2496ED?logo=docker)](https://www.docker.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens)](https://jwt.io/)

---

## 📌 Visão Geral do Projeto

O **GreenER** é uma plataforma web desenvolvida para monitorar aplicações de software distribuídas e transformar métricas técnicas de infraestrutura (CPU, memória, rede e armazenamento) em **indicadores ambientais** reais, estimando o **consumo energético (kWh)** e a **emissão de dióxido de carbono equivalente ($\text{CO}_2\text{e}$)** em tempo real.

O projeto foi concebido no âmbito da disciplina de **Aprendizagem Baseada em Projetos (ABP)** do 3º semestre do curso de Desenvolvimento de Software Multiplataforma (DSM) da **FATEC Jacareí** (período 2026-2), em parceria com a **UniLaunch**.

### 🎯 Problema & Solução
* **Problema:** Empresas operam dezenas ou centenas de microsserviços em nuvem. As métricas tradicionais de telemetria medem desempenho e disponibilidade, mas não oferecem visibilidade sobre o custo ambiental e a pegada de carbono da infraestrutura.
* **Solução:** O **GreenER** descobre dinamicamente os serviços ativos, realiza coletas periódicas do endpoint `/metrics/{id_servico}` e integra dados com o **Serviço de Intensidade de Carbono** por região geográfica, consolidando rankings de impacto, histórico e visualizações geográficas em um dashboard operacional responsivo.

---

## 🏗️ Arquitetura e Fluxo de Dados

A solução adota uma arquitetura descentralizada containerizada. O backend em **NestJS** atua como orquestrador de telemetria, persiste o histórico no **PostgreSQL** e alimenta a interface em **React**.

```text
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│         Dashboard, Mapa, Rankings e Filtros             │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / REST
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (NestJS)                     │
│  Controllers  │  Services (Cálculo/Regras)  │  DTOs/JWT  │
└──────────────┬────────────────────────────┬─────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────┐    ┌─────────────────────────┐
│   Banco PostgreSQL       │    │   APIs Auxiliares       │
│ - Histórico de Coletas   │    │   (UniLaunch)           │
│ - Cadastro de Serviços   │    │ - Metrics Aggregator    │
│ - Usuários / Configs     │    │ - Carbon Intensity API  │
└──────────────────────────┘    └─────────────────────────┘
```

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend** | React + TypeScript | Interface web responsiva, acessível e dinâmica. |
| **Backend** | NestJS + TypeScript | Framework escalável estruturado em Módulos, Controllers e Services. |
| **Banco de Dados** | PostgreSQL + ORM | Persistência do histórico de coletas e parâmetros de monitoramento. |
| **Autenticação** | JWT (JSON Web Token) | Proteção de rotas administrativas e alteração de parâmetros. |
| **Containerização** | Docker & Docker Compose | Orquestração unificada de todos os serviços da aplicação. |

---

## 📂 Estrutura do Repositório

```text
greener/
├── .github/
│   └── ISSUE_TEMPLATE/        # Templates para HUs, Épicos e Bugs
├── frontend/                  # Aplicação React com TypeScript
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── backend/                   # Aplicação NestJS com TypeScript
│   ├── src/
│   │   ├── modules/           # Módulos da aplicação (Auth, Metrics, Services, Carbon)
│   │   ├── controllers/       # Roteamento e recebimento de DTOs
│   │   ├── services/          # Regras de cálculo e chamadas HTTP externas
│   │   └── entities/          # Mapeamento do banco via ORM
│   ├── Dockerfile
│   └── package.json
├── .env.example               # Modelo de variáveis de ambiente (sem segredos)
├── .gitignore                 # Arquivos e pastas ignorados pelo Git
├── docker-compose.yml         # Orquestração de Frontend, Backend e PostgreSQL
└── README.md                  # Documentação técnica do projeto
```

---

## ⚡ Pré-requisitos e Execução via Docker

Para rodar a plataforma completa em ambiente local, é necessário ter instalado:
* [Git](https://git-scm.com/)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (com Docker Compose habilitado)

### 🚀 Passo a Passo para Iniciar

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/greener.git
   cd greener
   ```

2. **Configurar as Variáveis de Ambiente:**
   Copie o arquivo de exemplo `.env.example` criando o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Subir a aplicação com Docker Compose:**
   ```bash
   docker-compose up --build -d
   ```

4. **Acessar as aplicações:**
   * **Frontend Dashboard:** `http://localhost:3000`
   * **Backend API Documentation (Swagger):** `http://localhost:3001/api/docs`
   * **PostgreSQL Database:** `localhost:5432`

5. **Encerrar a execução:**
   ```bash
   docker-compose down
   ```

---

## ⚙️ Variáveis de Ambiente e Integradores

Configure o arquivo `.env` na raiz do projeto com as chaves necessárias:

```env
# Banco de Dados PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=greener_user
POSTGRES_PASSWORD=greener_password
POSTGRES_DB=greener_db

# Backend NestJS
PORT=3001
JWT_SECRET=sua_chave_secreta_jwt_super_segura
JWT_EXPIRATION=1d

# APIs Auxiliares UniLaunch
METRICS_AGGREGATOR_URL=https://metrics.unilaunch.org
CARBON_INTENSITY_URL=https://carbon.unilaunch.org
```

---

## 🔌 Documentação dos Endpoints da API

### 🔓 Rotas Públicas (Dashboard)

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/services` | Lista os serviços monitorados e seus estados (ativo, indisponível, sem métricas). |
| `GET` | `/api/metrics/summary` | Retorna indicadores consolidados (Consumo Total kWh, Emissão Total $\text{CO}_2\text{e}$, Total de Serviços). |
| `GET` | `/api/metrics/ranking` | Retorna o ranking de serviços ordenados por maior consumo de energia ou emissão de $\text{CO}_2\text{e}$. |
| `GET` | `/api/metrics/compare` | Compara dois ou mais serviços em um período específico. |
| `GET` | `/api/services/:id/history` | Retorna o histórico temporal de coletas do serviço. |

### 🔐 Rotas Autenticadas (Requer JWT Header `Authorization: Bearer <token>`)

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Realiza autenticação do gestor e retorna o JWT. |
| `PUT` | `/api/config/interval` | Altera o intervalo de amostragem e coleta de métricas. |
| `POST` | `/api/services/refresh` | Força a redescoberta manual dos serviços no Agregador. |

---

## 🗄️ Modelo de Dados Simplificado

* **`Service`**: ID, Nome, URL/Endpoint, Status (`ACTIVE`, `UNAVAILABLE`, `NO_METRICS`), País, Região, Cidade, Latitude, Longitude, Criado em.
* **`MetricCollection`**: ID, ServiceID (FK), CPU Usage, Memory Usage, Network I/O, Consumo Energético Estimado (kWh), Emissão $\text{CO}_2\text{e}$ Estimada (g), Timestamp.
* **`User`**: ID, Nome, Email, Senha Hash (Bcrypt), Criado em.

---

## 🧪 Testes Unitários e Qualidade

O backend conta com testes unitários para isolar e garantir a precisão dos cálculos ambientais e o tratamento de cenários de indisponibilidade (RNF05, RNF07).

Para executar os testes unitários dentro do container backend:
```bash
docker exec -it greener-backend npm run test
```

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
