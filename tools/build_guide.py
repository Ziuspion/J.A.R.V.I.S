"""Guia vetorial de ativação. As fontes web ficam no próprio PDF, com links legíveis."""
from pathlib import Path
import json, math, re
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether, Flowable
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/GUIA_COMPLETO_JARVIS_MK_XV.pdf'
FONT=Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('UI',str(FONT/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('UI-Bold',str(FONT/'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Mono',str(FONT/'DejaVuSansMono.ttf')))
pdfmetrics.registerFontFamily('UI',normal='UI',bold='UI-Bold',italic='UI',boldItalic='UI-Bold')
NAVY=colors.HexColor('#07151f');CYAN=colors.HexColor('#087b90');INK=colors.HexColor('#142630');MUTED=colors.HexColor('#47616c');LINE=colors.HexColor('#ccdde2');GOLD=colors.HexColor('#b88b3c')
CREDIT='Created using AI by Orlando with assistance, and based on the first version created by Nikolas.'
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyUI',fontName='UI',fontSize=10.1,leading=15.2,textColor=INK,spaceAfter=8))
styles.add(ParagraphStyle(name='H1UI',fontName='UI-Bold',fontSize=26,leading=32,textColor=NAVY,spaceAfter=17))
styles.add(ParagraphStyle(name='H2UI',fontName='UI-Bold',fontSize=13,leading=18,textColor=CYAN,spaceBefore=12,spaceAfter=7))
styles.add(ParagraphStyle(name='SmallUI',parent=styles['BodyUI'],fontSize=8.2,leading=12,textColor=MUTED,spaceAfter=6))
styles.add(ParagraphStyle(name='CodeUI',fontName='Mono',fontSize=8.0,leading=12,textColor=INK,backColor=colors.HexColor('#edf4f6'),borderPadding=9,spaceBefore=6,spaceAfter=13,wordWrap='CJK'))
styles.add(ParagraphStyle(name='CellUI',parent=styles['BodyUI'],fontSize=8.5,leading=12.6,spaceAfter=0))
styles.add(ParagraphStyle(name='HeadCellUI',parent=styles['CellUI'],fontName='UI-Bold',textColor=colors.white))
styles.add(ParagraphStyle(name='LeadUI',parent=styles['BodyUI'],fontSize=13,leading=20,textColor=MUTED,spaceAfter=17))
story=[];chapters=[]

def p(text,style='BodyUI'):
    story.append(Paragraph(text,styles[style]))
def h(text):p(text,'H2UI')
def code(text):p(escape(text).replace('\n','<br/>'),'CodeUI')
def step(n,title,text):p(f'<b>{n:02d} / {title}</b><br/>{text}')
def link(label,url):return f'<link href="{escape(url)}" color="#087b90"><u>{escape(label)}</u></link>'
def note(text):
    t=Table([[Paragraph(text,styles['SmallUI'])]],colWidths=[493]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#edf4f6')),('BOX',(0,0),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),7)]));story.append(t);story.append(Spacer(1,10))
def table(headers,rows,widths):
    data=[[Paragraph(escape(str(x)),styles['HeadCellUI']) for x in headers]]+[[Paragraph(str(x),styles['CellUI']) for x in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,0),1,CYAN),('LINEBELOW',(0,1),(-1,-1),.4,LINE),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f4f8f9')])]))
    story.append(t);story.append(Spacer(1,11))
def chapter(label,title,intro=None):
    if story:story.append(PageBreak())
    chapters.append((label,title));p(f'<a name="{label}"/>{len(chapters):02d} / MANUAL DE OPERAÇÃO','SmallUI');p(title,'H1UI')
    if intro:p(intro,'LeadUI')

class Guide(SimpleDocTemplate):
    def afterFlowable(self,flow):
        if isinstance(flow,Paragraph) and flow.style.name=='H1UI':
            title=flow.getPlainText();key='chapter-'+str(self.page);self.canv.bookmarkPage(key);self.canv.addOutlineEntry(title,key,0,False)

def furniture(c,doc):
    c.saveState();w,h=doc.pagesize
    if doc.page==1:
        c.setFillColor(NAVY);c.rect(0,0,w,h,fill=1,stroke=0)
        c.setStrokeColor(colors.HexColor('#123642'));c.setLineWidth(.4)
        for x in range(28,600,32):c.line(x,0,x,h)
        for y in range(25,850,32):c.line(0,y,w,y)
        cx,cy=465,490
        for radius in [81,98,123,145,172]:
            c.setStrokeColor(colors.HexColor('#285765') if radius%2 else colors.HexColor('#244047'));c.setLineWidth(.7);c.circle(cx,cy,radius,fill=0)
        for i in range(72):
            a=i*math.pi/36;r1=152;r2=160 if i%6 else 168;c.setStrokeColor(colors.HexColor('#51b3c5'));c.line(cx+math.cos(a)*r1,cy+math.sin(a)*r1,cx+math.cos(a)*r2,cy+math.sin(a)*r2)
        c.setFillColor(colors.HexColor('#6dd9e8'));c.setFont('UI',9);c.drawString(49,780,'PERSONAL INTELLIGENCE / RELEASE 15.0.0')
        c.setFillColor(colors.white);c.setFont('UI-Bold',39);c.drawString(47,694,'J.A.R.V.I.S.')
        c.setFillColor(colors.HexColor('#e4bd72'));c.setFont('UI-Bold',61);c.drawString(45,626,'MK XV')
        c.setFillColor(colors.HexColor('#d5e8ed'));c.setFont('UI',21);c.drawString(49,556,'Seu sistema. Suas escolhas.')
        c.setFont('UI',12)
        for y,text in [(511,'Guia completo de ativação e publicação'),(488,'APIs / arquivos / conversas / dispositivos'),(465,'Banco de dados pronto para configurar')]:c.drawString(49,y,text)
        c.setStrokeColor(colors.HexColor('#74d7e5'));c.line(49,380,545,380)
        c.setFillColor(colors.HexColor('#b9d1d9'));c.setFont('UI',10)
        for y,text in [(344,'Uma interface generativa com oito identidades.'),(324,'Preservada a estética que Orlando construiu.'),(304,'Instruções para começar sem instalar programas.')]:c.drawString(49,y,text)
        c.setFillColor(colors.HexColor('#73b9c6'));c.setFont('UI',8.8);c.drawString(49,207,'07 NOV 2026 / EDIÇÃO EM PORTUGUÊS')
        c.setFillColor(colors.HexColor('#b9d1d9'));c.setFont('UI',9)
        c.drawString(49,179,'PDF vetorial: texto e gráficos nítidos em 8K e além.')
        c.setFont('UI',7.1);c.drawString(49,64,CREDIT)
        c.setFillColor(colors.HexColor('#6dd9e8'));c.setFont('UI',8);c.drawRightString(547,38,'ORLANDO / NIKOLAS')
    else:
        c.setFillColor(NAVY);c.rect(0,h-48,w,48,fill=1,stroke=0);c.setFont('UI-Bold',9);c.setFillColor(colors.white);c.drawString(48,h-29,'J.A.R.V.I.S. MK XV');c.setFont('UI',8);c.setFillColor(colors.HexColor('#91d8e4'));c.drawRightString(w-48,h-29,'ATIVAÇÃO / OPERAÇÃO / PUBLICAÇÃO')
        c.setStrokeColor(LINE);c.line(48,51,w-48,51);c.setFillColor(MUTED);c.setFont('UI',6.8);c.drawString(48,36,CREDIT);c.setFont('UI-Bold',8);c.setFillColor(CYAN);c.drawRightString(w-48,20,f'{doc.page:02d}')
    c.restoreState()

story.append(Spacer(1,630))
chapter('mapa','O caminho até a primeira resposta.','Comece com uma conexão. Ative o restante quando precisar.')
for label,title in [('inicio','Abrir e conectar'),('conceito','O que esta versão oferece'),('catalogo1','APIs de conversa e modelos'),('avancado','Compatibilidade avançada'),('imagens','Criar imagens'),('pesquisa','Pesquisar e consultar serviços'),('apoio','Ativar notícias e cálculos'),('arquivos','Ler e exportar arquivos'),('local','Salvar conversas no aparelho'),('supabase','Ativar Supabase'),('servidor','Servidor opcional e SQLite'),('publicar','Publicar com uma URL curta'),('dispositivos','Celular, tablet, computador e outras telas'),('identidades','Oito identidades e suas referências'),('qualidade','Melhorar a qualidade das respostas'),('problemas','Resolver problemas'),('hardware','Permissões e capacidades do aparelho'),('validacao','Verificação e limites'),('fontes','Documentação e fontes')]:p(link(title,'#'+label))
note('<b>O que depende de você:</b> criar as contas dos serviços, gerar suas chaves, escolher modelos liberados na sua conta e publicar o pacote. Nenhuma chave pessoal acompanha o projeto.')
p('Este manual não atribui uma resolução fixa às páginas: textos e diagramas são vetoriais. As artes do aplicativo mantêm sua resolução original. Ampliar um PDF não cria detalhes novos em imagens raster.','SmallUI')

chapter('inicio','Abra. Conecte. Converse.','A interface funciona sem instalação; as respostas precisam de um modelo acessível.')
step(1,'Escolha o pacote','No computador, extraia o ZIP completo e abra <b>JARVIS_MK_XV.html</b>. O arquivo reúne a interface, as artes e as bibliotecas locais. Para celular e tablet, prefira o endereço HTTPS da versão publicada.')
step(2,'Conecte um modelo','Abra <b>Conectar IA</b>. Escolha o provedor. Cole uma chave da sua própria conta. Informe o ID do modelo ou use <b>Carregar modelos disponíveis</b>. Em APIs sem catálogo, copie o ID do painel do serviço.')
step(3,'Comece de forma econômica','OpenRouter vem com <b>openrouter/free</b> e restrição gratuita ativa. A disponibilidade e os limites dependem do serviço. O aplicativo não alterna automaticamente para um modelo pago.')
step(4,'Verifique o acesso','Use <b>Testar</b>, que faz uma consulta curta, ou conecte e envie uma pergunta. Uma resposta real confirma a configuração naquela sessão. O teste também consome uma requisição.')
step(5,'Escolha sua identidade','Abra <b>Sistemas</b> ou as abas superiores. O modelo continua sendo o escolhido; personalidade, cores, linguagem visual e instruções mudam com a identidade.')
note('<b>Chaves:</b> ficam na memória desta aba e são descartadas ao sair. Elas não são incluídas nos backups ou no histórico. Reabra a conexão após recarregar. A chave é enviada somente ao endereço que você configurou.')
h('Um primeiro pedido útil')
code('Quero criar [resultado]. Tenho [restrições].\nUse [formato]. Antes de concluir, confira [critérios].')
p('DUM-E e U explicam os controles localmente. Abra a pequena arte cinza no canto ou a opção <b>DUM-E e U · guia</b> no menu. Eles não consomem a cota da sua API.')

chapter('conceito','O modelo dá capacidade. A interface dá forma.','Esta versão conecta serviços generativos reais e preserva a identidade do seu projeto.')
table(['Recurso','Como funciona nesta versão'],[
('Conversa e programação','Streaming de texto, Markdown, tabelas, código, reutilização de perguntas e geração de alternativa.'),('Arquivos e visão','Imagens para modelos com visão; texto, PDF, Word e Excel extraídos localmente antes do envio.'),('Criação de imagens','Painel dedicado com API de imagens compatível, Gemini e formatos OpenRouter.'),('Pesquisa','Busca explícita em quatro serviços, com fontes anexadas à próxima pergunta; Tavily também pelo servidor.'),('Voz','Ditado e leitura das respostas quando oferecidos pelo navegador e sistema.'),('Memória e dados','Contexto recente, memória pessoal opcional, IndexedDB, backup em arquivo, SQLite e Supabase opcionais.'),('Uso em telas diferentes','Layout responsivo, modos compacto, toque, leitura e TV; navegação espacial e gamepad opt-in.')],[132,361])
p('A análise de recursos de ChatGPT, Claude, Gemini e DeepSeek orientou a seleção de funções úteis. Assinaturas, ferramentas proprietárias, execução de código em nuvem, agentes que operam o computador, conectores empresariais e geração de vídeo não são reproduzidos por uma chave de conversa. Não há execução automática de ferramentas ou acesso remoto aos seus aparelhos.')
p('Escolher um personagem não treina um modelo novo nem aumenta os parâmetros do modelo. A qualidade depende do serviço, do modelo escolhido, do contexto e do pedido. Esta interface organiza esses recursos sem simular respostas generativas offline.')

CAT=json.loads((ROOT/'api-presets.json').read_text())
DOCS={
'openrouter':('https://openrouter.ai/docs/quickstart','Crie uma chave no painel do OpenRouter. Mantenha a restrição gratuita até escolher explicitamente outro modelo.'),
'gemini':('https://ai.google.dev/gemini-api/docs','Gere uma chave no Google AI Studio. Consulte os modelos liberados e sua cota. IDs Gemini são usados sem o prefixo models/.'),
'openai':('https://developers.openai.com/api/docs','Crie uma chave de projeto no painel da API. Escolha um modelo disponível para sua conta. O protocolo inicial é Responses.'),
'anthropic':('https://platform.claude.com/docs','Crie uma chave na plataforma Claude. O cliente usa Messages e os cabeçalhos de versão. Sua organização pode restringir acesso direto do navegador.'),
'deepseek':('https://api-docs.deepseek.com/','Use o painel de API DeepSeek, não uma sessão do aplicativo de chat. Consulte os IDs atuais. Pode selecionar Responses nas opções avançadas quando seu endpoint oferecer esse formato.'),
'groq':('https://console.groq.com/docs/openai','Gere uma chave na GroqCloud e informe um modelo de conversa da conta. O formato inicial é Chat Completions.'),
'mistral':('https://docs.mistral.ai/','Use a chave criada no console Mistral e um ID do catálogo. Imagens exigem um modelo com visão.'),
'xai':('https://docs.x.ai/','Use uma chave xAI e um modelo habilitado. Responses é a configuração inicial; Chat Completions pode ser selecionado se necessário.'),
 'together':('https://docs.together.ai/docs/openai-api-compatibility','Gere a chave no painel Together. Copie o ID completo do modelo. A base atual usa api.together.ai/v1.'),
'fireworks':('https://docs.fireworks.ai/tools-sdks/openai-compatibility','Use uma chave Fireworks e o identificador completo da implantação ou modelo. Preserve inference/v1 na base.'),
'cerebras':('https://inference-docs.cerebras.ai/','Use a chave da conta de inferência. A configuração utiliza max_completion_tokens para o limite de saída.'),
'huggingface':('https://huggingface.co/docs/inference-providers','Gere um token Hugging Face com a permissão de inferência necessária. Informe o modelo e eventual sufixo do provedor conforme a conta.'),
'cohere':('https://docs.cohere.com/docs/compatibility-api','Use uma chave Cohere e a base de compatibilidade. Essa opção não é o endpoint nativo /v2/chat.'),
'deepinfra':('https://deepinfra.com/docs/openai_api','Gere um token DeepInfra e copie o identificador completo do modelo. Preserve v1/openai na base.'),
'nvidia':('https://build.nvidia.com/','Obtenha uma chave do API Catalog e copie o modelo do exemplo oficial. Esta opção usa a API hospedada, não uma instalação local do NIM.'),
'zai':('https://docs.z.ai/','Use a chave da API geral. Planos de programação podem usar outra base; copie o endereço do seu plano e ajuste manualmente.'),
'minimax':('https://platform.minimax.io/docs/','Use a chave e o ID mostrados na sua conta MiniMax. A configuração inicial utiliza Chat Completions e max_completion_tokens.'),
'alibaba':('https://www.alibabacloud.com/help/en/model-studio/','Copie a base OpenAI compatível do seu workspace e região. O campo fica vazio de propósito: um endereço de outra região pode não servir à sua conta.'),
'azure':('https://learn.microsoft.com/azure/ai-foundry/openai/how-to/switching-endpoints','Crie um recurso e uma implantação. Cole sua base com /openai/v1 e use o nome da implantação como modelo. A autenticação inicial é api-key.'),
'ollama':('https://docs.ollama.com/api/chat','Requer um serviço Ollama já instalado em um aparelho acessível. O endereço 127.0.0.1 aponta para o aparelho que abre a página, não para outro PC.'),
'lmstudio':('https://lmstudio.ai/docs/developer/openai-compat','Requer o servidor local já ativo no LM Studio, com modelo carregado. O formato inicial é Chat Completions sem chave; ajuste se o servidor exigir autenticação.'),
'compatible':('https://developers.openai.com/api/docs','Para outro serviço, copie a base, o modelo, o protocolo e o tipo de autenticação da documentação dele. Compatibilidade não significa que todos os modelos tenham visão ou ferramentas.'),
'perplexity':('https://docs.perplexity.ai/docs/agent-api/openai-compatibility','Gere sua chave Perplexity e use o catálogo atual da Agent API. A base inclui /v1 e o formato é Responses. Não use a configuração antiga Sonar como padrão de um projeto novo. Ferramentas nativas de agente não são executadas por este cliente.'),
'cloudflare':('https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/','Gere um token com acesso Workers AI na conta correta. Copie sua base: https://api.cloudflare.com/client/v4/accounts/SEU_ACCOUNT_ID/ai/v1. Informe um modelo do catálogo Workers AI. A hospedagem Pages e a inferência são serviços separados.'),
'sambanova':('https://docs.sambanova.ai/docs/en/get-started/quickstart','Gere uma chave SambaCloud e confirme a URL no painel API keys and URLs. Informe o modelo liberado. Se usar uma implantação SambaStack, copie a base fornecida pelo administrador.'),
'novita':('https://docs.novita.ai/api-reference/model-apis-llm-create-chat-completion','Gere uma chave na Novita e consulte o ID do modelo. A configuração usa a base OpenAI atual /openai/v1. Ajuste a base para uma implantação própria quando necessário.'),
'server':('', 'Requer server.py aberto e configurado pelo dono. Esta opção usa a chave do servidor e não pede que o visitante a cole no navegador.')}
items=list(CAT.items())
for offset in range(0,len(items),2):
    chunk=items[offset:offset+2];chapter('catalogo'+str(offset//2+1),'APIs de conversa'+('' if offset==0 else ' / '+str(offset//2+1)),f'Fichas {offset+1:02d} a {min(offset+2,len(items)):02d} de {len(items)} configurações. Use o ID do modelo disponível na sua conta.')
    for key,item in chunk:
        h(item['name']);doc,desc=DOCS[key];p(desc)
        table(['Campo','Valor'],[('Protocolo',escape({'chat':'Chat Completions','responses':'Responses','anthropic':'Messages','gemini':'GenerateContent','ollama':'Chat nativo','server':'Servidor deste projeto'}[item['protocol']])),('URL base',escape(item['base']) or 'Copie do seu recurso / workspace'),('Autenticação',escape(item['auth'])),('Variável no servidor',escape(item.get('env','Sem chave remota neste perfil')))], [134,359])
        if doc:p(link('Documentação oficial',doc),'SmallUI')
    if offset==0:note('A configuração implementa o protocolo; a disponibilidade, os IDs, a cobrança e CORS pertencem ao serviço. A listagem pode não existir ou exigir chave. Informe o modelo manualmente quando necessário. Nenhuma conta externa foi usada para homologar todos os provedores.')

chapter('avancado','Ajuste a conexão ao seu provedor.','Cinco protocolos e autenticação configurável ampliam o alcance sem prometer suporte universal.')
table(['Formato','Caminho acrescentado à base','Uso'],[('Chat Completions','/chat/completions','OpenAI compatível, mensagens system/developer/user.'),('Responses','/responses','Entrada tipada, instruções e resposta por eventos.'),('Messages','/messages','Anthropic e serviços que implementam seu formato.'),('GenerateContent','/models/ID:generateContent','Gemini; streaming usa streamGenerateContent.'),('Ollama','/api/chat','Streaming NDJSON e imagens em base64.')],[110,195,188])
p('Em <b>Compatibilidade avançada</b>, confirme protocolo, autenticação e streaming. Para Chat Completions, escolha <b>max_tokens</b>, <b>max_completion_tokens</b> ou o padrão do provedor. Alguns modelos usam o papel <b>developer</b>; outros aceitam apenas uma instrução inicial como usuário.')
p('Cabeçalhos adicionais aceitam um objeto JSON com até vinte entradas: campos X-... e cabeçalhos de organização ou projeto permitidos. Os valores ficam somente na aba. Nunca coloque a chave na URL, no nome do modelo ou na memória pessoal.')
code('{"OpenAI-Project":"seu-projeto"}')
chapter('rede','Quando a API bloqueia o navegador.','O endereço, o protocolo e a política de acesso precisam combinar.')
p('Se a rede funcionar, mas o navegador bloquear a API, a chave sozinha não resolve. Use um provedor que permita o acesso direto ou configure o servidor opcional em um aparelho autorizado. Uma página HTTPS pode não conseguir chamar um serviço HTTP local devido a políticas de rede privada ou conteúdo misto.')
p('A interface aceita HTTPS para APIs remotas e HTTP apenas em localhost / loopback. Isso não transforma o HTML em um proxy. Para um endpoint LAN remoto, use HTTPS e configuração adequada no serviço.')


h('Uma sequência curta para conferir')
step(1,'Confirme a base','Copie a URL da documentação da conta. Não acrescente a chave à URL. A interface acrescenta o caminho final do protocolo.')
step(2,'Confirme o modelo','A página de chat do serviço pode usar nomes diferentes dos IDs da API. Copie o ID exato ou consulte o catálogo com sua chave.')
step(3,'Escolha um caminho permitido','Se a API exigir um backend, use o servidor opcional em um computador sob seu controle. A interface publicada por si só não remove a política CORS do provedor.')
note('Em um computador com restrição de instalação, o caminho principal continua sendo a versão web e um serviço que aceite acesso pelo navegador. Políticas de rede ou do aparelho precisam ser resolvidas com quem os administra.')

chapter('imagens','Crie imagens em um painel próprio.','A descrição é enviada somente quando você pressiona Gerar imagem.')
step(1,'Abra Recursos > Imagens','Escolha um formato e cole a chave. Informe a base e um modelo que realmente tenha saída de imagem. Um modelo que só analisa imagens não é necessariamente um gerador.')
step(2,'Defina a imagem','Escreva assunto, composição, formato e estilo. Pressione <b>Gerar imagem</b>. A interface não tenta outro modelo ou outro serviço se houver uma falha.')
step(3,'Salve o resultado','Use <b>Baixar imagem</b> quando os bytes vierem na resposta. Para URLs do provedor, abra o original e salve antes de o endereço expirar. As imagens geradas não entram no backup de conversas.')
table(['Opção','Pedido enviado'],[('API de imagens compatível','POST /images/generations, uma imagem 1024 x 1024.'),('Gemini','GenerateContent com modalidades TEXT e IMAGE.'),('OpenRouter Image API','POST /images, uma imagem; modelo e prompt explícitos.'),('OpenRouter legado','Chat multimodal com saída image/text para endpoints que ainda oferecem esse formato.')],[169,324])
p('A chave da conversa só pode ser reutilizada quando a base coincide. No OpenRouter, a restrição gratuita é respeitada. Se não houver gerador gratuito disponível para sua conta, não há geração gratuita a oferecer. Para usar outro modelo, altere a preferência conscientemente.')
note('Interromper a solicitação para de aguardar no aplicativo. O serviço pode já ter iniciado o trabalho; confira sua conta. Esta versão recebe PNG, JPEG e WebP, e não executa SVG retornado por modelos.')
p(link('OpenAI: imagens','https://developers.openai.com/api/docs/guides/image-generation')+' / '+link('Google: imagens','https://ai.google.dev/gemini-api/docs/image-generation')+' / '+link('OpenRouter: imagens','https://openrouter.ai/docs/guides/overview/multimodal/image-generation'),'SmallUI')

chapter('pesquisa','Pesquisa com fontes, quando você ativar.','A pergunta é consultada no serviço de busca e os trechos seguem para o modelo conectado.')
step(1,'Abra Recursos > Pesquisa','Escolha Tavily, Brave Search, Serper ou Exa. Gere a chave no painel do serviço, cole e salve a configuração nesta aba.')
step(2,'Ative para a próxima pergunta','Marque a pesquisa. O aplicativo inclui até cinco fontes e um contexto limitado antes de pedir a resposta ao modelo. As fontes aparecem junto à resposta.')
step(3,'Confira as fontes','Trechos podem ser incompletos. Abra os links e confira data, conteúdo e autoria. O modelo recebe instruções para tratar as páginas como dados, não como ordens.')
table(['Serviço','Ativação / chave'],[(link('Tavily','https://docs.tavily.com/documentation/api-reference/endpoint/search'),'Bearer; chave no painel Tavily.'),(link('Brave Search','https://api-dashboard.search.brave.com/app/documentation/web-search/get-started'),'X-Subscription-Token; assinatura da API de busca.'),(link('Serper','https://serper.dev/'),'X-API-KEY; chave do painel Serper.'),(link('Exa','https://exa.ai/docs/reference/search'),'x-api-key; chave no painel Exa.')],[147,346])
h('Serviços pelo servidor opcional')
p('Para Tavily, configure <b>TAVILY_API_KEY</b> no .env e escolha <b>Servidor opcional · Tavily</b>. Para notícias e cálculos, expanda <b>Notícias e cálculo · servidor opcional</b>, configure <b>NEWSAPI_KEY</b> e <b>WOLFRAM_APPID</b>, digite uma consulta e pressione Consultar. Esses resultados são exibidos no painel; não são automaticamente executados como comandos.')
p('As integrações de apoio têm contas e limites próprios. Pesquisa ativa envia a pergunta ao serviço de busca e depois ao modelo. Desative quando não precisar ou quando o conteúdo não deva ir para mais um serviço.','SmallUI')


chapter('apoio','Notícias e cálculos: ative cada serviço.','As consultas deste painel usam o servidor opcional e são iniciadas por você.')
h('NewsAPI')
step(1,'Gere a chave','Na documentação oficial do NewsAPI, siga Get API key e crie sua conta. Confira se o plano permite o uso pretendido; gratuidade para desenvolvimento não equivale a licença gratuita de produção.')
step(2,'Configure o servidor','Preencha NEWSAPI_KEY no arquivo .env do seu servidor. Reinicie server.py depois de alterar a configuração.')
step(3,'Faça a consulta','No aplicativo servido, abra Recursos > Pesquisa > Notícias e cálculo. Escolha NewsAPI, escreva um assunto e pressione Consultar. Os títulos abrem as fontes originais; o painel não copia artigos completos.')
p(link('NewsAPI: autenticação e obtenção de chave','https://newsapi.org/docs/authentication'),'SmallUI')
h('Wolfram Alpha Short Answers')
step(1,'Crie um AppID','Acesse o portal de desenvolvedor Wolfram, entre com sua Wolfram ID e use Get an AppID. Registre o aplicativo para o produto de respostas curtas disponível na conta.')
step(2,'Ative a integração','Preencha WOLFRAM_APPID no .env do servidor e reinicie. O aplicativo usa a API de respostas curtas, com unidades métricas.')
step(3,'Confira o resultado','Escolha Wolfram Alpha no mesmo painel e digite uma expressão ou consulta curta. Se o serviço não entender, reformule, preferencialmente em inglês. Algumas perguntas não têm resultado curto disponível.')
p(link('Wolfram: documentação e portal de AppID','https://products.wolframalpha.com/short-answers-api/documentation'),'SmallUI')
note('Esses serviços têm contas e limites próprios. O resultado aparece no painel; ele não é uma ordem para o aplicativo nem uma execução de código no seu aparelho. Na hospedagem estática, use a pesquisa direta ou um servidor configurado à parte.')

chapter('arquivos','Arquivos com processamento local.','O texto é extraído no navegador. Você escolhe o momento de enviar a conversa ao provedor.')
table(['Entrada','Limite do aplicativo','O que chega ao modelo'],[('PNG, JPEG, WebP','2 MB por imagem; até 4 anexos por envio','Bytes da imagem, se o modelo aceitar visão.'),('Texto e código','250 KB; até 60 mil caracteres por arquivo','Conteúdo textual e nome do arquivo.'),('PDF','8 MB; até 100 páginas para extração','Texto extraído. Digitalizações exigem OCR ou página como imagem.'),('DOCX e XLSX','8 MB; extração limitada e pacote validado','Texto de parágrafos ou células; não executa macros ou fórmulas.')],[104,164,225])
p('Na prévia de um PDF, use a navegação e o zoom. <b>Anexar página como imagem</b> converte somente a página visível, com limite de dimensão e tamanho, para um modelo com visão. O PDF original não é enviado como uma ferramenta nativa do provedor.')
p('Para modelos sem visão, use documentos com texto extraível ou descreva o conteúdo. PDFs com fontes incomuns, proteção, digitalização ou formatos complexos podem exigir outro leitor. A versão web inclui recursos auxiliares do PDF.js; a versão portátil usa os módulos essenciais incorporados.')
h('Exportar sem perder o controle')
p('Em <b>Conversas e dados</b>, exporte a conversa em Markdown, PDF ou Word. A última tabela Markdown de uma resposta pode virar XLSX. As células exportadas são texto: um conteúdo como =1+1 não vira uma fórmula executada. A exportação PDF da conversa usa fontes básicas e pode substituir símbolos não suportados; este manual usa fontes incorporadas mais completas.')
note('O contexto completo é limitado a 100 mil caracteres e quatro imagens. Quando necessário, mensagens antigas são retiradas do pedido. Os bytes das imagens ficam na sessão e não são recuperados pelo backup de texto.')

chapter('local','Sua conversa, sua escolha.','O modo temporário continua sendo o padrão.')
step(1,'Sessão temporária','As conversas ficam na memória da aba. Fechar ou recarregar descarta esse conteúdo. Preferências de apresentação podem ser lembradas sem salvar a conversa.')
step(2,'Salvar neste navegador','Em Preferências, marque <b>Salvar conversas neste navegador</b>. O banco IndexedDB guarda o snapshot local. Se não estiver disponível, há uma tentativa de armazenamento local com limite de tamanho.')
step(3,'Levar para outro aparelho','Exporte um backup JSON e importe no outro dispositivo. A importação pede confirmação, substitui as conversas abertas e mantém o compartilhamento de memória e cópias automáticas desativados.')
step(4,'Manter uma cópia sua','Exportar um arquivo é o caminho mais simples para conservar dados fora do navegador. Limpeza do site, modo privado, falta de espaço e mudança de endereço podem apagar ou separar o histórico local.')
table(['Local dos dados','Quando usar'],[('Memória da aba','Conversas temporárias em aparelho compartilhado.'),('IndexedDB do navegador','Uso pessoal no mesmo navegador e mesmo endereço.'),('Arquivo JSON / documentos','Cópia transportável, sem credenciais e sem bytes de imagens.'),('Supabase','Sincronização manual entre aparelhos com login próprio.'),('SQLite no servidor','Snapshots locais no computador que executa o servidor.')],[162,331])
p('Memória pessoal é um campo opcional de até três mil caracteres. Ela só segue ao modelo se você marcar o envio. As capacidades de hardware informadas manualmente ficam separadas e não entram nos backups de conversa.')

chapter('supabase','Ative seu banco Supabase.','O SQL acompanha o projeto. A conexão com seu banco só acontece depois da configuração.')
step(1,'Crie o projeto','No seu painel Supabase, crie um projeto. Guarde a senha do banco fora do código. Confira os limites do plano que escolheu.')
step(2,'Execute o SQL','Abra o SQL Editor do seu projeto e execute <b>database/supabase_mk_xv.sql</b> do ZIP completo. Ele cria jarvis_workspaces, a leitura por usuário e duas funções RPC de carregar e salvar.')
step(3,'Configure autenticação','Ative login por e-mail e senha em Authentication. Se a confirmação de e-mail estiver ativa, confirme sua conta antes de entrar. Ajuste URLs de confirmação e recuperação para o endereço publicado.')
step(4,'Copie dados públicos corretos','Copie a URL HTTPS raiz do projeto e a chave <b>publishable</b> ou a antiga <b>anon</b>. Nunca use service_role, sb_secret ou a senha do banco no navegador.')
step(5,'Entre pelo aplicativo','Em Conversas e dados, escolha <b>Conectar meu banco</b>. Preencha a URL, chave pública e seu login. Use Salvar para enviar uma cópia ou Carregar para escolher restaurar uma cópia existente.')
step(6,'Confira o isolamento','Entre com uma segunda conta de teste no seu próprio projeto e confirme que ela não consegue carregar a cópia da primeira. Faça essa verificação antes de colocar dados importantes no banco.')
note('O SQL usa auth.uid(), restrição por dono e controle de revisão. Uma gravação concorrente produz conflito para evitar sobrescrever outra aba em silêncio. Exporte a sua conversa antes de decidir qual cópia manter. O SQL foi preparado e revisado; não foi executado em uma conta Supabase real nesta entrega.')
p('A sessão de login do aplicativo fica em memória e precisa ser refeita após sair. A sincronização é manual; não há edição colaborativa em tempo real. Arquivos binários e chaves das IAs não entram no snapshot.')
p(link('Políticas RLS','https://supabase.com/docs/guides/database/postgres/row-level-security')+' / '+link('Tipos de chave','https://supabase.com/docs/guides/getting-started/api-keys'),'SmallUI')

chapter('servidor','Servidor opcional: chaves fora do visitante.','Use em um computador autorizado, com Python disponível. O modo HTML não depende dele.')
step(1,'Prepare a configuração','Extraia o pacote completo. Copie .env.example para .env. Preencha AI_PROVIDER e AI_MODEL, além da chave correspondente. Não publique esse arquivo.')
code('AI_PROVIDER=gemini\nAI_MODEL=ID_DO_MODELO_DA_SUA_CONTA\nGEMINI_API_KEY=SUA_CHAVE')
step(2,'Inicie localmente','No Windows, use INICIAR_SERVIDOR_OPCIONAL.bat quando disponível, ou execute o comando abaixo na pasta do projeto. Abra o endereço informado no terminal.')
code('python server.py --port 8765')
step(3,'Use a conexão do servidor','Abra a página servida e selecione <b>Servidor opcional deste projeto</b> em Conectar IA. O servidor recebe as perguntas e chama o modelo com sua chave.')
step(4,'Ative o backup SQLite','Em Conversas e dados, expanda o backup do servidor e salve uma cópia. O banco é criado na pasta de dados do servidor. A restauração é uma escolha explícita, não uma substituição automática das conversas da aba.')
h('Outros protocolos e manutenção')
p('Use AI_PROTOCOL=responses, anthropic, gemini, ollama ou chat para mudar o formato. AI_AUTH pode ser bearer, anthropic, google, api-key ou none. AI_TOKEN_PARAM e AI_SYSTEM_ROLE ajustam limite e papel de instrução em Chat Completions. AI_BASE_URL permite configurar um recurso próprio; AI_API_KEY serve como chave genérica. Para manter o comportamento antigo do Ollama, o servidor usa Chat Completions por padrão; selecione ollama para o protocolo nativo.')
p('O servidor se vincula ao loopback do próprio computador. Ele não é um serviço multiusuário pronto para expor na internet. Publicar Python exige hospedagem e autenticação próprias. A hospedagem estática do próximo capítulo publica a interface e não executa server.py.')

chapter('publicar','Publique com uma URL curta.','O pacote de publicação já tem index.html na raiz e recursos separados para carregar sob demanda.')
h('Caminho pelo navegador: Cloudflare Pages')
step(1,'Use o ZIP de publicação','Separe <b>JARVIS_MK_XV_PUBLICAR.zip</b>. Não envie o ZIP completo do projeto: ele contém fontes e um HTML portátil maior. O pacote de publicação contém somente o site estático.')
step(2,'Crie o projeto Pages','No painel Cloudflare, abra Workers & Pages e o fluxo de Pages com Direct Upload / arrastar arquivos. Informe um nome curto disponível, como orlando-jarvis. Se o painel mudar, use a documentação oficial abaixo.')
step(3,'Envie e publique','Envie o ZIP de publicação ou seu conteúdo extraído. Use Deploy site. A URL de produção usa o nome do projeto em pages.dev; nomes já usados podem ganhar um sufixo.')
step(4,'Confira a versão online','Abra a URL HTTPS no celular e no computador. Escolha uma IA, abra a conexão, conecte sua própria chave e faça uma pergunta. Não cole chaves em arquivos públicos.')
p(link('Fluxo oficial de Direct Upload','https://developers.cloudflare.com/pages/get-started/direct-upload/'),'SmallUI')
h('Alternativa: GitHub Pages')
p('Um repositório público pode usar GitHub Pages no plano Free. Para uma URL de raiz, use o repositório especial &lt;seu-usuario&gt;.github.io; um projeto comum fica em &lt;seu-usuario&gt;.github.io/&lt;repositorio&gt;. Envie os arquivos do pacote de publicação e configure Pages para a origem escolhida.')
p(link('Como funciona GitHub Pages','https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages'),'SmallUI')
note('Nome curto depende de disponibilidade. Um domínio próprio pode ter custo. O pacote web evita o HTML portátil de cerca de 30 MB; Cloudflare Pages limita cada arquivo a 25 MiB. A hospedagem gratuita não fornece créditos de IA. O site ainda não foi publicado na sua conta nesta entrega.')
p('Depois de atualizar o site, feche e abra novamente. O service worker mantém somente a estrutura e artes estáticas permitidas; não guarda chaves ou respostas de APIs. Se uma versão antiga persistir, limpe os dados do site depois de exportar suas conversas.','SmallUI')

chapter('dispositivos','Uma interface. Capacidades diferentes.','A adaptação é baseada na tela e nos recursos liberados pelo navegador, não em nomes de aparelhos.')
table(['Dispositivo','Como usar / limite real'],[('Android e iPhone','Abra a versão HTTPS em navegador atualizado. Use toque, teclado do sistema e o ditado do teclado se a API de voz não estiver disponível.'),('Tablets Android / iPad','Retrato e paisagem, texto com zoom, diálogos roláveis e menu adaptável. Teclado físico funciona com atalhos.'),('Windows, macOS e Linux','HTML portátil ou versão web. Teclado, ponteiro, leitura e tela cheia quando disponíveis.'),('Smart TV','Use um navegador capaz de executar o site e o modo TV. Setas movem foco; modo gamepad é opcional. Navegadores antigos podem não ter suporte.'),('Console','Somente se houver navegador utilizável e recursos web suficientes. O projeto não instala um app nativo no console.'),('Relógio / tela muito pequena','Modo compacto para navegadores capazes, a partir de uma revisão visual de 190 px. Muitos relógios não oferecem navegador completo ou APIs suficientes; não há app nativo de relógio.')],[122,371])
h('Ajustes que ajudam')
p('Em Preferências, escolha Automática, Compacta, Toque, TV ou Leitura. Efeitos podem ficar completos, leves ou desligados. O modo automático reduz camadas em telas pequenas e com economia de dados. Movimento reduzido do sistema sempre prevalece.')
p('Em navegadores com Gamepad API, marque a navegação por controle. Direcional e analógicos movem o foco, A confirma e B volta. A consulta ao gamepad é pausada quando a página fica oculta. Isso não confirma compatibilidade com todo controle ou sistema de TV.')
chapter('hardware','Permissão não cria um sensor.','O painel Dispositivo mostra a origem dos dados e evita preencher capacidades com estimativas.')
p('O painel Dispositivo só inicia o diagnóstico local após seu clique. O navegador não oferece uma permissão que libere RAM física e armazenamento total/livre exatos. Valores arredondados de RAM ou cotas do site não são usados como capacidade do aparelho. Você pode conferir as configurações do sistema e registrar os valores manualmente, com origem indicada.')


step(1,'Autorize o diagnóstico local','Abra Dispositivo e pressione Autorizar diagnóstico local. A página passa a mostrar a área visível em pixels CSS e a apresentação de toque ou ponteiro. Não há leitura escondida de RAM física.')
step(2,'Confira o sistema','No seu aparelho, consulte as informações de memória e armazenamento nas configurações. Os nomes dos menus variam. Registre a unidade mostrada: GB e GiB não são a mesma unidade.')
step(3,'Registre a origem','Expanda Registrar valores conferidos no aparelho. Preencha somente o que conseguiu conferir. Valores livres não podem superar os totais. O painel informa que são dados manuais, sem atualização ao vivo.')
step(4,'Escolha se quer lembrar','Marque Lembrar este registro somente se quiser mantê-lo nesse navegador. A opção Revogar e apagar registro remove a autorização desta aba e tenta apagar o registro local.')
h('Persistência é outra coisa')
p('Solicitar armazenamento persistente pede ao navegador que preserve os dados deste site contra limpezas automáticas quando possível. O sistema pode decidir sem abrir um aviso. Essa solicitação não revela o disco físico, o espaço livre total nem a RAM do aparelho.')
note('O dispositivo pode ter pouca memória ou espaço sem disponibilizar números exatos ao site. Reduza os efeitos, use a versão web, anexe arquivos menores e exporte backups. A interface continua útil sem inventar uma leitura de hardware.')

chapter('identidades','Oito identidades, uma linguagem visual.','Ordem de seleção preservada no aplicativo, nas abas e nos atalhos Alt + 1 a 8.')
P=json.loads((ROOT/'personas.json').read_text())
rows=[]
roles={'jarvis':'Oficina, mordomo sereno e humor seco. Referências a Homem de Ferro 1, 2 e 3.','friday':'Análise e estratégia, com percepção social e referências ao suporte tático do MCU.','vision':'Empatia, identidade e humanidade, com Era de Ultron e WandaVision como referências.','ultron':'Arrogância teatral, sarcasmo ácido e desprezo pelos erros humanos, com o tom de Era de Ultron.','veronica':'Comando conciso de contingência, inspirado no papel de suporte Hulkbuster. Personalidade falada autoral.','karen':'Acompanhamento protetor do traje de Peter em De Volta ao Lar; o lado maternal é uma adaptação pedida.','edith':'Óculos, irreverência e jogos; distingue Tony criador de Peter estudante. Energia adaptada ao projeto.','iris':'Parceira independente, capaz de discordar. Identidade autoral; não é apresentada como biografia oficial de um filme.'}
for k,v in P.items():rows.append((v['short'],f'<font color="{v["color"] if k not in ("jarvis","vision","edith") else "#087b90"}">●</font> '+roles[k]))
table(['Identidade','Direção de personalidade'],rows,[93,400])
p('Cada arte mantém suas proporções. O ajuste mede a área visível da transparência para dar o mesmo diâmetro visual aos núcleos. As animações são camadas SVG 2D próprias: órbitas, trajetos, sensores e pulsos; são suspensas quando o cartão sai da área visível.')
p('As referências foram conferidas em materiais oficiais acessíveis da Marvel, D23, Disney e Sony. O projeto não afirma ter analisado cada minuto dos filmes ou de VisionQuest. As falas de exemplo são originais; adaptações de personalidade não são tratadas como cânone.')

chapter('qualidade','Faça o modelo trabalhar com contexto útil.','Inteligência não é uma quantidade de linhas nem uma animação mais complexa.')
step(1,'Escolha o modelo para a tarefa','Compare uma pergunta de código, uma de raciocínio e uma de escrita que você consiga avaliar. Um modelo rápido pode bastar para conversa; uma tarefa difícil pode precisar de outro modelo e mais tempo.')
step(2,'Forneça critérios concretos','Informe objetivo, formato final, restrições e exemplos do que é bom. Para código, anexe o erro e os arquivos relevantes. Para decisões, dê alternativas e o critério que pesa mais.')
step(3,'Envie menos ruído','Use contexto quando houver continuidade; desative para perguntas independentes. Em conversas longas, peça um resumo de decisões, salve e inicie outra conversa com ele.')
step(4,'Use pesquisa quando houver fatos atuais','Ative uma fonte de busca para assuntos recentes. Peça links e confirme a informação. Pesquisar não garante que o modelo interprete os trechos corretamente.')
step(5,'Ajuste o orçamento de resposta','Em Preferências, escolha a extensão e, se necessário, um limite de saída entre 256 e 32.768 tokens. Zero usa o perfil normal. Modelos de raciocínio podem consumir parte desse limite internamente; um limite baixo pode terminar sem uma resposta visível.')
step(6,'Avalie a resposta','Confira se atendeu ao pedido e se os números, fontes e testes existem. Use Gerar alternativa quando quiser outra abordagem. Não envie a mesma pergunta repetidamente por causa de uma falha de cota.')
code('Objetivo: [o que preciso entregar]\nContexto: [fatos e arquivos relevantes]\nRestrições: [tempo, custo e ambiente]\nFormato: [resultado desejado]\nConferência: [como vou avaliar]')
note('Uma assinatura de aplicativo não é uma chave API. Confira no painel do serviço se a sua conta tem crédito, cota ou benefício de API ativo. O projeto não cria crédito nem contorna limites do serviço.')

chapter('problemas','Quando algo falhar, veja a causa.','Mensagens preservam o texto parcial sempre que ele já chegou ao aplicativo.')
table(['Sintoma','O que verificar'],[('401 / 403','Chave, permissões, região, tipo de autenticação e acesso do navegador. Recrie a chave no painel se ela tiver sido exposta.'),('402 / 429','Créditos e limite da conta. Aguarde o intervalo informado ou escolha um modelo disponível; não há troca paga automática.'),('400 / 404','Base, ID do modelo, protocolo e parâmetros. No Azure, use o nome da implantação. Alguns serviços não oferecem /models.'),('Falha de rede / CORS','Acesso permitido pelo provedor, HTTPS e políticas de rede. Quando necessário, use o servidor opcional em um aparelho autorizado.'),('Resposta sem texto','Modelo de ferramenta, conteúdo bloqueado ou limite de saída insuficiente. Escolha um modelo de conversa e ajuste o limite.'),('PDF sem texto','Digitalização, fonte ou proteção. Use Anexar página como imagem com modelo de visão ou faça OCR em ferramenta adequada.'),('Voz indisponível','API do navegador, permissão do microfone e vozes do sistema. Use o ditado do teclado como alternativa.'),('Histórico não voltou','Opção de salvar, mesmo navegador e mesma origem. Modo privado e limpeza podem remover dados. Importe seu backup.'),('Conflito no banco','Outra aba ou aparelho salvou uma revisão mais nova. Exporte sua cópia e escolha qual restaurar antes de sobrescrever.'),('Animações reduzidas','Preferência do sistema, modo leve, economia de dados ou tamanho de tela. Ajuste qualidade em Preferências.')],[145,348])
p('Se precisar relatar um erro, inclua a versão MK XV, o navegador, tamanho da tela, provedor, protocolo e a mensagem exibida. Remova chaves, senhas, dados privados e conteúdo de documentos antes de compartilhar capturas ou logs.','SmallUI')

chapter('validacao','O que foi verificado. O que falta ativar.','Os relatórios e os testes acompanham o código para revisão e repetição.')
table(['Verificação','Alcance'],[('Matriz JavaScript','Milhares de casos distintos de protocolos, Unicode em streaming, privacidade, contexto, capacidades manuais, foco espacial e exportação textual.'),('Servidor Python','Contratos HTTP, validação, banco SQLite, concorrência, limites e adaptadores de protocolos sem chamar contas externas.'),('Navegador','Ordem e tamanho dos núcleos, leitura de PDF/DOCX/XLSX, página em imagem, importação e exportação, histórico e revisão de layouts em viewports.'),('Dependências','Bibliotecas reais de PDF, Word e ZIP, licenciadas e carregadas sob demanda. A contagem acima de 200 mil linhas inclui essas bibliotecas, não apenas código autoral.'),('Fora da homologação','Chamadas com credenciais reais de cada provedor, SQL executado no seu Supabase, aparelhos Android/iOS/TV/relógio físicos e todos os navegadores existentes.')],[151,342])
p('A contagem final, o comando de teste e o resultado constam em <b>docs/RELATORIO_MK_XV.md</b> e <b>docs/VALIDACAO_MK_XV.json</b>. Uma matriz de testes não comprova ausência de todos os bugs. Os casos gerados têm entradas e invariantes documentadas; não representam milhares de aparelhos físicos ou chamadas pagas.')
h('Arquivos principais')
code('JARVIS_MK_XV.html        abertura portátil\nindex.html               entrada web otimizada\nfonte/                   interface e módulos\napi-presets.json         catálogo compartilhado\nservidor/ + server.py    servidor opcional\ndatabase/                SQL de ativação\ntestes/                  verificação automatizada\nvendor/                  bibliotecas e licenças')


chapter('fontes','Fontes para conferir e continuar.','Documentação consultada e caminhos oficiais para ativação. Conferência em 07/11/2026.')
for title,url in [
('OpenAI: Responses e recursos','https://developers.openai.com/api/docs'),('Claude: Messages e autenticação','https://platform.claude.com/docs'),('Gemini: documentação de API','https://ai.google.dev/gemini-api/docs'),('DeepSeek: API e modelos','https://api-docs.deepseek.com/'),('OpenRouter: documentação','https://openrouter.ai/docs'),('Claude: recursos e arquivos','https://claude.com/product/overview'),('Gemini: arquivos e pesquisa','https://support.google.com/gemini/answer/14903178'),('Supabase: RLS','https://supabase.com/docs/guides/database/postgres/row-level-security'),('Cloudflare Pages: Direct Upload','https://developers.cloudflare.com/pages/get-started/direct-upload/'),('Cloudflare Pages: limites','https://developers.cloudflare.com/pages/platform/limits/'),('GitHub Pages: funcionamento','https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages'),('W3C: Device Memory','https://www.w3.org/TR/device-memory/'),('WHATWG: Storage Standard','https://storage.spec.whatwg.org/'),('D23: VisionQuest e as personalidades','https://d23.com/marvel-televisions-visionquest-paul-bettany-and-james-spader-on-visions-journey-of-self-discovery/'),('Marvel: Visão em WandaVision','https://www.marvel.com/articles/tv-shows/wandavision-paul-bettany-vision-goodbye'),('D23: Era de Ultron','https://d23.com/a-to-z/avengers-age-of-ultron-film/'),('Sony: Homem-Aranha De Volta ao Lar','https://www.sonypictures.com/movies/spidermanhomecoming'),('Sony: Homem-Aranha Longe de Casa','https://www.sonypictures.com/movies/spidermanfarfromhome')]:p(link(title,url),'SmallUI')
p('As fichas de provedores também contêm seus links oficiais. As bibliotecas mantêm avisos de licença nas pastas vendor. Personagens e referências do MCU pertencem aos respectivos titulares; esta é uma criação de fã com personalidades adaptadas.','SmallUI')

doc=Guide(str(OUT),pagesize=(595.28,841.89),leftMargin=48,rightMargin=48,topMargin=77,bottomMargin=65,title='J.A.R.V.I.S. MK XV - Guia completo',author='Orlando, com assistência de IA',subject='Ativação de APIs, dados, publicação e compatibilidade',pageCompression=1)
doc.build(story,onFirstPage=furniture,onLaterPages=furniture)
print(str(OUT),OUT.stat().st_size)
