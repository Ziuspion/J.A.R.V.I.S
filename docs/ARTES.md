# Artes do HUD - direção visual unificada

Revisão de 06/11/2026. As três novas artes foram geradas/editadas pelo gerador integrado de imagens. EDITH conserva a arte dos óculos da edição anterior. Os quatro sistemas agora compartilham acabamento, escala e enquadramento, com motivos e paletas próprios.

| Sistema | Arte final | Identidade | Dimensões |
| --- | --- | --- | --- |
| JARVIS | assets/art/jarvis-hud.png | Ciano, circuitos de engenharia e índices âmbar | 1254 × 1254 |
| Friday | assets/art/friday-hud.png | Laranja, segmentos e trilhas táticas | 1254 × 1254 |
| EDITH | assets/art/edith-hud.png | Azul, violeta e óculos holográficos | 1254 × 1254 |
| Ultron | assets/art/ultron-hud.png | Vermelho sangue e malha neural orgânica | 1254 × 1254 |

Todos são PNG RGBA com transparência. Os bytes finais foram copiados para o projeto sem alteração de pixels, alongamento ou recorte. Cada imagem é encaixada em um SVG 600 × 600 com `xMidYMid meet`. Os nomes dentro de JARVIS e Friday são texto SVG, para preservar grafia e nitidez.

## Entradas das três novas artes

As imagens 1, 2 etc. de cada prompt correspondem à ordem de `paths` em [PROMPTS_HUD.json](PROMPTS_HUD.json).

- JARVIS: oficina Stark como referência de clima e densidade visual; referência circular do JARVIS como estrutura; EDITH e a versão ciano de Ultron como acabamento.
- Friday: referência circular laranja como estrutura; EDITH e Ultron ciano como acabamento comum.
- Ultron: a arte ciano anterior como alvo de edição. A nova paleta troca ciano e âmbar por carmesim e vermelho sangue, preservando a estrutura neural.
- A imagem extraída do novo `edith pic.7z` está em `assets/referencias/edith-pov.jpg`. Ela orientou os enquadramentos ópticos, linhas finas e detalhes da interface de EDITH. O PNG dos óculos foi preservado.

Parâmetro comum das três chamadas: `transparent_background=true`. Os prompts completos e a ordem dos arquivos estão no JSON ao lado. A resolução entregue foi 1254 × 1254 para cada arte, a mesma de EDITH.

## Prompt da arte preservada de EDITH

```text
Use case: style-transfer. Asset type: finished square HUD avatar for an actual web assistant. Image 1 is the edit target and subject identity: EDITH's recognizable angular holographic eyeglasses, electric blue, same lens proportions and slight perspective; redraw as crisp refined luminous artwork rather than using a photo rectangle. Images 2 and 3 are supporting STYLE references only: the elegant concentric segmented circular Jarvis and Friday HUD rings. Rebuild EDITH as a member of that same visual family. Composition: exactly 1:1 square 1024 by 1024, centered circle centered at (512,512), outer circle occupies about 82% of canvas; eyeglasses fit comfortably in the central 45% with natural unstretched proportions. Fine blue concentric rings, precise segmented arcs, subtle lavender highlights, elegant restrained glow and delicate optical marks. Actual transparent background, preserve soft alpha glow. No rectangular panel, no source photograph frame, no face, no room, no ground shadow. No text, no letters, no numbers, no logos or watermark. Clean isolated UI art, not a screenshot or full interface. Keep the glasses instantly recognizable and give this the same occupancy and centered circular composition as its paired Ultron avatar.
```

## Integridade das artes finais

- jarvis-hud.png: SHA-256 `08d069ce9742b4ce5f6597be00d84072c2408f560729a9bc8ad6603c9512eb09`
- friday-hud.png: SHA-256 `69ef80ef02c3b63b5416166359dca9e324e5e2caccc8418483ef6c77c592a7c7`
- edith-hud.png: SHA-256 `c37ceaf9b67c90c0b54ebed2b5601a2ba2ed1c03a2bfdfcd496ef9b17f3a4eaa`
- ultron-hud.png: SHA-256 `efe6236b2d15e1f8de714e0a7eb094dd014123ba5da54c5f195b1347cf5f52af`
