# J.A.R.V.I.S. MK XV

Interface generativa pessoal inspirada no MCU. Oito identidades com artes 2D, temas e personalidades próprias. A capacidade de resposta vem do modelo conectado; não há um grande modelo escondido no HTML.

## Começar

1. Extraia o pacote completo e abra **JARVIS_MK_XV.html** em um navegador atualizado no computador. `INICIAR_JARVIS.bat` apenas abre esse arquivo no Windows.
2. Abra **Conectar IA**, selecione um provedor, cole a chave da sua conta e informe um modelo disponível. OpenRouter começa com `openrouter/free` e a restrição gratuita ligada.
3. Conecte e envie uma pergunta. **Testar** faz uma chamada curta e também consome uma requisição.
4. No celular ou tablet, prefira a versão web por HTTPS. O pacote `JARVIS_MK_XV_PUBLICAR.zip` contém o site pronto para publicar.

Leia o [guia completo em PDF](docs/GUIA_COMPLETO_JARVIS_MK_XV.pdf). Ele explica cada API, banco de dados, pesquisa, arquivos, dispositivos, publicação e solução de problemas. É um PDF vetorial com fontes incorporadas, nítido ao ampliar para 8K; as artes mantêm sua resolução original.

## Identidades

A ordem é **Jarvis, Friday, Visão, Ultron, Verônica, Karen, EDITH e Iris**. Atalhos: **Alt + 1 a 8**.

- Jarvis: mordomo sereno, discreto, leal, com humor seco; ciano e detalhes em âmbar.
- Friday: análise e estratégia; laranja e cobre.
- Visão: lógica e empatia; dourado.
- Ultron: arrogância teatral e sarcasmo ácido; vermelho sangue.
- Verônica: contingência e prontidão; cobre desgastado.
- Karen: acompanhamento protetor; azul profundo.
- EDITH: energia, jogos e irreverência; azul óptico e óculos.
- Iris: parceira independente; violeta.

As referências dos filmes foram usadas em instruções originais e não como transcrições. A personalidade falada de Verônica e a identidade de Iris são adaptações autorais. EDITH distingue Tony, seu criador, de Peter, estudante que recebeu os óculos. As artes foram preservadas e posicionadas por seus limites de transparência para manter diâmetro aparente uniforme, sem esticar. Animações específicas em SVG 2D ficam ativas apenas nos cartões visíveis.

DUM-E e U são guias locais de controles, acessíveis pela arte cinza no canto ou pelo menu. A saudação permanece: `olá somos dum-e e u, seremos o seus guias hoje`.

## APIs

O catálogo compartilhado está em [api-presets.json](api-presets.json). Há 27 configurações: OpenRouter, Gemini, OpenAI, Anthropic, DeepSeek, Groq, Mistral, xAI, Together, Fireworks, Cerebras, Hugging Face, Cohere, DeepInfra, NVIDIA, Z.ai, MiniMax, Alibaba, Perplexity, Cloudflare Workers AI, SambaNova, Novita, Azure, Ollama, LM Studio, API personalizada e servidor opcional.

Cinco protocolos: Chat Completions, Responses, Anthropic Messages, Gemini GenerateContent e Ollama nativo. Há autenticação configurável, streaming ou JSON, consulta de modelos e cabeçalhos extras permitidos. A base de Azure e Alibaba deve vir do recurso/workspace da sua conta. Recursos, disponibilidade, cobrança e CORS pertencem ao serviço.

**Chaves ficam somente na memória da aba.** Não entram nos backups, IndexedDB ou Supabase. Cabeçalhos extras também não são persistidos. Chaves não são reaproveitadas em outro provedor/endereço. A interface não troca automaticamente para uma API ou modelo pago. Configurações de conexão e identificadores de modelo podem ser lembrados sem a chave.

Uma assinatura de aplicativo não é uma chave API. Confira seus créditos, cotas ou benefícios no painel do provedor. A interface não cria créditos.

### Recursos de criação

Em **Recursos**, configure:

