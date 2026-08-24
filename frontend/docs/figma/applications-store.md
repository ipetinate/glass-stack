# Loja de aplicativos — referência do Figma

Fonte: arquivo `GlassStack`, key `u7JQalT1bK3498NiMmLLvg`.

## Frames consultados

- `14:535` — catálogo inicial.
- `26:2` — catálogo rolado.
- `44:2095` — filtros expandidos e ordenação.
- `26:157` — detalhe do aplicativo.
- `36:587` — instalação customizada.
- `36:696` — instalação em andamento.

## Decisões de adaptação

- A janela, sidebar, statusbar e ações de janela são fornecidas pelo projeto e não foram duplicadas.
- Botões, inputs, selects e skeletons reutilizam componentes existentes em `core`.
- Os cards usam layout fluido para preservar a intenção do grid sem reproduzir posicionamento absoluto do frame.
- Os textos foram traduzidos para português; a centralização dos labels permite adicionar i18n depois.
- O catálogo usa MSW em `test/mocks` enquanto o backend não está integrado.
- Para habilitar os mocks no browser durante o desenvolvimento, use `pnpm dev:mock`.

## Referências visuais

- Fundo da loja: `#151A21`.
- Superfícies: preto translúcido com blur e bordas claras de baixa opacidade.
- Ação primária: azul `#00BFFF`.
- Instalação customizada: roxo `#8B87F9`.
- Fonte principal observada: Instrument Sans.
