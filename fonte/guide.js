/* Guias locais do aplicativo: sem envio de perguntas ou chaves a serviços externos. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FusionGuide=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const GREETING='olá somos dum-e e u, seremos o seus guias hoje';
  const TOPICS={
    connect:{title:'Conectar a IA',text:'Abra Conectar IA, escolha OpenRouter e use uma chave da sua própria conta. Mantenha openrouter/free e a restrição a modelos gratuitos. Clique em Conectar nesta aba. A primeira resposta confirma o acesso.\n\nHá 27 configurações e cinco protocolos, incluindo Gemini, Claude, OpenAI e DeepSeek. Escolha a conta, copie a base e o ID do modelo. A cobrança, o catálogo e CORS dependem do serviço. A chave fica somente nesta aba.',target:'connection-modal',action:'ABRIR CONEXÃO'},
    personas:{title:'Trocar sistema',text:'Abra Sistemas e escolha ATIVAR no cartão de JARVIS, Friday, VISÃO, ULTRON, VERÔNICA, KAREN, EDITH ou IRIS. Os oito usam o modelo que você conectar, cada um com seu jeito de conversar.\n\nJARVIS é o mordomo; Friday é a estrategista; EDITH gosta de jogos e criação; Ultron tem uma postura independente, arrogante e provocadora. Verônica prepara contingências; Karen é protetora; Iris é uma parceira com critério; Visão une razão e sensibilidade como perfil extra. A identidade muda a próxima resposta e preserva os fatos da conversa.',target:'personas-modal',action:'ABRIR SELEÇÃO'},
    veronica:{title:'Veronica',text:'Verônica agora está disponível na seleção de Sistemas. Ela usa marrom alaranjado envelhecido e uma personalidade firme de contingência e emergência. É uma interpretação para conversa e planejamento; não controla satélites, armaduras ou equipamentos.',target:'personas-modal',action:'VER SISTEMAS'},
    backup:{title:'Guardar conversas',text:'Antes de fechar a aba, abra Conversas e dados e clique em EXPORTAR BACKUP. Na próxima sessão, use IMPORTAR BACKUP e reconecte sua chave.\n\nO backup leva conversas, preferências e texto dos anexos. Chaves e bytes das imagens ficam fora dele; guarde as imagens originais para reanexar. A sessão é temporária por padrão.',target:'data-modal',action:'ABRIR CONVERSAS E DADOS'},
    privacy:{title:'Privacidade',text:'Por padrão, as conversas ficam só na memória desta aba. A chave da API também fica apenas nesta sessão e não entra no backup.\n\nEm Preferências, você escolhe se quer salvar histórico no navegador e enviar memória pessoal ao modelo. Para apagar o histórico salvo no navegador, abra Conversas e dados. Cópias exportadas e cópias no servidor são independentes.',target:'settings-modal',action:'VER PREFERÊNCIAS'},
    voice:{title:'Voz e microfone',text:'Clique no microfone do campo principal, fale e revise a transcrição antes de enviar. O navegador precisa oferecer reconhecimento de voz e ter permissão para usar o microfone.\n\nPara ouvir respostas, ative Ler respostas em voz alta em Preferências ou use o botão de voz do campo principal. As vozes vêm do navegador ou sistema.',target:'settings-modal',action:'ABRIR PREFERÊNCIAS'},
    attachments:{title:'Anexos',text:'Use o clipe no campo principal. Você pode enviar até quatro arquivos por mensagem: imagens PNG/JPEG/WebP de até 2 MB ou arquivos de texto e código de até 250 KB e 60 mil caracteres cada.\n\nO modelo precisa aceitar visão para analisar imagens. PDF, DOCX e XLSX de até 8 MB têm o texto extraído localmente. Um PDF digitalizado pode exigir OCR ou uma página como imagem. ZIP genérico, áudio e vídeo não são anexos aceitos. O botão Interromper leitura cancela uma leitura em andamento. O contexto envia até quatro imagens por pedido.'},
    errors:{title:'Conexão e erros',text:'401: confira a chave e o provedor. 402: confira créditos e o modelo escolhido. 404: confira o modelo e a URL. 429: aguarde ou verifique a cota da conta.\n\nPara falha de rede ou CORS, confira conexão, acesso da rede e permissões da API. A interface mostra o erro e preserva o texto já recebido. Você pode interromper uma resposta com PARAR.',target:'connection-modal',action:'REVISAR CONEXÃO'},
    effects:{title:'Animações',text:'Na seleção, EDITH tem varreduras ópticas e Ultron tem correntes e pulsos neurais. Verônica tem varredura de contingência; Karen e Iris têm órbitas de sensores; Visão tem um pulso dourado. Essas quatro também se animam no núcleo principal.\n\nEm Preferências, escolha efeitos completos, leves ou desligados. O modo automático reduz camadas em telas pequenas e respeita o movimento reduzido do sistema. A interface continua em 2D, com as proporções das artes preservadas.',target:'settings-modal',action:'AJUSTAR ANIMAÇÕES'},
    install:{title:'Abrir o aplicativo',text:'Para usar o aplicativo principal, abra JARVIS_MK_XV.html no navegador. Não precisa instalar Python, Node ou um modelo grande. A geração de respostas precisa de internet e de um provedor conectado.\n\nO servidor Python é uma opção avançada separada. Nós, os guias do aplicativo, funcionamos sem conectar uma IA.',target:'help-modal',action:'VER PRIMEIROS PASSOS'},
    shortcuts:{title:'Atalhos',text:'No computador, Enter envia a mensagem; Shift+Enter faz uma nova linha. No toque, use a seta de envio e Enter para nova linha. Ctrl+K abre a conexão. Alt+N começa uma conversa e Alt+1 a Alt+8 trocam o sistema.\n\nPARAR interrompe a geração. Esc também interrompe quando não há uma janela aberta; dentro de uma janela, use Esc ou o botão de fechar.'},
    copy:{title:'Copiar e alternativas',text:'Use COPIAR abaixo de uma resposta ou no cabeçalho de um bloco de código. Se a área de transferência não estiver liberada, selecione o texto ou exporte a conversa em Markdown.\n\nGERAR ALTERNATIVA cria outra conversa com o contexto até a pergunta e preserva a resposta original. REUTILIZAR PERGUNTA coloca o texto de volta no campo principal.'},
    images:{title:'Criar imagens',text:'Abra Recursos > Imagens. Escolha o formato, a base, um modelo que gere imagens e a chave da sua conta. Descreva o resultado e pressione Gerar imagem. A configuração é separada do modelo de conversa.\n\nA geração depende da cota da conta. No OpenRouter, a restrição gratuita continua sendo respeitada. Baixe a imagem antes de fechar a aba.',target:'studio-modal',action:'ABRIR RECURSOS'},
    search:{title:'Pesquisar com fontes',text:'Em Recursos > Pesquisa, configure Tavily, Brave Search, Serper ou Exa e ative a pesquisa para a próxima pergunta. Até cinco fontes são enviadas ao modelo conectado. A pergunta será compartilhada com o serviço de pesquisa escolhido.\n\nO servidor opcional pode usar Tavily sem uma chave de busca no navegador. Notícias e cálculo também estão no painel, quando as chaves do servidor forem configuradas.',target:'studio-modal',action:'ABRIR RECURSOS'},
    cloud:{title:'Banco de dados',text:'O modo temporário é o padrão. Para guardar no aparelho, ative Salvar conversas neste navegador em Preferências. Você também pode exportar um backup JSON.\n\nPara usar sua nuvem Supabase, execute database/supabase_mk_xv.sql no seu projeto. Depois abra Conversas e dados > Conectar meu banco, com a URL raiz, a chave publishable/anon e seu login. Nunca use service_role ou sb_secret no navegador. O PDF explica a ativação completa.',target:'data-modal',action:'ABRIR DADOS'},
    device:{title:'Dados do aparelho',text:'Abra Dispositivo e autorize o diagnóstico local. A página mostra a área visível e a apresentação do navegador. RAM física e espaço total/livre exatos não são liberados por uma permissão web.\n\nVocê pode conferir as configurações do sistema e registrar valores manualmente, com origem indicada. Solicitar armazenamento persistente protege dados do site quando permitido; não revela o disco físico.',target:'device-modal',action:'ABRIR DISPOSITIVO'},
    compatibility:{title:'Telas e controles',text:'Em Preferências, escolha Automática, Compacta, Toque, Leitura ou TV. Navegadores com Gamepad API podem usar direcional, A e B. No modo TV, as setas do teclado movem o foco.\n\nTVs, consoles e relógios precisam oferecer um navegador capaz. Não há aplicativo nativo para esses aparelhos. Use a versão HTTPS no celular e tablet.',target:'settings-modal',action:'ABRIR PREFERÊNCIAS'},
    about:{title:'DUM-E e U',text:'Somos os guias do J.A.R.V.I.S. MK XV. Podemos mostrar como conectar um modelo, escolher uma personalidade, guardar conversas e usar os controles.\n\nEsta ajuda funciona localmente, sem chave e sem consumir sua cota. Para conversar, criar ou programar com uma IA generativa, use o campo principal do aplicativo.'}
  };
  const routes=[
    ['veronica',/veronica/],
    ['errors',/\b(401|402|403|404|413|429|500|502|503|cors)\b|erro|falha|travou|cota|quota|nao (responde|funciona|conecta)/],
    ['privacy',/privacidade|chave.*salv|dados pessoais|apagar|limpar|nao.*(salvar|guardar)|sessao temporaria|compartilhar/],
    ['images',/(gerar|criar|criacao|desenhar).*imagem|geracao de imagem/],
    ['search',/pesquis|buscar|fontes|noticias|wolfram|tavily|serper|brave|\bexa\b/],
    ['cloud',/supabase|banco de dados|database|nuvem|sqlite/],
    ['device',/dispositivo|armazenamento|memoria ram|hardware|capacidade/],
    ['compatibility',/compatib|android|iphone|ios|tablet|controle|gamepad|relogio|televis|smart.?tv/],
    ['voice',/voz|microfone|ditar|ouvir|audio|transcri|reconhec.*fala|falar em voz/],
    ['attachments',/anex|imagem|arquivo|\bfotos?\b|\b(pdf|docx|zip)\b/],
    ['effects',/anima|efeito|movimento|\b3d\b/],
    ['install',/instal|python|servidor|abrir.*aplicativo|abrir.*html/],
    ['connect',/conect|\bapi\b|chave|modelo|gemini|openrouter|token|comecar|iniciar/],
    ['personas',/trocar|selecion|sistema|personalidade|jarvis|friday|edith|ultron|karen|iris|visao/],
    ['backup',/backup|salvar|guardar|historico|export|import|restaurar|conversa/],
    ['shortcuts',/atalho|teclado|\benter\b|\bctrl\b|\balt\b/],
    ['copy',/copiar|codigo|alternativa|reutilizar/],
    ['about',/dum|guia|quem.*voc|ajuda|obrigad|^oi\b|^ola\b/]
  ];
  function answer(question,topic){
    const normalized=String(question||'').slice(0,500).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const id=Object.hasOwn(TOPICS,topic)?topic:routes.find(([,pattern])=>pattern.test(normalized))?.[0];
    return id?{id,...TOPICS[id]}:{id:'unknown',title:'Ajuda do aplicativo',text:'Nós ajudamos com o funcionamento do J.A.R.V.I.S. MK XV. Você quer conectar a IA, trocar de sistema, guardar conversas ou usar voz e anexos?\n\nPara outros assuntos, use o campo de conversa principal. Ele envia seu pedido ao modelo generativo que você conectar.'};
  }
  function init({art,openPanel,voiceEnabled=()=>false,notify=()=>{}}){
    const $=id=>document.getElementById(id),panel=$('guide-modal'),launcher=$('guide-launcher'),log=$('guide-messages'),form=$('guide-form'),input=$('guide-input');
    const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    for(const image of document.querySelectorAll('[data-guide-art]'))image.src=art;
    $('guide-greeting').textContent=GREETING;
    let turn=0,spoken=null;
    function append(role,text,reply){
      const row=make('article','guide-message '+role),name=make('span','guide-message-name',role==='user'?'VOCÊ':turn++%2?'U':'DUM-E'),body=make('p','',text);row.append(name,body);
      if(reply?.target){const button=make('button','guide-action',reply.action);button.type='button';button.addEventListener('click',()=>openPanel(reply.target));row.append(button);}
      log.append(row);while(log.children.length>22)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;
    }
    function speakGreeting(){
      if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){notify('A leitura em voz alta não está disponível neste navegador.');return;}
      if(spoken)return;const u=new SpeechSynthesisUtterance(GREETING);spoken=u;u.lang='pt-BR';u.rate=.96;u.pitch=.8;u.onend=u.onerror=()=>{if(spoken===u)spoken=null;};window.speechSynthesis.speak(u);
    }
    function open(){panel.show();launcher.setAttribute('aria-expanded','true');const touch=window.matchMedia('(max-width:980px), (pointer:coarse)').matches;(touch?panel.querySelector('[data-close]'):input).focus({preventScroll:true});if(voiceEnabled())speakGreeting();}
    launcher.addEventListener('click',()=>panel.open?panel.close():open());
    panel.addEventListener('close',()=>{launcher.setAttribute('aria-expanded','false');if(!document.querySelector('dialog[open]'))launcher.focus({preventScroll:true});});
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();panel.close();}});
    $('guide-listen').addEventListener('click',speakGreeting);
    form.addEventListener('submit',event=>{event.preventDefault();const text=input.value.trim().slice(0,500);if(!text)return;input.value='';append('user',text);const reply=answer(text);append('assistant',reply.text,reply);input.focus({preventScroll:true});});
    for(const button of panel.querySelectorAll('[data-guide-topic]'))button.addEventListener('click',()=>{const reply=answer('',button.dataset.guideTopic);append('user',reply.title);append('assistant',reply.text,reply);});
    append('assistant','Escolha um assunto ou escreva sua dúvida sobre o J.A.R.V.I.S. MK XV. Vamos ajudar com os controles.');
  }
  return {GREETING,TOPICS,answer,init};
});