- Imagens: API compatível `/images/generations`, Gemini com saída de imagem, OpenRouter Image API `/images`, ou formato legado de chat multimodal.
- Pesquisa: Tavily, Brave Search, Serper e Exa; até cinco fontes, incluídas na próxima pergunta enquanto a opção estiver ligada.
- Notícias e cálculo: NewsAPI e Wolfram pelo servidor opcional.

Nenhuma chave de busca ou imagem acompanha o projeto. CORS pode exigir o servidor opcional. A configuração dos modelos de imagem é explícita, separada do modelo de conversa.

## Arquivos e conversas

- Imagens PNG/JPEG/WebP de até 2 MB, quando o modelo aceita visão.
- Texto/código de até 250 KB e 60 mil caracteres.
- PDF, DOCX e XLSX de até 8 MB; texto extraído no navegador. PDF: até 100 páginas; pacote Office: expansão e XML limitados.
- Prévia PDF, navegação/zoom e página como imagem para modelos de visão.
- Exportação JSON, Markdown, PDF e Word; última tabela Markdown em XLSX, com células textuais sem executar fórmulas.
- Até 40 conversas e 180 mensagens por conversa; contexto de até 25 mensagens, 100 mil caracteres e quatro imagens.
- Reutilização de pergunta e geração de alternativa em uma nova conversa.

PDF digitalizado precisa de OCR ou página como imagem. A extração não executa macros. Esta versão não envia PDFs como ferramenta nativa de todas as APIs. O PDF exportado de conversa usa fontes básicas e pode substituir símbolos não suportados; o manual usa fontes incorporadas.

As bibliotecas de arquivos têm licenças preservadas em `vendor/`. São carregadas sob demanda. O HTML portátil contém os módulos essenciais para uso local; a versão web carrega arquivos separados e recursos auxiliares do PDF.js.

## Dados

**Sessão temporária por padrão.** Para salvar no mesmo navegador, ative a opção em Preferências. O IndexedDB armazena o snapshot; há fallback limitado quando necessário. Fechar uma sessão temporária perde suas conversas. Exportar é a forma simples de conservar uma cópia.

O backup exclui chaves e bytes das imagens. Ao importar, a aplicação pede confirmação e mantém o compartilhamento da memória pessoal e as cópias automáticas desativados. A memória pessoal só vai ao modelo mediante sua opção.

### Supabase, sem servidor local

1. Crie seu próprio projeto Supabase.
2. Execute [database/supabase_mk_xv.sql](database/supabase_mk_xv.sql) no SQL Editor desse projeto.
3. Configure login por e-mail/senha e confirmação de e-mail, conforme sua escolha.
4. Em **Conversas e dados > Conectar meu banco**, use a URL HTTPS raiz, a chave publishable/anon e seu login. Nunca use service_role, sb_secret ou a senha do banco no navegador.
5. Salve ou carregue manualmente. A cópia é privada por usuário e usa controle de revisão para evitar sobrescrever outra aba silenciosamente.

O SQL foi preparado e revisado, mas não executado em uma conta Supabase real nesta entrega. Confira o isolamento com duas contas de teste no seu projeto antes de confiar dados importantes. Os scripts antigos em `supabase/` atendem rotas legadas do servidor; o painel novo usa exclusivamente o SQL em `database/`.

### Servidor Python e SQLite opcionais

O HTML não depende de Python. Em um computador autorizado com Python 3.10+:

1. Copie `.env.example` para `.env`; ou execute `CONFIGURAR_JARVIS.bat`.
2. Defina `AI_PROVIDER`, `AI_MODEL` e a chave do provedor.
3. Execute `python server.py --port 8765`, ou `INICIAR_SERVIDOR_OPCIONAL.bat`.
4. Abra o endereço informado e selecione **Servidor opcional deste projeto**.
5. Use o backup do servidor no painel de dados para salvar e restaurar snapshots SQLite.

