# 📚 Documentação do GreenER

Índice dos artefatos de gestão, arquitetura, API, interface e diagramas do projeto.
Para executar a aplicação, veja o [README principal](../../README.md).

## 📋 Gestão do Projeto

| Documento | Conteúdo |
|---|---|
| [Plano de entregas](plano-de-entregas.md) | Distribuição dos critérios da rubrica nas três sprints, responsáveis, evidências, pendências e participação dos integrantes |
| [Sprint 1](sprints/sprint-1.md) | Objetivo, backlog, histórias e critérios de aceite, DoD, situação das tasks, Sprint Review e retrospectiva |
| [Sprint 2](sprints/sprint-2.md) | Planejamento previsto e pendências herdadas |
| [Sprint 3](sprints/sprint-3.md) | Planejamento previsto |
| [Kanban, User Stories e Tasks](https://github.com/orgs/CyberChese/projects/2/views/3) | Quadro do GitHub Projects com o acompanhamento das atividades |

## 🏗️ Técnico

| Documento | Conteúdo |
|---|---|
| [Arquitetura](arquitetura.md) | Componentes, responsabilidades, fluxo de dados e decisões arquiteturais |
| [API](api.md) | Endpoints implementados, parâmetros, respostas e endpoints planejados |
| [Cálculos](calculos.md) | Dados de entrada coletados e estrutura dos cálculos de energia e CO₂e (Sprint 2) |
| [Contrato do Agregador](contrato-agregador.md) | Contrato da API de Métricas da UniLaunch usado pelo backend |

## 🎨 Design e Usabilidade

| Documento | Conteúdo |
|---|---|
| [Interface](interface.md) | Usuários e tarefas, protótipos, fluxo de navegação e decisões de interface |
| [Relatório de Usabilidade (IHC)](ihc/relatorio-usabilidade.md) | Metodologia, feedbacks, pontos de fricção e ajustes propostos para o protótipo navegável |

## 📐 Diagramas Técnicos

### Caso de Uso

Representa os atores e as funcionalidades do sistema, destacando as principais interações previstas com a plataforma GreenER.

<p align="center">
  <img width="800" alt="Diagrama de Caso de Uso do GreenER" src="https://github.com/user-attachments/assets/852b8ff3-584a-49d3-a7ec-1c2c0af92bff" />
</p>

- [Diagrama de Caso de Uso (PDF)](diagramas/UserCase.pdf)
- [Arquivo-fonte do Astah](diagramas/GreenER_UserCase.asta)

### Diagrama Entidade-Relacionamento (DER)

Representa a estrutura lógica dos dados, incluindo as entidades do sistema e seus relacionamentos.

<p align="center">
  <img width="800" alt="Diagrama Entidade-Relacionamento do GreenER" src="https://github.com/user-attachments/assets/0eb7255f-4192-4640-afcf-0f57aa5d88de" />
</p>

- [Diagrama Entidade-Relacionamento (PNG)](diagramas/DER_GreenER.png)
- [Arquivo-fonte do brModelo](diagramas/DER_GreenER.brM3)
