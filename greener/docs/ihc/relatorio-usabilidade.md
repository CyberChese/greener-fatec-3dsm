# Relatório de Usabilidade (IHC) — Protótipo navegável GreenER

**Task:** `[FIGMA]` · Módulo Design · Prioridade Média · 3 pts · Requisitos **RNF01 · RP09**
**Dependência:** TASK-006 (Design System e telas de alta fidelidade)
**Protótipo navegável:** [Abrir protótipo](https://www.figma.com/proto/xfX1ubXK9GIpWeV8TNYL1q/greenER---ABP-3%C2%BASEMESTRE?node-id=10-41&t=QK9tYfSXJ4x1c5a1-0&scaling=min-zoom&content-scaling=fixed&page-id=4%3A3&starting-point-node-id=10%3A41&show-proto-sidebar=1)
**Data dos testes:** [16/10/2026]

---

## 1. Objetivo

Verificar se o protótipo navegável do GreenER permite percorrer o fluxo **Dashboard → Login → Área do Administrador → Dashboard** de forma clara, identificar pontos de fricção de IHC e registrar os ajustes necessários.

## 2. Metodologia

- **Tipo:** teste de usabilidade empírico e moderado, com o protótipo do Figma em modo apresentação (desktop 1440).
- **Técnica:** observação direta e coleta de feedback verbal dos participantes.
- **Critérios de apoio:** 10 heurísticas de Nielsen e contraste/acessibilidade (WCAG 2.1).
- **Roteiro de tarefas:**

| # | Tarefa | Caminho esperado |
|---|---|---|
| T1 | Acessar a área restrita e entrar como administrador | Dashboard → aba "Área do Administrador" → modal → "Entrar" |
| T2 | Localizar a sessão atual e a expiração | Área do Administrador · cartão "Sessão autenticada" |
| T3 | Voltar ao painel de monitoramento | Aba "Observatório" |
| T4 | Identificar o serviço indisponível e sua localização | Dashboard: legenda de estados e cards (Auth API · Virgínia · EUA) |
| T5 | Ver os serviços em formato de tabela | Alternador "Cartões / Tabela" |

## 3. Participantes

| Código | Participante | Perfil |
|---|---|---|
| P1 | Luka Gomes | Colega (usuário de teste) |
| P2 | Isabelly Marinho | Colega (usuária de teste) |

## 4. Feedbacks recebidos

| Participante | Feedback |
|---|---|
| P1 — Luka Gomes | Gostou da navegação, das cores e do design. |
| P2 — Isabelly Marinho | Gostou da navegação, das cores e do design. |
| P1 e P2 | Ambos apontaram que o mais importante é o **feedback do cliente** para sugerir melhorias (mudança de cores, design, elementos etc.), pois a validação dele é a que mais pesa. Na avaliação dos dois, o design atual já atende aos critérios e às especificações do projeto. |

**Síntese:** os dois participantes aprovaram navegação, paleta e design, e recomendaram validar o protótipo com o cliente antes de mudanças visuais maiores. A equipe adotou isso como encaminhamento: o protótipo será apresentado ao cliente e o retorno dele orientará eventuais alterações de cores, design e elementos.

## 5. Pontos de fricção identificados (inspeção heurística do protótipo)

Além do feedback dos participantes, a equipe analisou as telas e os tokens do Design System e identificou os pontos abaixo.

| ID | Tela | Ponto de fricção | Heurística / critério | Severidade |
|---|---|---|---|---|
| F1 | Login e filtros | Borda dos campos (`#3f3f46` sobre `#09090b`) com cerca de 1,9:1; o mínimo para componentes de interface é 3:1 | WCAG 1.4.11 | Média |
| F2 | Login | Apenas o estado "feliz" foi desenhado: faltam erro de credenciais, carregando no botão "Entrar" e mostrar/ocultar senha | Nielsen 1 e 9 | Alta |
| F3 | Login | Nota "Modo demonstração… `.env.local`" usa jargão técnico em texto pequeno | Nielsen 2 | Baixa |
| F4 | Área do Administrador | Token JWT exibido por inteiro na tela | Nielsen 8 / segurança | Média |
| F5 | Histórico de coletas | "Limpar histórico" (ação destrutiva) junto de "Exportar CSV", com o mesmo peso visual e sem confirmação | Nielsen 5 | Alta |
| F6 | Dashboard | Contagens divergentes: KPI "4 de 6", filtro "6 de 8" e 6 cards na grade | Nielsen 4 | Média |
| F7 | Dashboard | Idiomas misturados ("Brasil"/"EUA" junto de "Brazil", "United States", "Japan") | Nielsen 4 | Média |
| F8 | Dashboard e admin | Rótulos e textos de apoio muito pequenos (cerca de 11–12 px) | Legibilidade | Média |
| F9 | Gráfico de evolução | Duas séries diferenciadas só por cor e sem tooltip desenhado | WCAG 1.4.1 | Média |
| F10 | Barra superior | Texto "Intervalo 3 s ≙ 15 min simulados" é jargão; falta o estado "Retomar" do botão "Pausar" | Nielsen 1 e 2 | Baixa |

**Pontos positivos (mantidos):** contraste de texto adequado (de 5,5:1 a 16:1 sobre os cartões); estados dos serviços comunicados por ícone, cor e texto (✓ ▲ ◆); feedback claro ao salvar configurações; aviso de que "—" não equivale a zero.

## 6. Ajustes de IHC no protótipo

| Ponto | Ajuste | Aplicado |
|---|---|---|
| F1 | Clarear a borda dos campos (≥ 3:1) e criar o token `borda/campo` | ☐ |
| F2 | Criar variantes do modal: erro de credenciais, carregando e ícone de mostrar/ocultar senha | ☐ |
| F3 | Reescrever a nota em linguagem simples e aumentar o texto | ☐ |
| F4 | Ocultar o token ou movê-lo para "Ver detalhes técnicos" | ☐ |
| F5 | Separar "Limpar histórico" (estilo destrutivo) e criar modal de confirmação | ☐ |
| F6 | Unificar as contagens de serviços em toda a tela | ☐ |
| F7 | Padronizar todos os textos em português | ☐ |
| F8 | Subir rótulos para no mínimo 12 px | ☐ |
| F9 | Marcadores/estilo de linha distintos e tooltip no gráfico | ☐ |
| F10 | Reescrever o texto do intervalo e criar o estado "Retomar" | ☐ |

## 7. Conclusão

Os participantes Luka Gomes e Isabelly Marinho avaliaram positivamente a navegação, as cores e o design do protótipo e consideraram que ele atende às especificações do projeto. Ambos destacaram que a validação do cliente é a mais relevante para decidir mudanças de cores, design e elementos, o que ficou como próximo passo da equipe. A inspeção heurística apontou ajustes de usabilidade e acessibilidade pontuais (contraste das bordas, estados do login, confirmação de ação destrutiva, consistência de contagens e idioma), listados na seção 6 e independentes de preferência estética.
