# Loja de aplicativos — especificação do Figma

Fonte: arquivo `GlassStack`, key `u7JQalT1bK3498NiMmLLvg`, página `Main`.
Extraído em 2026-08-24 via MCP (metadata dos 8 frames + design context de `36:696` e `32:310`).

> **Nota importante:** o Figma está desatualizado. O design mandatório é o implementado no código.
> Esta espec captura estrutura, conteúdo e estados; adaptações visuais seguem o design system atual.

## Frames

| Node | Nome | Estado |
|---|---|---|
| `14:535` | Dashboard - Store | Catálogo inicial |
| `26:2` | Dashboard - Store - Scrolled up | Catálogo rolado |
| `44:2095` | ... - Filter expanded | Ordenação/filtros abertos |
| `26:157` | App detailed view | Detalhe do app |
| `36:587` | ... - Custom install | Detalhe com instalação customizada |
| `36:696` | ... - Installing | Instalação em andamento |
| `30:656` | App detailed view (rodapé) | Reviews / Details / Requirements |
| `32:310` | App detailed view (variante) | Header sticky + rodapé completo |

## Janela da loja (shell comum)

- Fundo `#151A21`, raio 16px, janela 1168×823 dentro do desktop.
- Título da barra: "Applications Store" (12px semibold) com ícone voltar (20×20) à esquerda e fechar (24×24) à direita.
- Conteúdo interno usa padding lateral de 20px.

## 1. Catálogo (`14:535`, `26:2`)

- **Hero carousel** (1128×320): dois slides lado a lado (~567/561×320), dots de paginação (96×21).
- **Mini-card destacado** sobre o slide (271×80): ícone 64×64, título "Jellyfin", editor "Jellyfin Dev Team", badge "Docker Image", ícone de ação 24×24.
- **Busca** ("Find app...", 1128×48, raio grande): no estado inicial fica abaixo do carousel (y≈411); rolado, cola sob o título (y=74). Ícones à direita.
- **Grid de resultados** 2 colunas × N linhas, cartões 560×180:
  - ícone 64×64, título (app name), editor pequeno,
  - badge chip "Docker Image" (69×14, raio 10),
  - categoria legenda ("Multimedia"),
  - descrição 2–3 linhas,
  - botão pill "Instalar" (75×27).
- Exemplo de descrição (Jellyfin): "Jellyfin is the volunteer-built media solution that puts you in control of your media. Stream to any device from your own server, with no strings attached. Your media, your server, your way."

## 2. Filtros/ordenação (`44:2095`)

- Busca expandida com 4 ícones de filtro à direita do campo.
- Popover flutuante de ordenação com caret para cima: opção "Recent first".

## 3. Detalhe do app (`26:157`, `36:587`)

- Link "Voltar" (ícone seta 20×20 + label 8px) abaixo do título da janela.
- Cabeçalho: ícone grande 118×118 (raio 16), título 26px, editor 12px `#818181`.
- Bloco direito "Aditional info":
  - `Rating:` + estrelas;
  - `Type:` + badge "Docker Image" (fundo `#00B5F0`, raio 10);
  - `Categories:` lista colorida — Multimedia `#FF9B9B`, Video `#FFF09B`, Library `#9BFFBC`;
  - variante custom install adiciona botão secundário "Custom install" (116×28).
- Ação principal: botão azul `#00BFFF` (80×28, raio 8) "Install" + kebab menu 20×20.
- Descrição full-width 16px (1117×~144).
- **Screenshots**: duas imagens ~567×320 com dots de carrossel (96×21).

## 4. Instalando (`36:696`)

- Botão primário vira "Installing" (116×28, `#00BFFF`) com **spinner animado** 20×20 dentro do botão.
- Abaixo do botão: linha de progresso 116px com labels 7px — "Progress" à esquerda, "75%" à direita.
- Restante do layout do detalhe inalterado.

## 5. Rodapé do detalhe (`30:656`, `32:310`)

- **Header sticky** (1128×80, blur, `rgba(0,0,0,0.34)` raio 16): ícone 56×56, nome 20px, cluster de ação à direita (Install/Installing + progresso igual ao item 4).
- Faixa de screenshots no topo + dots.
- **Três colunas** separadas por linhas verticais (161px de altura):

### Reviews (coluna 1, ~300px)
- Título "Reviews" 16px; link "Write review" `#00BFFF` 9px alinhado à direita.
- Estrelas (resumo) ~243×33.
- Card de review (298×50, fundo `rgba(42,42,42,0.51)`): autor 16px + tempo `#818181` 7px ("Eric E.", "3d ago"), snippet 9px truncado, avatar 22×22 à direita.
- Link "See all reviews" `#818181` 12px.

### Details (coluna 2, ~257px)
- Título "Details".
- Linhas 12px: "Latest version: 0.5.8", "Image size: 243MB",
  "Architecture:" com valores coloridos — x86-64 `#00B5F0`, arm64 `#8B87F9`, riscv64 `#60E5E1`, mips64 `#4CE699`.
- Link "Go to Docker hub" `#00BFFF` 14px.

### Requirements (coluna 3, 355px)
- Título "Requirements".
- Tabela (355×125, fundo `rgba(33,33,33,0.33)`, blur 7px, raio 4px) com componente `.Row` (31px por linha, células `rgba(255,255,255,0.05)` com borda esquerda/topo, padding 12px/10px, texto 12px Inter):
  | Category | Minimum | Recommended |
  |---|---|---|
  | Memory | 2GB | 4GB+ |
  | Storage | 50GB | 100GB+ |
  | Processor | Dual Core 64bits | Six Core ARM |

## Tokens observados

- Fundo janela: `#151A21`; superfícies translúcidas com blur.
- Primária: `#00BFFF`; type-badge: `#00B5F0`; custom install: `#8B87F9`.
- Texto secundário: `#818181`; branco para títulos.
- Fonte: Instrument Sans (projeto usa a própria stack tipográfica).

## Adaptações para o projeto

- Janela/sidebar/statusbar vêm do shell do projeto (Window component), não duplicados.
- Botões/inputs/selects/skeleton reutilizam `core/components`.
- Grid fluido em vez de posicionamento absoluto.
- Textos em português quando o projeto é pt-BR; centralização de labels facilita i18n.
- MSW em `test/mocks` enquanto o backend não está integrado; `pnpm dev:mock` habilita.
