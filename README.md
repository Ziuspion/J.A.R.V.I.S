# Fusion MK XIV

JARVIS, Sexta-feira, EDITH e Ultron em um assistente generativo de uso geral. O aplicativo principal é um único HTML, sem instalação, servidor obrigatório, bibliotecas externas ou download de um modelo grande.

## Começar agora

1. Extraia o ZIP e abra **JARVIS_FUSION_MK_XIV.html** no navegador. No Windows, INICIAR_JARVIS.bat apenas abre esse HTML.
2. Clique em **Conectar IA** e mantenha **OpenRouter · modelos gratuitos**.
3. Em sua própria conta, gere uma chave em https://openrouter.ai/settings/keys e cole no campo da conexão.
4. Deixe o modelo **openrouter/free** e a opção de restringir a modelos gratuitos marcada.
5. Clique em **Conectar nesta aba** e envie uma mensagem. A primeira resposta confirma o acesso. **Testar** também envia um pedido real e consome uma requisição.

O OpenRouter oferece variantes `:free` sem compra obrigatória de créditos, com limites de uso e disponibilidade. O aplicativo não adiciona saldo, não escolhe um modelo pago como alternativa e não garante uma cota ilimitada. Confira a conta e as condições atuais do provedor. Não publique sua chave nem a envie pelo chat.

## Quatro identidades

| Sistema | Visual | Personalidade |
| --- | --- | --- |
| JARVIS | Anéis ciano e detalhes âmbar, a partir das referências fornecidas | Cortês, calmo, preciso e com humor britânico discreto |
| Sexta-feira | Anéis e segmentos laranja, com arco verde | Prática, próxima e direta |
| EDITH | Visor azul, painéis laterais e rosto holográfico | Analítica e organizada |
| Ultron | Máscara angular metálica e olhos vermelhos | Incisivo, estratégico e irônico, cooperando com o usuário |

Os quatro sistemas mudam a interface e as instruções de personalidade. Todos usam o modelo conectado; não são quatro modelos treinados separadamente. As vozes vêm do sistema ou navegador e não reproduzem as vozes dos atores.

## O que está implementado

- Conversas abertas sobre escrita, ideias, programação, explicações e análise, atendidas pelo modelo generativo conectado.
- Respostas em streaming, botão Parar, preservação de texto parcial, copiar, gerar outra resposta e reutilizar uma pergunta.
- Markdown com títulos, listas, tabelas, links e blocos de código copiáveis, sem executar HTML das respostas.
- Até 40 conversas e 180 mensagens por conversa; nomes editáveis e histórico opcional.
- Contexto recente ativado por padrão: até 24 mensagens anteriores mais a pergunta atual, limitado também pelo tamanho do texto.
- Anexos de texto/código e imagens, quando o modelo conectado aceitar visão. Limite de quatro arquivos por envio; 250 KB/60 mil caracteres por texto e 2 MB por imagem PNG/JPEG/WebP. PDF, DOCX, ZIP, áudio e vídeo não são processados como anexos nesta edição.
- Memória pessoal opcional, que só é enviada ao modelo quando a opção correspondente estiver marcada.
- Ditado com revisão antes de enviar e leitura de respostas usando recursos do navegador.
- Exportação/importação JSON, exportação de uma conversa em Markdown, importação das conversas de backups antigos e cópia SQLite com servidor opcional.
- Tema e núcleo animado por personagem, tela cheia, navegação por teclado e opção de desligar animações.

A geração precisa de internet e de acesso a um modelo. A qualidade, a precisão e as capacidades dependem do modelo escolhido. O HTML não contém os pesos de um LLM e não executa programas, não controla o computador, não pesquisa a web automaticamente e não gera arquivos de imagem ou vídeo. Ele pode escrever código e instruções para essas tarefas.

## Gemini ou outra API

**Gemini:** gere uma chave da sua conta em https://aistudio.google.com/apikey. Selecione Google Gemini, cole a chave e use **Carregar modelos disponíveis**. Escolha um modelo de geração e conecte. A lista retornada pela conta não é uma garantia de gratuidade; confira o modelo, a região e a cota antes de usar. O adaptador usa a API nativa de streaming do Gemini, inclusive imagens.

**Outra API compatível:** informe uma URL base HTTPS com o caminho da API, como `https://seu-provedor.example/v1`, o ID do modelo e a chave desse serviço, quando exigida. O endpoint precisa aceitar `POST /chat/completions` e permitir requisições feitas pelo navegador (CORS). Não inclua chaves na URL. Serviços em `localhost`/`127.0.0.1` podem usar HTTP. Custos e compatibilidade dependem do serviço escolhido.

## Dados e privacidade

A chave digitada em Conectar IA fica na memória desta aba, é retirada do campo após a configuração e não entra em preferências, histórico ou backups. Feche/recarregue a página ou clique em Desconectar para descartá-la. Como em qualquer cliente de API, a requisição enviada pelo navegador contém a chave no cabeçalho; o próprio navegador e extensões autorizadas podem inspecionar a sessão.

