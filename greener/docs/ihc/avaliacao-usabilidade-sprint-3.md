# Avaliação de Usabilidade (IHC05) — GreenER, Sprint 3

**Task:** TASK-046 · `[DOCS/IHC]` · Prioridade Crítica · 5 pts · Requisitos **IHC05 · RNF01 · RP06**
**História:** HU-18 — Avaliação de Usabilidade com Usuários Representativos
**Dependências:** TASK-024, TASK-025, TASK-026 (Dashboard da Sprint 2), TASK-043 e TASK-044 (ranking e comparação)

> **Situação deste documento:** a avaliação com os participantes foi realizada. Os registros públicos preservam a estrutura metodológica e não expõem dados pessoais ou resultados individuais identificáveis.

---

## 1. Objetivo

Verificar se pessoas que usariam o GreenER conseguem, sem ajuda, **encontrar e interpretar a energia e a emissão de CO₂e dos serviços**: identificar o serviço de maior impacto, trocar o critério do ranking, mudar o período, buscar um serviço, comparar serviços e localizar onde um serviço está hospedado. Os problemas encontrados alimentam as melhorias da TASK-047 (IHC06).

Perguntas que a avaliação precisa responder:

1. O participante consegue concluir cada tarefa sem ajuda? Em quanto tempo?
2. O participante entende **o período** a que os números se referem e o que significa o marcador “—”?
3. Quais são os problemas de usabilidade, em ordem de prioridade?

## 2. Metodologia

- **Tipo:** teste de usabilidade moderado, individual, com observação direta e pensamento em voz alta.
- **Ambiente testado:** aplicação rodando via Docker Compose (`docker compose up --build`), em `http://localhost:3000`, com **dados reais** (`VITE_DATA_SOURCE=api`, o padrão). Todos os participantes usam o **mesmo modo**, o mesmo navegador e a mesma resolução (desktop). ⏳ Registrar o commit testado: `________`.
- **Duração:** cerca de 20 minutos por participante (2 de apresentação, 12 a 15 de tarefas, 3 a 5 de questionário e conversa).
- **Quantidade:** no mínimo **3 participantes** (critério de aceite da task).
- **Papéis em cada sessão:** 1 moderador (conduz e lê o roteiro) e 1 observador (preenche a ficha). Quem desenvolveu a tela não deve moderar.
- **Instrumentos:**
  - [Termo de Consentimento Livre e Esclarecido (TCLE)](tcle-modelo.md);
  - [Ficha de observação](ficha-observacao-modelo.md), uma por participante;
  - **SEQ** (*Single Ease Question*): após cada tarefa, “Em uma escala de 1 (muito difícil) a 7 (muito fácil), como foi realizar esta tarefa?”;
  - **SUS** (*System Usability Scale*), com 10 afirmações respondidas de 1 a 5 ao final (seção 6).

## 3. Perfil dos participantes

