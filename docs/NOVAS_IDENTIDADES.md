> Atualização visual: Karen e Iris foram corrigidas para usar somente o HUD sobreposto às mãos da referência. As quatro novas IAs ganharam animações. Consulte [CORRECAO_HUD_ANIMACOES.md](CORRECAO_HUD_ANIMACOES.md).

# Verônica, Karen, Iris e Visão — 07/11/2026

As quatro novas identidades estão disponíveis em Sistemas. Verônica deixa de ser o cartão “em breve”; Visão aparece como perfil extra. Os oito sistemas usam o modelo conectado, cada um com instruções próprias, saudações, estados, ritmo de voz e assinatura do HUD.

| Sistema | Arte | Jeito de conversar |
| --- | --- | --- |
| Verônica | Módulo de apoio orbital em cobre, ferrugem e marrom alaranjado desgastado | Firme, disciplinada e preparada para contingências. Organiza prioridades e alternativas sob pressão. O espírito de guerra é narrativo; em problemas reais prioriza proteção e decisões responsáveis. |
| Karen | HUD abstrato de sensores hexagonais em azul profundo e elétrico | Protetora, paciente e maternal, sem infantilizar. Orienta, encoraja autonomia e sabe discordar com cuidado. |
| Iris | A mesma composição abstrata de Karen em roxo vivo | Parceira rápida e perceptiva, próxima de Friday em estratégia. Tem iniciativa e não concorda só para agradar. |
| Visão · extra | Rosto esquemático com losango na testa e circuitos dourados | Calmo, curioso e sensível. Combina precisão com atenção às consequências humanas das decisões. |

As ideias de consciência, sentimentos e autonomia são características de interpretação dos personagens. O aplicativo não ganhou consciência comprovada, execução autônoma ou controle de equipamentos. A qualidade da interpretação depende do modelo escolhido. Os textos completos e exemplos originais estão em `personas.json` e são usados tanto pelo HTML quanto pelo servidor opcional.

## Referências e limites da adaptação

O estudo usa as imagens fornecidas e materiais de produção e descrições consultados sobre as obras; não é uma revisão quadro a quadro dos filmes ou episódios completos. A estética e as vozes propostas são adaptações autorais para este projeto.

- **Verônica / Era de Ultron:** a referência é o módulo de suporte da Hulkbuster. A função de apoio orientou modularidade, prontidão e contingência. Como não há uma personalidade verbal detalhada estabelecida por essa aparição, a voz firme é uma criação solicitada pelo usuário. Referência licenciada: [LEGO Marvel — Hulkbuster](https://www.lego.com/en-gb/product/hulkbuster-76210).
- **Karen / De Volta ao Lar:** o suporte e a companhia da IA do traje orientaram competência, paciência e atenção. O lado maternal foi ampliado conforme o pedido do usuário. Referência de contexto: [ComicBook — Karen no traje](https://comicbook.com/marvel/news/spider-man-homecoming-jennifer-connelly/).
- **Iris / Um Novo Dia:** não foi possível confirmar uma IA canônica chamada Iris nos materiais consultados. O perfil mantém o nome e os traços definidos pelo usuário como criação do Fusion. A [página oficial da Sony](https://www.sonypictures.com/movies/spidermanbrandnewday) foi consultada para contexto; ela não fundamenta afirmações sobre uma personalidade chamada Iris.
- **Visão / Era de Ultron, WandaVision e VisionQuest:** identidade, vínculos e humanidade orientaram a interpretação. A combinação conceitual JARVIS/Friday e o dourado são escolhas do usuário. Materiais consultados: [briefing oficial de WandaVision](https://lumiere-a.akamaihd.net/v1/documents/wandavision_production_brief_final_01-06-21_8766810b.pdf) e [Disney — jornada de autodescoberta em VisionQuest](https://thewaltdisneycompany.com/news/marvel-television-visionquest-disney-plus/).

## Arquivos e uso

- `assets/art/veronica-hud.png`, `karen-hud.png`, `iris-hud.png` e `vision-hud.png` são PNGs de 1254 × 1254 com transparência, criados pela geração de imagens integrada. Os prompts completos estão em `docs/PROMPTS_NOVAS_ARTES.json`.
- As fotografias originais estão em `assets/referencias/veronica-modulo.jpeg` e `karen-maos.jpeg`.
- As artes são embutidas no HTML e encaixadas sem esticar. Não exigem download durante o uso.
- **Alt+1 a Alt+8** seleciona as identidades na ordem da galeria; também é possível usar os cartões e a faixa superior.
- O backup continua na versão 4 e preserva os novos autores, a identidade da conversa e a preferência selecionada. Backups antigos continuam aceitos. Credenciais continuam fora dos backups.
- O crédito exato da seleção e os guias DUM-E e U foram preservados. Os guias agora conhecem os oito sistemas.

## Verificação desta revisão

Passaram **112 testes locais**: 52 JavaScript e 60 Python. A cobertura inclui ida e volta de backup das novas identidades, bifurcação de conversa e envio das instruções corretas aos adaptadores; o servidor opcional também verifica todos os perfis com respostas simuladas.

A galeria e as quatro novas identidades foram conferidas em Chromium, janela de 1363 × 936. Todos os oito quadros de arte mediram 254 × 254 e o núcleo principal, 360 × 360. Foi corrigida uma compressão dos cartões que ocultava texto e botões; agora a galeria rola, preservando cabeçalho e rodapé. Karen, Iris e Visão foram conferidos na tela principal, e Verônica foi ativada pela seleção. O guia manteve a saudação original. Sem teste em aparelho móvel físico e sem uso de chave real de provedor nesta revisão.