`AI_PROTOCOL`, `AI_AUTH`, `AI_BASE_URL` e `AI_API_KEY` permitem configuração manual. O padrão antigo do servidor Ollama é Chat Completions em `/v1`; para o protocolo nativo, use `AI_PROTOCOL=ollama`. Serviços adicionais: `TAVILY_API_KEY`, `NEWSAPI_KEY`, `WOLFRAM_APPID`. O servidor preserva a pasta de dados legada para não perder snapshots existentes; `JARVIS_DATA_DIR` permite escolher outra pasta.

O servidor se vincula apenas ao loopback. Não é uma implantação pública multiusuário pronta. O site estático não executa Python. Integrações físicas legadas ficam desligadas por padrão e não são usadas pelo chat da interface.

## Publicação

O ZIP de publicação contém `index.html`, artes, ícones, bibliotecas, manifesto e service worker. Envie esse ZIP a um host estático, por exemplo pelo fluxo Direct Upload do Cloudflare Pages. Escolha um nome curto disponível. A URL de produção será a fornecida pelo serviço. O nome sugerido não foi registrado e o site não foi publicado na sua conta nesta entrega.

Não publique `.env`, banco SQLite ou o ZIP completo. O HTML portátil tem cerca de 30 MB; o pacote web distribui os recursos em arquivos menores. O guia explica Cloudflare Pages e a alternativa GitHub Pages.

O service worker armazena apenas estrutura e artes públicas permitidas. Não armazena chaves, conversas ou respostas de APIs. Geração de respostas exige conexão e serviço acessível. Arquivos e ferramentas carregados sob demanda podem exigir rede na versão web.

## Compatibilidade e desempenho

Layouts responsivos, retrato/paisagem, teclado móvel com Visual Viewport, área segura, zoom, foco, diálogos roláveis, modo compacto a partir de revisão em 190 px, toque, leitura e TV. Gamepad e setas no modo TV movem foco; dependem de um navegador capaz. A API de voz depende do navegador e do sistema. Não há app nativo para relógio ou console.

Efeitos completos/leves/desligados, movimento reduzido do sistema, pausa de animações quando ocultas e carregamento de artes visíveis. Prefira a versão web em aparelhos mais fracos. Mais detalhes e o alcance real dos testes estão em [docs/RELATORIO_MK_XV.md](docs/RELATORIO_MK_XV.md).

O painel **Dispositivo** pede seu clique antes do diagnóstico local. Não usa RAM arredondada ou cota do site como hardware exato. RAM física e armazenamento total/livre exatos não são disponibilizados por uma permissão web. Você pode registrar valores conferidos no sistema, com origem manual indicada. Persistência do armazenamento protege dados do site quando o navegador permite; não revela o disco ou a RAM.

## Desenvolvimento e verificação

`python build.py` recria o HTML portátil, a entrada web, o manifesto, service worker e `dist/`. Não há instalação de pacote para executar esse build; as dependências de arquivos já estão incluídas. A criação dos ícones e do manual pode exigir as bibliotecas usadas nos scripts próprios.

```
node --test testes/test_frontend.js testes/test_regressions.js testes/test_mobile.js testes/test_mkxv_matrix.js testes/test_extensions.js
python -m unittest discover -s testes -p "test_*.py"
```

No Windows, use `TESTAR_JARVIS.bat` com Node e Python disponíveis. O relatório final registra contagens reais e limitações. A base supera 200 mil linhas incluindo bibliotecas funcionais licenciadas; o código autoral, compatibilidade, testes e dependências são contados separadamente. Não há preenchimento artificial para aumentar o total.

`python tools/verify.py` executa as duas suítes, confere a composição do build e atualiza os logs e a contagem. Depois, `python tools/package.py CAMINHO_DE_SAIDA` cria os dois ZIPs, copia o HTML e o manual e gera os hashes. Escolha uma saída fora da pasta do projeto.

## Créditos

Created using AI by Orlando with assistance, and based on the first version created by Nikolas.

Projeto de fã com personalidades adaptadas. Referências do MCU pertencem aos respectivos titulares. Licenças de bibliotecas estão preservadas em `vendor/`.