O padrão é **sessão temporária**. Conversas e memória pessoal não são gravadas no armazenamento persistente do navegador até você habilitar essa opção. Preferências da interface e do modelo podem ser lembradas. A geração envia ao provedor a pergunta, os anexos selecionados e o contexto autorizado. O tratamento desses dados pelo provedor segue os termos dele.

Exporte um backup antes de fechar se quiser continuar depois. O JSON contém conversas, texto dos anexos, nomes dos personagens e preferências. Imagens ficam somente na memória: seus bytes não são salvos nem exportados; reanexe-as em outra sessão. O cache de imagens é limitado e descarta as mais antigas ao exceder aproximadamente 24 MB em base64. Guarde os originais.

Importar um backup substitui as conversas desta aba após confirmação. A importação antiga recupera apenas conversas e memória; os módulos antigos não retornam. Desativar o histórico remove a cópia persistente das conversas quando as preferências são salvas. As cópias exportadas e as do servidor são independentes.

## Se algo não funcionar

| Situação | O que fazer |
| --- | --- |
| Conexão configurada | A chave/modelo foram carregados, mas ainda não houve uma resposta bem-sucedida. Envie uma pergunta ou use Testar. |
| HTTP 401 | Confira a chave e se ela pertence ao provedor selecionado. |
| HTTP 402 ou 429 | Confira saldo, cota e limite por minuto. Para OpenRouter gratuito, mantenha `openrouter/free` ou uma variante `:free`; aguarde ou escolha outra variante gratuita disponível. |
| HTTP 404 | Confira a URL base e atualize o ID/lista de modelos. |
| Falha de rede ou CORS | Confira internet, políticas de acesso e se o serviço aceita esse navegador/origem. Se permitido, use o servidor opcional em um computador que já tenha Python. Bloqueios administrativos exigem liberação do responsável. |
| Imagem recusada | Use um modelo com visão ou envie somente texto. Reanexe imagens de sessões anteriores. |
| Resposta interrompida | O trecho recebido fica marcado como parcial/interrompido. Peça para continuar ou gere outra resposta. |
| Microfone indisponível | Confira permissão e suporte do navegador. O campo de texto funciona de forma independente. |
| Não lembra de antes | Ative o contexto recente e importe seu backup. Memória pessoal e contexto são opções diferentes. |

## Servidor opcional

Ignore esta seção para usar o HTML diretamente. O servidor existe para guardar snapshots SQLite e manter a chave de um provedor no processo Python, em vez de digitá-la no HTML. Ele exige Python 3.10+ já disponível e não exige `pip install`.

1. Abra CONFIGURAR_JARVIS.bat ou copie `.env.example` como `.env`.
2. Para OpenRouter, defina `AI_PROVIDER=openrouter`, `AI_MODEL=openrouter/free` e `OPENROUTER_API_KEY` com sua chave.
3. Execute INICIAR_SERVIDOR_OPCIONAL.bat, ou `python server.py`.
4. Abra `http://127.0.0.1:8765` e, em Conectar IA, escolha **Servidor opcional**.
5. Em Conversas e dados, use Salvar cópia ou Restaurar cópia. O salvamento automático precisa ser habilitado explicitamente.

O servidor escuta no próprio computador. Não o exponha à internet: não é uma hospedagem pública. Os snapshots ficam no diretório de dados local usado pelo projeto anterior para manter continuidade; o console informa o caminho. Conflitos entre abas suspendem o salvamento automático para evitar sobrescrita silenciosa.

Há endpoints avançados herdados para Tavily, NewsAPI, Wolfram, Supabase, Home Assistant e uma lista explícita de ações no Windows. Eles não possuem controles na interface desta edição e não são executados pela conversa. Consulte docs/INTEGRACOES.md. Nenhum desses serviços é necessário para a conversa direta.

## Manutenção e validação

As fontes editáveis estão em `fonte/` e `personas.json`. Depois de editar, execute `python build.py` para gerar os dois HTMLs idênticos. Esse comando é para desenvolvimento, não para abrir o aplicativo pronto.

Testes locais, sem chaves nem chamadas externas:

```text
node --test testes/test_frontend.js
python -m unittest discover -s testes -p "test_*.py" -v
```

São 32 testes JavaScript e 44 testes Python. Contratos de IA usam respostas simuladas para verificar protocolos, conteúdo e falhas; não comprovam acesso à sua conta. Veja docs/RELATORIO_VALIDACAO.md para os limites e a revisão visual.

## Referências oficiais

- OpenRouter gratuito: https://openrouter.ai/openrouter/free
- Coleção e condições de variantes gratuitas: https://openrouter.ai/collections/free-models
- Streaming OpenRouter: https://openrouter.ai/docs/api_reference/streaming
- API Gemini: https://ai.google.dev/api
- Geração e streaming Gemini: https://ai.google.dev/gemini-api/docs/text-generation
- Preços e nível gratuito Gemini: https://ai.google.dev/gemini-api/docs/pricing

As referências visuais enviadas pelo usuário estão em `assets/referencias/`. Os núcleos da interface são desenhos vetoriais próprios baseados nessas referências. Projeto pessoal inspirado nos personagens do MCU; sem vínculo com Marvel, Disney ou os provedores de IA.
