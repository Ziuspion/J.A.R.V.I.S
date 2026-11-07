# Revisão de temas e mobile — 07/11/2026

## Resultado

JARVIS e Friday receberam ambientes mais próximos das artes circulares existentes. A revisão também acrescenta adaptação à altura visível, áreas seguras e controles de toque. Os oito PNGs, os prompts das personalidades e as camadas de animação existentes foram preservados. JARVIS e Friday continuam sem nome sobreposto no centro das prévias da seleção; o núcleo da tela inicial mantém sua identificação.

| Sistema | Novo acabamento |
| --- | --- |
| JARVIS | Azul quase preto, ciano, anéis de engenharia, trilhas finas e pequenos detalhes âmbar; emblema circular e painéis discretos |
| Friday | Grafite quente e cobre, laranja, segmentos radiais, divisórias táticas e contornos circulares; a antiga moldura quadrada inclinada foi substituída |

Os demais sistemas mantêm seus materiais e padrões. Os guias continuam em cinza. O crédito solicitado permanece idêntico na seleção e no rodapé.

## Correções e ajustes

- Campos mobile com 16 px, controles principais com área ampliada e zoom por pinça liberado.
- Espaço para recortes da tela e indicador inferior, inclusive em paisagem.
- `interactive-widget=resizes-content` na declaração do viewport e acompanhamento de `VisualViewport` quando disponível. Fallback para redimensionamento de janela quando a API não existir.
- Altura, deslocamento e espaço inferior são calculados sem descontar o teclado duas vezes. O zoom não refaz o layout.
- Com pouco espaço durante a edição, elementos secundários cedem área ao campo de mensagem; a altura máxima do campo também acompanha a tela.
- Enter em teclado de toque até 980 px conserva nova linha; IME e o código legado 229 não disparam envio acidental.
- Menu com botão de fechar, estado expandido, contenção de foco e isolamento do conteúdo de fundo. Quando fechado, fica fora da navegação móvel.
- Diálogos com altura limitada à área visível, cabeçalho persistente e foco inicial no fechamento para evitar abrir teclado sem necessidade.
- Guia não força foco no campo ao abrir em tela compacta; seu formulário continua acessível na apresentação reduzida.
- API do servidor opcional não depende mais de `AbortSignal.timeout`. O prazo abrange a leitura do JSON e é limpo ao terminar.
- Gerar alternativa não depende de `Array.findLastIndex`.
- Retorno via cache de navegação atualiza o indicador de conexão depois de a chave ser descartada; voz interrompida ao ocultar a página não deixa o estado preso em “falando”.
- Falha ao construir o reconhecimento de voz tem tratamento; tela cheia usa detecção de suporte.
- Exportação usa um link anexado temporariamente ao documento e conserva a URL do arquivo por mais tempo para o navegador concluir o download.
- Falha de permissão ao remover histórico não gera uma exceção sem tratamento nem uma confirmação falsa.
- Código e tabelas conservam rolagem própria; decoração não cria uma rolagem lateral desnecessária na área de conversa.

## Testes executados

**142 testes aprovados: 82 JavaScript e 60 Python.** Os 22 casos novos verificam geometria do viewport, os dois comportamentos de teclado, deslocamento, zoom, métricas inválidas, Enter/IME, fallback de APIs, prazo do JSON, agrupamento de eventos, rotação, retorno à página e rolagem do campo dentro do diálogo.

```text
node --test testes/test_frontend.js testes/test_regressions.js testes/test_mobile.js
python3 -m unittest discover -s testes -p "test_*.py" -v
```

Os resultados brutos desta execução estão em `RESULTADO_MOBILE_JS.txt` e `RESULTADO_MOBILE_PYTHON.txt`. Os testes anteriores de streaming, limites, privacidade, backup, servidor e seleção de modelos permanecem na suíte. Nenhum usa uma chave real ou consulta um provedor externo.

## Verificação no navegador

Foi usado Chromium com o HTML compilado em quadros de dimensões controladas. São testes de layout responsivo, sem emulação de sistema operacional ou de engine Safari.

| Viewport em CSS px | Resultado |
| --- | --- |
| 320 × 568 | Cabeçalho, compositor, envio e crédito dentro da tela |
| 360 × 740 | Mesmo resultado |
| 375 × 667 | Mesmo resultado |
| 390 × 844 | Mesmo resultado; seleção com duas colunas e crédito próprio |
| 412 × 915 | Mesmo resultado |
| 768 × 1024 | Tablet sem corte do compositor; conteúdo com rolagem vertical |
| 844 × 390 | Apresentação em paisagem utilizável |
| 1024 × 768 | Sidebar de desktop e chat sem transbordamento da página |
| 1363 × 936 | Apresentação desktop preservada |
| 390 × 380 | Área reduzida com edição: campo de 91 px, seta de 44 px e compositor inteiramente visível |

Também foram conferidos:

- Menu, preferências, conexão, seleção e DUM-E & U, incluindo abertura do guia sem acionar seu campo automaticamente.
- Resposta local do guia sobre guardar conversas.
- Importação confirmada de uma conversa descartável com texto longo, código e tabela.
- Na conversa de teste a 390 px, o bloco de código longo rolava dentro de seus 305 px; a largura total das mensagens permaneceu em 344 px. Texto com `<script>` permaneceu literal, sem criar elemento executável.
- Troca pelas oito identidades sem transbordamento lateral do chat.
- Rascunho visivelmente mantido após tentativa de envio sem conexão e fechamento do diálogo.
- Ausência de `Uncaught`, `SyntaxError`, `ReferenceError` ou `TypeError` nos registros consultados ao final.

## Limites da validação

Não foram testados aparelhos físicos, Safari/WebKit real, teclado nativo, ditado, vozes, câmera, downloads/importação nos seletores de Android/iOS, acesso à conta de um provedor ou uma API real nesta rodada. A redução de altura no navegador e os testes de eventos verificam a lógica; não substituem abrir o teclado no aparelho. A conferência prática restante está em [GUIA_MOBILE.md](GUIA_MOBILE.md).

A entrega contém o HTML e o projeto atualizado, sem publicação de hospedagem. Para celular, o guia inclui uma forma de servir somente o `index.html` por HTTPS.

## Fontes técnicas

- [WebKit: áreas seguras e viewport-fit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/).
- [Chrome: teclado, viewport visual e interactive-widget](https://developer.chrome.com/blog/viewport-resize-behavior/).
- [Chrome: VisualViewport, escala e eventos](https://developer.chrome.com/blog/visual-viewport-api/).

Arquivos principais desta revisão: `fonte/stark-systems.css`, `fonte/mobile.css`, `fonte/platform.js`, integração em `fonte/app.js`, ajustes de foco em `fonte/guide.js` e marcação em `fonte/base.html`. O processo `build.py` continua gerando dois HTMLs idênticos.
