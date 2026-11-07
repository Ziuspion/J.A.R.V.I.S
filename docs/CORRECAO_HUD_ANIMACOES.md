# Karen e Iris: correção do HUD e novas animações

07/11/2026. A referência desejada era a interface holográfica sobreposta às mãos na imagem enviada, não as mãos como símbolo das IAs. As duas artes foram recriadas apenas com a geometria da interface: anéis concêntricos, arcos, escalas, setores de varredura e nós hexagonais. Não há mãos, palmas, dedos ou luvas nas artes finais.

Karen mantém azul profundo e elétrico; Iris usa a mesma composição em roxo vivo. Os arquivos `assets/art/karen-hud.png` e `assets/art/iris-hud.png` são PNG RGBA de 1254 × 1254, com transparência, incorporados ao HTML. Os prompts completos da geração integrada estão em `PROMPTS_CORRECAO_HUD.json`; eles substituem os prompts anteriores dessas duas artes.

## Movimento por identidade

| Sistema | Animação |
| --- | --- |
| Verônica | Setores de prontidão, linha de varredura vertical, fluxo de energia e pulso no módulo central |
| Karen | Órbita lenta de sensores, varredura e pontos de luz com pulso suave |
| Iris | Mesma estrutura de sensores com órbitas em sentidos opostos e cadência mais ágil |
| Visão | Losango dourado com brilho gradual, fluxo de circuitos e órbita lenta |

As quatro novas camadas funcionam na seleção, no núcleo principal e no núcleo lateral durante a conversa. A PNG permanece fixa e proporcional; somente as camadas SVG de luz se movem. As animações anteriores de EDITH e Ultron na seleção continuam presentes.

Os efeitos podem ser desligados em Preferências e respeitam a redução de movimento do sistema. Cartões fora da área visível não exibem as camadas animadas. O núcleo principal pausa quando uma janela é aberta; as animações pausam quando a aba está oculta. Não foram adicionadas dependências externas, WebGL, modelos 3D ou temporizadores de renderização em JavaScript.

## Verificação

- As duas artes foram inspecionadas e confirmadas como PNG RGBA quadrados de 1254 × 1254.
- Em Chromium, as quatro camadas ficaram visíveis nos novos cartões e apresentaram transformações diferentes em leituras sucessivas, confirmando o avanço do movimento.
- Karen foi ativada na tela principal, onde a nova arte e a camada de sensores foram verificadas.
- Desativar Animações da interface ocultou as camadas e removeu as animações; reativar restaurou o movimento.
- Os 112 testes locais existentes passaram: 52 JavaScript e 60 Python. Nenhuma chave de provedor foi usada nesta revisão visual; sem teste em aparelho móvel físico.

As personalidades, as oito opções da seleção, o crédito e os guias DUM-E e U foram preservados.
