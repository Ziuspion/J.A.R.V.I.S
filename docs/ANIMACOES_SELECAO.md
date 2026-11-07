# Seleção animada - EDITH e Ultron

A galeria em **Sistemas** agora inclui camadas de animação 2D próprias para os dois personagens.

- **EDITH:** reflexos percorrem os óculos, retículas ajustam o foco e um arco de luz percorre a borda. A linguagem é óptica e holográfica.
- **Ultron:** pontos de energia pulsam e correntes luminosas percorrem trajetos sobre a malha neural vermelha. Um pulso suave varia a luminosidade do centro.
- Passar o mouse, usar o teclado nos controles do cartão ou deixar o sistema selecionado dá mais presença às camadas de luz.

Os movimentos novos só são ativados com a galeria aberta. Fechar a seleção remove essas animações. **Preferências > Animações da interface** permite desligá-las; a preferência do navegador por menos movimento também é respeitada. As figuras mantêm suas proporções e não têm inclinação ou perspectiva 3D.

## Artes de JARVIS e Friday

As duas imagens são exatamente as criadas no pedido visual anterior, sem nova geração ou alteração de pixels:

- `assets/art/jarvis-hud.png`: SHA-256 `08d069ce9742b4ce5f6597be00d84072c2408f560729a9bc8ad6603c9512eb09`.
- `assets/art/friday-hud.png`: SHA-256 `69ef80ef02c3b63b5416166359dca9e324e5e2caccc8418483ef6c77c592a7c7`.

Esses mesmos PNGs são embutidos no HTML e usados no núcleo principal, no painel da conversa e na seleção de sistemas. As artes de EDITH e Ultron também foram preservadas; a animação é desenhada sobre elas em SVG/CSS.

## Verificação

No Chromium, foram conferidas mudanças de transformação, opacidade e percurso da luz em instantes diferentes. Ao fechar a galeria, as animações novas passam a `none`; com os efeitos desligados, as camadas ficam ocultas. Os movimentos foram reativados e a seleção final foi conferida visualmente.

Os 110 testes existentes passaram novamente. As personalidades, a conexão e os dados de conversa foram preservados nesta alteração visual.