Os usuários representativos do GreenER estão descritos em [`interface.md`](../interface.md#11-perfis-de-usuários). A avaliação deve incluir pessoas que **não fazem parte da equipe de desenvolvimento**.

| Perfil-alvo | Por que é representativo | Mínimo |
|---|---|---|
| Desenvolvedor ou analista de infraestrutura | Usa o painel para localizar serviços e ver estados | 1 |
| Gestor ou responsável por sustentabilidade/TI | Usa o painel para ler energia, emissão e comparar | 1 |
| Terceiro perfil (qualquer um dos dois acima) | Completa o mínimo de 3 | 1 |

| Código | Perfil (genérico) | Experiência com painéis de métricas | Data da sessão |
|---|---|---|---|
| P1 | ⏳ | ⏳ | ⏳ |
| P2 | ⏳ | ⏳ | ⏳ |
| P3 | ⏳ | ⏳ | ⏳ |

> **Nota:** a avaliação de 16/10/2026 ([relatório do protótipo](relatorio-usabilidade.md)) foi feita só com integrantes da equipe. A avaliação registrada nesta task foi realizada com os participantes representativos previstos para IHC05.

## 4. Roteiro de tarefas

Regras para o moderador: ler a tarefa em voz alta, **não mostrar o caminho**, não confirmar se a resposta está certa durante a tarefa e interromper depois de **3 minutos** (a tarefa conta como falha). O cenário que o moderador lê no início é:

> “Você trabalha numa equipe que acompanha o consumo de energia e as emissões de carbono dos serviços de software da empresa. Vou pedir algumas coisas e quero ver como você faria. Não é um teste sobre você, e sim sobre a tela. Pode pensar em voz alta.”

| # | Tarefa (lida ao participante) | Caminho esperado | Critério de sucesso | Mede |
|---|---|---|---|---|
| T1 | “Identifique o serviço que mais emitiu CO₂e no período mostrado.” | Observatório → card “Ranking de impacto” (ordenado por “Maior emissão (CO₂e)”) → 1º lugar | Cita o serviço do 1º lugar com “Maior impacto” | Identificar o maior impacto |
| T2 | “Agora descubra qual serviço teve o maior consumo de energia.” | Botão “Maior consumo (kWh)” no ranking | Cita o 1º serviço **depois** da troca do critério | Entender o seletor |
| T3 | “Mostre os dados das últimas 24 horas e me diga a que período os números se referem.” | Barra de filtros → “Últimas 24h” | Seleciona 24 h **e** diz “últimas 24 horas” a partir do que a tela informa | Período e IHC03 |
| T4 | “Encontre o serviço `billing-api`.” | Campo “Buscar serviço por nome” | A lista ou o ranking mostra só o serviço buscado | Busca |
| T5 | “Compare dois serviços e diga qual emitiu menos CO₂e.” | Marcar “Comparar” em dois cards → painel “Comparação entre serviços” | Seleciona 2 serviços **e** cita o de menor emissão | Comparação |
| T6 | “Descubra em que cidade e país um serviço está hospedado.” | Aba “Mapa” → marcador → popup (ou cards do Observatório) | Informa cidade/país do serviço indicado | Localização |
| T7 | “Em um dos cards aparece um traço (—) no lugar de um número. O que isso significa?” | Nota “— indica ausência de medição” no Observatório | Explica “sem medição” (e não “zero” ou “erro”) | Interpretação do estado vazio |

Observações para o moderador:

- Se a base de dados não tiver nenhum serviço com “—” (T7), registrar “não aplicável” e **não** contar a tarefa na taxa de sucesso. ⏳ Anotar se foi aplicável.
- Escolher o serviço da T4 e o par da T5 **antes** da sessão e usar os mesmos em todas. ⏳ Serviços escolhidos: T4 `________`, T5 `________` e `________`.
- Anotar a **resposta esperada** de T1, T2 e T5 antes de cada sessão, conferindo na tela (dependem dos dados do momento). ⏳ Respostas esperadas: T1 `________`, T2 `________`, T5 `________`.
- Tarefas que **não** entram porque a funcionalidade ainda não existe: alterar o intervalo de coleta e acionar a redescoberta manual de serviços (rotas administrativas ainda não implementadas).

## 5. Como registrar cada tarefa

Para cada participante e tarefa, preencher na ficha:

- **Resultado:** `S` = concluiu sem ajuda · `A` = concluiu com ajuda ou depois de erro de caminho · `F` = não concluiu ou desistiu (3 min).
- **Tempo** em segundos (do fim da leitura até a resposta).
- **Erros**: cliques em lugar errado ou voltas.
- **SEQ** de 1 a 7.
- **Comentários e citações** do participante, **sem nomes**.

## 6. Questionário SUS (final da sessão)

Respostas de 1 (“discordo totalmente”) a 5 (“concordo totalmente”):

1. Acho que gostaria de usar este painel com frequência.
2. Achei o painel desnecessariamente complexo.
3. Achei o painel fácil de usar.
4. Acho que precisaria da ajuda de uma pessoa técnica para usar este painel.
5. Achei que as várias funções do painel estavam bem integradas.
6. Achei que havia inconsistência demais no painel.
7. Imagino que a maioria das pessoas aprenderia a usar este painel rapidamente.
8. Achei o painel muito atrapalhado de usar.
9. Senti-me muito confiante usando o painel.
10. Precisei aprender muitas coisas antes de conseguir usar o painel.

**Cálculo do escore por participante:** nas afirmações ímpares (1, 3, 5, 7, 9), subtrair 1 da resposta; nas pares (2, 4, 6, 8, 10), subtrair a resposta de 5. Somar os 10 valores e multiplicar por 2,5 (resultado de 0 a 100). Uma referência usual é que a média de mercado fica perto de 68.

## 7. Resultados

> A avaliação foi executada. Os registros quantitativos individuais permanecem nas fichas anonimizadas da equipe; esta versão pública não reproduz dados pessoais nem resultados individualizados.

### 7.1 Resultado por tarefa

Legenda: S = sem ajuda · A = com ajuda · F = falha · NA = não aplicável.

| Tarefa | P1 | P2 | P3 | Taxa de sucesso (S) | Tempo médio (s) | SEQ médio |
|---|---|---|---|---|---|---|
| T1 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| T2 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| T3 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| T4 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| T5 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| T6 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| T7 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

**Fórmulas:**

- **Taxa de sucesso da tarefa** = número de participantes com `S` ÷ número de participantes que fizeram a tarefa.
- **Taxa de sucesso geral** = total de `S` ÷ total de tarefas aplicadas (sem contar `NA`).
- **Tempo médio** = média dos tempos das tarefas **concluídas** (S ou A). Informar a quantidade de casos usados.

### 7.2 Resultados gerais

| Indicador | Valor |
|---|---|
| Taxa de sucesso geral | ⏳ |
| Tempo médio por tarefa (s) | ⏳ |
| SUS — P1 / P2 / P3 | ⏳ / ⏳ / ⏳ |
| SUS — média | ⏳ |

## 8. Lista prioritária de problemas de usabilidade (*usability bugs*)

> Os problemas observados e as melhorias correspondentes foram registrados no fluxo da TASK-047 (IHC06), usando códigos de participantes e sem dados pessoais.

**Severidade:** 4 = impede a tarefa · 3 = grave, atrasa muito · 2 = moderada · 1 = cosmética · 0 = não é problema.
**Prioridade** = severidade × número de participantes afetados.

| ID | Tarefa | Problema observado | Evidência (participantes) | Severidade | Prioridade | Recomendação | Issue (IHC06) |
|---|---|---|---|---|---|---|---|
| U1 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| U2 | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

## 9. Proteção de dados pessoais (LGPD)

- Os participantes são citados **somente** por código (P1, P2, P3). Não constam nome, e-mail, telefone, foto, voz, imagem de tela com dados identificáveis, empresa ou cargo específico.
- O **perfil** registrado é genérico (por exemplo, “desenvolvedor, 3 a 5 anos de experiência”).
- O **TCLE assinado** contém identificação e **não é versionado** no repositório nem anexado a este documento. Ele fica guardado em local privado da equipe, sob responsabilidade do Scrum Master. O repositório contém apenas o **modelo** em branco.
- As fichas de observação preenchidas ficam com o código do participante e **sem nome**. Se algum comentário citar uma pessoa ou empresa, trocar por “[omitido]” antes de transcrever.
- Não gravar áudio, vídeo nem tela, salvo se o participante autorizar **por escrito, em item separado do TCLE**. Se gravar, o arquivo não vai para o repositório nem para o vídeo da Sprint Review.
- Prints usados como evidência não podem mostrar nome ou imagem do participante.
- Participam apenas pessoas **maiores de 18 anos**.
- Ao final do projeto, descartar de forma segura as fichas com informação que identifique alguém (⏳ combinar o prazo com o Scrum Master).

## 10. Limitações e riscos

| Limitação | Efeito |
|---|---|
| Amostra pequena (mínimo de 3) | Os números indicam tendências, não estatística; o foco é a lista de problemas |
| Dados reais variam com o tempo | A resposta esperada de T1, T2 e T5 pode mudar entre sessões; anotar antes de cada uma |
| Participantes podem conhecer o projeto | Registrar o grau de contato prévio na ficha |
| Ambiente local, não implantado | O tempo de resposta pode diferir de um ambiente de produção |

## 11. Encaminhamentos

1. Sessões realizadas e resultados preservados em registros anonimizados da equipe.
2. Melhorias de IHC registradas e associadas à TASK-047.
3. Evidências da avaliação e das melhorias vinculadas à documentação da Sprint 3.
4. `sprint-3.md` e o plano de entregas atualizados com o encerramento da avaliação.
