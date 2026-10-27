# Interface do GreenER

Documento de Interação Humano-Computador (IHC): usuários e tarefas, protótipos, decisões de interface, avaliação de usabilidade e melhorias.

## 1. Usuários e tarefas

### 1.1 Perfis de usuários

| Perfil | Quem é | Objetivo no GreenER | Acesso |
|---|---|---|---|
| **Administrador da plataforma** | Pessoa responsável por operar o GreenER na empresa | Manter o monitoramento funcionando, ajustar parâmetros de coleta e consultar o histórico | Área do Administrador (login com JWT) |
| **Analista de infraestrutura / operações** | Profissional que acompanha os microsserviços em nuvem | Identificar serviços indisponíveis ou sem métricas e quais consomem mais recursos | Observatório (público) |
| **Gestor de sustentabilidade** | Pessoa que acompanha indicadores ambientais da empresa | Entender o consumo de energia e as emissões de CO₂e por serviço e por região | Observatório (público) |

### 1.2 Tarefas prioritárias

| # | Tarefa | Perfil | Tela | Situação |
|---|---|---|---|---|
| T1 | Entrar na área administrativa com e-mail e senha | Administrador | Modal de login | Implementada (Sprint 1) |
| T2 | Conferir a sessão ativa e sair com segurança | Administrador | Área do Administrador | Implementada (Sprint 1) |
| T3 | Saber de quanto em quanto tempo os dados são coletados e quando foi a última coleta | Todos | Observatório | Implementada (Sprint 1) |
| T4 | Entender o significado dos estados de um serviço (ativo, sem métricas, indisponível) | Analista | Observatório | Implementada (Sprint 1) |
| T5 | Localizar um serviço indisponível e onde ele está hospedado | Analista | Dashboard (mapa, cartões e tabela) | Prevista (Sprint 2) |
| T6 | Consultar consumo de energia e emissão de CO₂e por serviço | Gestor de sustentabilidade | Dashboard | Prevista (Sprint 2) |
| T7 | Consultar o histórico de coletas de um serviço | Administrador | Área do Administrador | Prevista (Sprint 2) |
| T8 | Alterar o intervalo de coleta | Administrador | Área do Administrador | Prevista (Sprint 2) |
| T9 | Comparar serviços e ver o ranking de impacto | Gestor de sustentabilidade | Comparar serviços | Prevista (Sprint 3) |

## 2. Protótipos e fluxo de navegação

- **Design system e wireframes (Figma):** [abrir projeto](https://www.figma.com/design/xfX1ubXK9GIpWeV8TNYL1q/greenER---ABP-3%C2%BASEMESTRE?node-id=4-3&t=uQXMxQQpH5LZaIfk-1)
- **Protótipo navegável:** [abrir protótipo](https://www.figma.com/proto/xfX1ubXK9GIpWeV8TNYL1q/greenER---ABP-3%C2%BASEMESTRE?node-id=10-41&t=QK9tYfSXJ4x1c5a1-0&scaling=min-zoom&content-scaling=fixed&page-id=4%3A3&starting-point-node-id=10%3A41&show-proto-sidebar=1)
- **Versão avaliada:** protótipo da Sprint 1 (TASK-006 e TASK-007), testado em 16/10/2026.

### Fluxo mapeado

```text
Dashboard · Visão geográfica
   │  aba "Área do Administrador"
   ▼
Login · modal
   │  "Entrar" ─────────► Área do Administrador · autenticada
   │  "✕" ─► volta ao Dashboard          │  aba "Observatório" / "Sair"
   ▼                                      ▼
                              Dashboard · Visão geográfica
```

| # | Origem | Gatilho | Destino |
|---|---|---|---|
| 1 | Dashboard · aba "Área do Administrador" | Clique | Login · modal |
| 2 | Login · "Entrar" | Clique | Área do Administrador autenticada |
| 3 | Login · "✕" | Clique | Dashboard |
| 4 | Área do Administrador · aba "Observatório" | Clique | Dashboard |
| 5 | Área do Administrador · "Sair" | Clique | Dashboard |
| 6 | Dashboard · "Tabela" / "Cartões" | Clique | Detalhes dos serviços / grade de cartões |

### Rotas implementadas no frontend

| Rota | Acesso | Tela |
|---|---|---|
| `/` | Pública | Observatório |
| `/login` | Pública | Modal de login aberto sobre o Observatório |
| `/config` | Protegida | Área do Administrador |
| `/comparar` | Pública | Comparação de serviços (estrutura provisória) |

## 3. Decisões de interface já aplicadas no código

| Decisão | Onde | Motivo |
|---|---|---|
| Estados dos serviços com **cor, forma e texto** (círculo, losango, triângulo, quadrado) | [`StatusBadge.tsx`](../frontend/src/components/StatusBadge.tsx) | A informação não depende só da cor |
| Login em modal `<dialog>` nativo, com foco preso, Esc para fechar e fundo inerte | [`LoginModal.tsx`](../frontend/src/components/LoginModal.tsx) | Acessibilidade por teclado e leitor de tela |
| Mensagens de erro diferentes para credencial inválida e servidor fora do ar | `LoginModal.tsx` | O usuário entende se deve corrigir a senha ou tentar mais tarde |
| Mensagem de credencial genérica ("E-mail ou senha incorretos.") | `LoginModal.tsx` | Não revela se o e-mail existe |
| Erros de campo exibidos como texto, com `aria-invalid` e `role="alert"` | [`FormField.tsx`](../frontend/src/components/FormField.tsx) | Feedback perceptível sem depender da cor |
| Indicador "Entrando…" e botão desabilitado durante o envio | `LoginModal.tsx` | Feedback de carregamento e prevenção de envio duplo |
| Intervalo de coleta e última coleta exibidos no Observatório, com estados de carregamento e erro | [`HomePage.tsx`](../frontend/src/pages/HomePage.tsx) | O usuário sabe se os dados estão atualizados |
| O token JWT nunca é exibido na tela; a Área do Administrador mostra só e-mail e expiração | [`SessionCard.tsx`](../frontend/src/components/SessionCard.tsx) | Segurança (ponto F4 do relatório de usabilidade) |

## 4. Avaliação de usabilidade

Na Sprint 1 foi realizada uma avaliação inicial do protótipo navegável, com roteiro de tarefas e inspeção heurística (Nielsen e WCAG 2.1).
Relatório completo: [`ihc/relatorio-usabilidade.md`](ihc/relatorio-usabilidade.md).

A avaliação com **usuários representativos** (critério IHC05) está prevista para a Sprint 3.

## 5. Melhorias decorrentes da avaliação

Os pontos de fricção F1 a F10 identificados no relatório estão listados com os ajustes propostos em [`ihc/relatorio-usabilidade.md`](ihc/relatorio-usabilidade.md#6-ajustes-de-ihc-no-protótipo).
Já refletido na implementação da Sprint 1:

| Ponto | Situação no código |
|---|---|
| F2 — estados do login | O modal implementado tem erro de credenciais, erro de servidor e estado de carregamento |
| F4 — token exibido por inteiro | O token não é exibido; apenas e-mail e expiração |

Os demais ajustes serão vinculados a issues e acompanhados nas Sprints 2 e 3 (critério IHC06).

## 6. Responsividade

A verificação documentada dos tamanhos de tela (celular, tablet e desktop) está prevista para a Sprint 2, junto com o dashboard (critério IHC04).
