# 🎓 GreenER — Guia de Portfólio

Este guia organiza a apresentação final do GreenER e aponta para os documentos e evidências detalhados do projeto. Ele não substitui a documentação técnica; serve como roteiro rápido para avaliadores e visitantes.

## 1. Resumo do projeto

O GreenER monitora serviços de software, coleta métricas de infraestrutura e transforma esses dados em estimativas de consumo energético e emissões de CO₂e. A aplicação combina um backend NestJS, um frontend React e um banco PostgreSQL executados com Docker Compose.

- **Problema:** métricas tradicionais mostram desempenho e disponibilidade, mas não evidenciam o impacto ambiental da infraestrutura.
- **Solução:** descobrir serviços, coletar métricas, calcular energia e CO₂e e apresentar os resultados em um observatório público e em um dashboard.
- **Público:** equipes técnicas e gestores interessados em acompanhar o impacto ambiental de serviços de software.

Mais detalhes: [README principal](../../README.md) e [visão arquitetural](arquitetura.md).

## 2. Roteiro sugerido para a demonstração

1. Subir o ambiente com Docker Compose seguindo o [README principal](../../README.md).
2. Abrir o frontend em <http://localhost:3000> e apresentar o Observatório.
3. Mostrar o resumo consolidado, os estados dos serviços, os cards, o ranking, a comparação, o mapa e o histórico disponível.
4. Demonstrar o login e a Área do Administrador, quando for necessário apresentar o fluxo protegido.
5. Abrir o Swagger em <http://localhost:3001/api/docs> para mostrar os endpoints, parâmetros, schemas e respostas documentados.
6. Encerrar com os documentos de arquitetura, cálculos e evidências das sprints.

## 3. Entregas principais

- Descoberta e persistência de serviços com localização e `region_code` opcional.
- Coleta e histórico de métricas de CPU, memória, armazenamento e rede.
- Cálculo de energia em kWh e emissão de CO₂e.
- Consulta de intensidade de carbono por região, com fallback configurável.
- Endpoint público de resumo e histórico por serviço.
- Dashboard com indicadores, cards, mapa, ranking e comparação.
- Autenticação administrativa com JWT.
- Testes unitários e integração HTTP simulada.
- Execução documentada com Docker Compose e migrações TypeORM.

Consulte a [API](api.md), os [cálculos ambientais](calculos.md) e o [plano de entregas](plano-de-entregas.md) para os detalhes de cada entrega.

## 4. Tecnologias e arquitetura

| Camada | Tecnologia | Papel |
|---|---|---|
| Interface | React, TypeScript, Vite e Tailwind CSS | Observatório, dashboard e área administrativa |
| API | NestJS e TypeScript | Autenticação, serviços, métricas e integração com o Agregador |
| Persistência | PostgreSQL e TypeORM | Entidades, histórico e migrações |
| Integrações | Agregador de Métricas e API de Intensidade de Carbono | Dados de serviços, métricas e intensidade regional |
| Execução | Docker Compose | Orquestração do frontend, backend e banco |

Fluxo completo: [arquitetura e fluxo de dados](arquitetura.md).

## 5. Links para apresentação

- [README principal e execução com Docker](../../README.md)
- [Swagger UI](http://localhost:3001/api/docs) — disponível depois que o backend estiver em execução
- [Especificação OpenAPI](http://localhost:3001/api/docs/openapi.json) — disponível depois que o backend estiver em execução
- [Documentação da API](api.md)
- [Documentação da interface](interface.md)
- [Sprint 1](sprints/sprint-1.md)
- [Sprint 2](sprints/sprint-2.md)
- [Planejamento da Sprint 3](sprints/sprint-3.md)
- [Kanban, User Stories e Tasks](https://github.com/orgs/CyberChese/projects/2/views/3)
- [Vídeo da Sprint 2](https://youtu.be/1soOS-lRddQ)
- [Vídeo da Sprint 3](https://youtu.be/2h2wEK6j1RE)

## 6. Evidências visuais

- [Burndown da Sprint 2](evidencias/burndown-sprint-2.png)
- [Observatório em desktop](evidencias/observatorio-desktop.png)
- [Mapa em desktop](evidencias/mapa-desktop.png)
- [Área do Administrador em desktop](evidencias/admin-desktop.png)
- [Login em desktop](evidencias/login-desktop.png)
- [Evidências da TASK-047](evidencias/README.md)

## 7. Limites conhecidos

As rotas administrativas de alteração do intervalo de coleta e de atualização manual da descoberta permanecem identificadas na [documentação da API](api.md) como pendências. O guia não as apresenta como funcionalidades entregues.
