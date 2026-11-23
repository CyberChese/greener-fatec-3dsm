# Evidências de responsividade e navegação (TASK-035)

Capturas das quatro telas (observatório, mapa, login e área do administrador) em **390 px** (celular), **768 px** (tablet),
**1100 px** (notebook pequeno) e **1440 px** (desktop), mais o menu móvel aberto (`menu-aberto-mobile.png`).

| Arquivo | Tela |
|---|---|
| `observatorio-{mobile,tablet,notebook,desktop}.png` | Observatório (`/`) |
| `mapa-{mobile,tablet,notebook,desktop}.png` | Mapa (`/mapa`) |
| `login-{mobile,tablet,notebook,desktop}.png` | Login (`/login`) |
| `admin-{mobile,tablet,notebook,desktop}.png` | Área do Administrador (`/admin`) |
| `menu-aberto-mobile.png` | Menu móvel aberto (390 px) |

## Como foram geradas

Chromium sem interface, sobre o build de produção do frontend, com as respostas do backend **simuladas por interceptação**
no formato exato do `docs/api.md` (8 serviços nos três estados, dois sem coordenadas, histórico de 14 coletas). Por isso:

- os dados das capturas são de demonstração, não do banco real;
- o mapa aparece **sem a imagem-base** (os tiles do OpenStreetMap não carregam no ambiente de captura); os marcadores e
  as cores são os reais. Para uma captura definitiva do mapa, abra `/mapa` no navegador com internet e tire a captura.

Para refazer com o sistema real: abra o site, `F12` → barra de dispositivos, ajuste a largura (390, 768, 1100, 1440),
`Ctrl+Shift+P` → "Capture full size screenshot".

## Verificação de overflow horizontal

Medição de `document.documentElement.scrollWidth` contra `window.innerWidth`, mais busca de elementos fora da tela que não
estejam dentro de um contêiner com rolagem própria (tabelas rolam dentro do próprio quadro):

| Largura | `/` | `/mapa` | `/login` | `/admin` |
|---|---|---|---|---|
| 390 px | sem overflow | sem overflow | sem overflow | sem overflow |
| 768 px | sem overflow | sem overflow | sem overflow | sem overflow |
| 1100 px | sem overflow | sem overflow | sem overflow | sem overflow |
| 1440 px | sem overflow | sem overflow | sem overflow | sem overflow |

Também sem overflow no observatório em 320, 360, 1024, 1279, 1280 e 1281 px.

Um problema encontrado e corrigido durante a verificação: em 768 px o cabeçalho antigo extrapolava a tela (1058 px de
largura de conteúdo). A troca para o menu abaixo de 1280 px resolveu.

## TASK-047 — melhorias de usabilidade

| Arquivo | Evidência |
|---|---|
| `task-047-login-before.png` | Referência antes da alteração, redimensionada para 778×486. |
| `task-047-login-after.png` | Captura posterior em 778×486, sem credenciais, mostrando o controle para revelar a senha. |
| `task-047-observatorio-simulacao.png` | Captura complementar do observatório no modo de demonstração existente. |
| `task-047-mapa-simulacao.png` | Captura complementar do mapa no modo de demonstração existente. |

As duas capturas da tela de login têm a mesma dimensão; a imagem “antes” foi redimensionada da referência de 1440×900.
As duas capturas complementares usam os dados simulados já existentes na aplicação, identificados na interface como
modo de demonstração. Não são evidência de testes com participantes nem de integração com o backend.

## Navegação por teclado no menu móvel (< 1280 px)

Verificada por Tab, Enter e Escape:

- o primeiro `Tab` leva ao link "Pular para o conteúdo"; o seguinte, ao botão **Menu** (`aria-expanded="false"`);
- `Enter` abre o menu (`aria-expanded="true"`) e `Tab` percorre Observatório, Mapa e Área do Administrador, depois as
  informações de atualização e o botão Pausar;
- `Enter` num item navega para a página, fecha o menu e devolve o foco ao botão Menu;
- `Escape` fecha o menu e devolve o foco ao botão Menu.

## TASK-050 — testes automatizados e cobertura de código (Sprint 3)

- [`relatorio-cobertura-sprint-3.md`](relatorio-cobertura-sprint-3.md): relatório consolidado com a cobertura do backend (Jest), cobertura do frontend (Vitest + v8) e evidência da execução E2E das rotas `/api/metrics/ranking` e `/api/metrics/compare` contra o PostgreSQL real.
