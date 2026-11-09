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

## Navegação por teclado no menu móvel (< 1280 px)

Verificada por Tab, Enter e Escape:

- o primeiro `Tab` leva ao link "Pular para o conteúdo"; o seguinte, ao botão **Menu** (`aria-expanded="false"`);
- `Enter` abre o menu (`aria-expanded="true"`) e `Tab` percorre Observatório, Mapa e Área do Administrador, depois as
  informações de atualização e o botão Pausar;
- `Enter` num item navega para a página, fecha o menu e devolve o foco ao botão Menu;
- `Escape` fecha o menu e devolve o foco ao botão Menu.
