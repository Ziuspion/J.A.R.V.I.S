/* J.A.R.V.I.S. MK XV. A conversa é atendida por modelos reais; o guia de controles funciona localmente. */
(()=>{
  'use strict';
  const C=FusionCore,P=FusionPlatform,$=id=>document.getElementById(id),all=q=>[...document.querySelectorAll(q)];
  const config=JSON.parse($('fusion-data').textContent),personas=config.personas,visuals=config.visuals;
  const STORE='fusion-personal-v4',el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
  const icon=name=>{const n=document.createElementNS('http://www.w3.org/2000/svg','svg'),u=document.createElementNS('http://www.w3.org/2000/svg','use');u.setAttribute('href','#i-'+name);n.append(u);n.setAttribute('aria-hidden','true');return n;};
  let state;try{state=C.cleanState(JSON.parse(localStorage.getItem(STORE)||'null'));}catch{state=C.cleanState(null);}
  let localDB;try{localDB=JarvisStorage.create(window.indexedDB);}catch{localDB=JarvisStorage.create(null);}
  let diskWrites=Promise.resolve(),diskEnabled=state.settings.keepHistory,cloud=null,cloudRevision=0;
  let connection=null,backend=null,serverRevision=0,serverSaveTimer=null,serverSaving=false,serverDirty=false;
  let busy=false,controller=null,testing=false,testController=null,recognition=null,listening=false,speaking=false,pending=[],voices=[],storageWarned=false;
  const images=new Map(),current=()=>state.threads.find(t=>t.id===state.active)||null,persona=()=>personas[state.settings.persona];
  let documents=null,studio=null,compat=null;
  let streamRow=null,renderFrame=null,progressText='',scrollRequested=true;
  let fileController=null;
  let filesLoading=false,attachmentRevision=0,modelListRevision=0,modelListController=null;
  const fileReaders=new Set(),drafts=new Map();
  function toast(text,error=false){const n=el('div','toast'+(error?' error':''),text);$('toasts').append(n);if($('toasts').children.length>3)$('toasts').firstElementChild.remove();setTimeout(()=>n.remove(),5200);}
  function snapshot(){return C.cleanState(state);}
  function save(){
    const safe=snapshot(),local={version:4,settings:safe.settings,memory:'',active:null,threads:[]};
    try{localStorage.setItem(STORE,JSON.stringify(local));}catch{if(!storageWarned){storageWarned=true;toast('O navegador não conseguiu salvar preferências. Exporte um backup para conservar seus dados.',true);}}
    if(state.settings.keepHistory||diskEnabled){const persist=state.settings.keepHistory;diskWrites=diskWrites.catch(()=>{}).then(()=>persist?localDB.save(safe):localDB.clear()).catch(()=>{if(persist&&state.settings.keepHistory){try{localStorage.setItem(STORE,JSON.stringify(safe));return;}catch{}}if(!storageWarned){storageWarned=true;toast('O banco local não conseguiu concluir a gravação. A conversa continua nesta aba. Exporte um backup.',true);}});}
    diskEnabled=state.settings.keepHistory;
    if(state.settings.autoBackup&&backend){clearTimeout(serverSaveTimer);serverSaveTimer=setTimeout(()=>saveServer(false),1200);}
  }
  const drawerMedia=window.matchMedia('(max-width:980px)');
  const touchLayout=()=>window.matchMedia('(pointer:coarse) and (max-width:980px)').matches;
  function setDrawer(open){
    const side=$('sidebar'),menu=$('menu-button'),narrow=drawerMedia.matches,visible=narrow&&!!open;
    const restore=side.contains(document.activeElement);side.classList.toggle('open',visible);$('drawer-shade').hidden=!visible;
    menu.setAttribute('aria-expanded',String(visible));side.inert=narrow&&!visible;
    if(narrow&&!visible)side.setAttribute('aria-hidden','true');else side.removeAttribute('aria-hidden');
    document.querySelector('.workspace').inert=visible;document.querySelector('.app-credit').inert=visible;$('guide-launcher').inert=visible;
    if(visible)$('drawer-close').focus({preventScroll:true});else if(restore&&narrow)menu.focus({preventScroll:true});
  }
  function closeDrawer(){setDrawer(false);}
  function openModal(id){closeDrawer();if(id==='settings-modal')renderSettings();if(id==='connection-modal')renderConnectionForm();for(const d of all('dialog[open]'))d.close();const d=$(id);if(d&&!d.open)d.showModal();}
  function ask(message,title='Confirmar alteração'){
    const dialog=$('confirm-modal');if(dialog.open)return Promise.resolve(false);
    $('confirm-title').textContent=title;$('confirm-message').textContent=message;dialog.returnValue='';
    return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true});dialog.showModal();});
  }
  function cancelFileRead(){
    attachmentRevision++;fileController?.abort();fileController=null;for(const reader of fileReaders)try{reader.abort();}catch{}fileReaders.clear();filesLoading=false;
  }
  function rememberDraft(){const key=state.active||'new';if($('chat-input').value||pending.length){drafts.delete(key);drafts.set(key,{text:$('chat-input').value,attachments:pending.map(a=>({...a}))});trimDraftFiles();}else drafts.delete(key);}
  function trimDraftFiles(){let total=0;for(const draft of drafts.values())for(const a of draft.attachments)total+=(a.data?.length||0)+(a.localFile?.size||0);let removed=false;for(const draft of drafts.values()){for(const a of draft.attachments){if(total<=24*1024*1024)break;if(a.data||a.localFile){total-=(a.data?.length||0)+(a.localFile?.size||0);delete a.data;delete a.localFile;a.omitted='draft_memory_limit';removed=true;}}if(total<=24*1024*1024)break;}if(removed)toast('Prévias e imagens dos rascunhos mais antigos saíram da memória. Os textos foram preservados; reanexe os arquivos quando necessário.');}
  function restoreDraft(){stopVoice();cancelFileRead();const draft=drafts.get(state.active||'new');pending=(draft?.attachments||[]).map(a=>({...a}));$('chat-input').value=draft?.text||'';if(pending.some(a=>a.omitted==='draft_memory_limit'))toast('Reanexe os arquivos deste rascunho para recuperar imagens ou prévias. O texto continua disponível.');resizeInput();renderAttachments();renderConnection();}
  function pruneImages(){const ids=new Set(state.threads.flatMap(t=>t.messages.flatMap(m=>(m.attachments||[]).map(a=>a.id))));for(const key of images.keys())if(!ids.has(key))images.delete(key);}
  function status(mode){document.body.dataset.state=mode;const labels=persona().states||{idle:'EM ESPERA',thinking:'PROCESSANDO',speaking:'RESPONDENDO',listening:'OUVINDO'};$('dock-state').textContent=labels[mode]||labels.idle;}
  function applyPersona(id,saveIt=true){
    if(!personas[id])return;if(busy&&saveIt){toast('Aguarde a resposta ou clique em Parar antes de trocar a identidade.');return;}
    state.settings.persona=id;const p=persona();document.body.dataset.persona=id;document.documentElement.style.setProperty('--accent',p.color);document.documentElement.style.setProperty('--rgb',p.rgb);document.documentElement.style.setProperty('--secondary',p.secondary);
    document.querySelector('meta[name="theme-color"]').setAttribute('content',getComputedStyle(document.body).getPropertyValue('--bg').trim());
    document.title=id==='jarvis'?'J.A.R.V.I.S. MK XV':p.name+' · J.A.R.V.I.S. MK XV';$('header-name').textContent=p.name;$('header-symbol').textContent=p.symbol;
    $('main-core').innerHTML=visuals[id];$('dock-art').innerHTML=visuals[id];$('main-core').setAttribute('aria-label','Núcleo visual de '+p.short);
    $('interface-name').textContent=p.interface.name;$('sidebar-context-name').textContent=p.interface.name;$('interface-caption').textContent=p.interface.caption;all('[data-current-system]').forEach(n=>n.textContent=p.name);
    $('welcome-system').textContent=String(Object.keys(personas).indexOf(id)+1).padStart(2,'0')+' / '+p.short.toUpperCase();$('welcome-caption').textContent=p.caption;
    const personalText=text=>String(text||'').replaceAll('{name}',state.settings.name);
    $('welcome-title').textContent=personalText(p.greeting);$('dock-description').textContent=p.description;
    $('welcome-description').textContent=p.intro;$('welcome-role').textContent=p.role;
    $('chat-input').placeholder=personalText(p.placeholder);renderHUDIdentity(p);compat?.apply();status(document.body.dataset.state||'idle');
    all('[data-persona-select]').forEach(b=>{const selected=b.dataset.personaSelect===id;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
    all('.persona-card').forEach(n=>n.classList.toggle('selected',n.dataset.persona===id));
    const t=current();if(t&&saveIt)t.persona=id;if(saveIt){save();renderThreadList();beep();}renderConnection();
  }
  function renderHUDIdentity(p){
    const v=p.visual;$('hud-identity').textContent=p.name;$('hud-signature').textContent=v.title;$('hud-code').textContent=v.code;$('hud-protocol').textContent=v.protocol;
    $('hud-keywords').replaceChildren(...v.keywords.map(word=>el('span','',word)));
    const patterns={engineering:'<path d="M1 31h24l9-12h28l12 24h26l12-18h44m-141 5v-9h19m-9 19h26m51-21h21v25h20"/><circle cx="76" cy="31" r="15"/><circle cx="76" cy="31" r="4"/>',tactical:'<path d="M1 44h24V26h24v12h25V14h26v18h24V9h31m-154 45h155"/><path d="m19 14 7-7 7 7m59 36 7-7 7 7"/>',optical:'<path d="M1 13h17v36H1m155-36h-17v36h17M25 31h30m47 0h29"/><circle cx="78" cy="31" r="24"/><circle cx="78" cy="31" r="13"/><path d="M78 3v12m0 32v12M50 31h14m28 0h14"/>',neural:'<path d="m1 33 18-9 14 19 18-31 17 36 16-21 18 10 17-28 17 37 20-15m-137-7 32-12 33 15 35-18m-86 34 35 5 34-11 34 9"/><g fill="currentColor"><circle cx="19" cy="24" r="2"/><circle cx="51" cy="12" r="2"/><circle cx="68" cy="48" r="2"/><circle cx="102" cy="37" r="2"/><circle cx="136" cy="46" r="2"/></g>'};
    Object.assign(patterns,{
      contingency:'<path d="M2 45h24V17h23v28h20V8h21v37h20V17h22v28h22M68 22h21M68 31h21"/><path d="m13 7 6 6-6 6m128 24-6 6 6 6"/>',
      guardian:'<path d="M52 7 23 19v16c0 13 17 20 29 24 12-4 29-11 29-24V19L52 7Zm-17 25 12 10 23-23M98 31h12l6-9 9 20 8-11h21"/>',
      partner:'<circle cx="48" cy="31" r="20"/><circle cx="108" cy="31" r="20"/><path d="M1 31h27m40 0h20m40 0h27m-94-9 9 9-9 9m36-18-9 9 9 9"/>',
      synthesis:'<path d="m78 7 24 24-24 24-24-24L78 7Zm0 12 12 12-12 12-12-12 12-12M1 31h53m48 0h53M18 20h20m80 22h20"/>'
    });
    $('hud-mark').innerHTML='<svg viewBox="0 0 156 62" preserveAspectRatio="xMidYMid meet">'+(patterns[v.line]||patterns.engineering)+'</svg>';
  }
  function buildPersonaUI(){
    for(const [id,p]of Object.entries(personas)){
      const b=el('button','',p.short);b.type='button';b.dataset.personaSelect=id;b.style.setProperty('--pcolor',p.color);b.prepend(el('span','persona-tab-index',String(Object.keys(personas).indexOf(id)+1).padStart(2,'0')));b.prepend(el('span','persona-dot'));b.addEventListener('click',()=>applyPersona(id));$('quick-personas').append(b);
      const card=el('article','persona-card');card.dataset.persona=id;card.style.setProperty('--p-color',p.color);card.style.setProperty('--p-rgb',p.rgb);card.style.setProperty('--secondary',p.secondary);
      const kicker=el('div','persona-card-kicker');kicker.append(el('span','',String(Object.keys(personas).indexOf(id)+1).padStart(2,'0')),el('span','',p.extra?'EXTRA · '+p.role:p.role));
      const art=el('div','persona-preview');art.innerHTML=visuals[id];const previewImage=art.querySelector('image');if(previewImage){previewImage.dataset.lazyHref=previewImage.getAttribute('href');previewImage.removeAttribute('href');}art.setAttribute('role','img');art.setAttribute('aria-label',p.short+' — prévia visual');
      if(id==='jarvis'||id==='friday')art.querySelectorAll('.core-word,.core-subtitle').forEach(label=>label.remove());
      const choose=el('button','', 'ATIVAR '+p.short.toUpperCase());choose.type='button';choose.append(icon('arrow'));choose.addEventListener('click',()=>{if(busy){toast('Interrompa ou aguarde a resposta para trocar de identidade.');return;}applyPersona(id);$('personas-modal').close();});
      card.append(kicker,art,el('h3','',p.name),el('p','',p.description),choose);$('persona-grid').append(card);
    }

  }
  function renderConnection(){
    $('cancel-files').hidden=!filesLoading;
    const ready=!!connection,verified=connection?.status==='verified',label=!ready?'Conectar IA':verified?(connection.provider==='openrouter'?'OpenRouter':connection.provider==='gemini'?'Gemini':connection.provider==='server'?'Servidor':'Modelo')+' conectado':connection.status==='error'?'Revisar conexão':'Conexão configurada';
    $('connection-label').textContent=label;$('connection-pill').classList.toggle('online',verified);$('connection-pill').classList.toggle('armed',ready&&!verified);$('side-link-dot').classList.toggle('online',verified);
    $('model-label').textContent=ready?connection.actualModel||connection.model:'ESCOLHER MODELO';$('dock-model').textContent=ready?connection.actualModel||connection.model:'Nenhum modelo conectado';
    $('welcome-connection').textContent=ready?(verified?'Modelo conectado. Pronto para conversar.':'Conexão configurada. Sua primeira mensagem verifica o modelo.'):'Conecte um modelo para começar a conversar.';
    $('privacy-status').querySelector('span').textContent=state.settings.keepHistory?'Histórico neste navegador':'Sessão temporária';
    $('context-label').textContent=studio?.searchEnabled?'PESQUISA COM FONTES ATIVA':state.settings.useContext?'CONTEXTO DE CONVERSA ATIVO':'PERGUNTAS SEM HISTÓRICO';
    $('speak-toggle').setAttribute('aria-pressed',String(state.settings.speak));if(compat)compat.apply();else document.body.classList.toggle('no-effects',!state.settings.effects);
    $('clear-session').disabled=!ready&&!busy;$('mic-button').disabled=busy||testing||filesLoading;$('attach-button').disabled=busy||filesLoading;$('attach-button').setAttribute('aria-busy',String(filesLoading));$('send-button').disabled=busy||testing||filesLoading;$('send-button').hidden=busy;$('stop-response').hidden=!busy;
    $('generation-label').textContent=busy?'GERANDO RESPOSTA':filesLoading?'LENDO ANEXOS':'';
    $('test-connection').disabled=busy;$('test-connection').textContent=testing?'CANCELAR TESTE':'TESTAR';$('connection-form').querySelector('[type=submit]').disabled=busy||testing;
    $('hud-connection').textContent=!ready?'Aguardando conexão':verified?'Conectado':connection.status==='error'?'Revisar conexão':'Configurado';$('hud-privacy').textContent=state.settings.keepHistory?'Histórico neste navegador':'Sessão temporária';$('hud-context').textContent=state.settings.useContext?'Contexto ativo':'Perguntas independentes';$('hud-model').textContent=ready?connection.actualModel||connection.model:'Escolha um modelo';
    $('new-thread').disabled=busy;all('.thread-open,.thread-delete').forEach(n=>n.disabled=busy);
  }
  function renderThreadList(){
    const list=$('thread-list');list.replaceChildren();const threads=state.threads.filter(t=>t.messages.length).sort((a,b)=>b.at-a.at);$('history-count').textContent=String(threads.length).padStart(2,'0');
    if(!threads.length){list.append(el('p','thread-empty',state.settings.keepHistory?'Suas conversas salvas aparecerão aqui.':'As conversas desta aba aparecem aqui. O histórico não é salvo por padrão.'));return;}
    for(const t of threads){const row=el('div','thread-item'+(t.id===state.active?' active':'')),b=el('button','thread-open');b.type='button';b.disabled=busy;b.append(el('span','',t.title),el('small','',personas[t.persona]?.short.toUpperCase()+' · '+new Date(t.at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})));b.addEventListener('click',()=>{if(busy)return;if(state.active===t.id){closeDrawer();return;}rememberDraft();state.active=t.id;restoreDraft();scrollRequested=true;applyPersona(t.persona,false);renderMessages();renderThreadList();hideError();save();closeDrawer();});
      const remove=el('button','thread-delete');remove.type='button';remove.disabled=busy;remove.setAttribute('aria-label','Excluir conversa '+t.title);remove.append(icon('trash'));remove.addEventListener('click',async()=>{if(busy||!await ask('Excluir a conversa “'+t.title+'”? Exporte um backup se quiser conservá-la.','Excluir conversa'))return;if(busy)return;state.threads=state.threads.filter(x=>x.id!==t.id);drafts.delete(t.id);if(state.active===t.id){state.active=null;restoreDraft();scrollRequested=true;}pruneImages();save();renderMessages();renderThreadList();});row.append(b,remove);list.append(row);}
  }
  function newConversation(){if(busy){toast('Aguarde ou interrompa a resposta atual.');return;}rememberDraft();state.active=null;restoreDraft();scrollRequested=true;hideError();renderMessages();renderThreadList();save();closeDrawer();$('chat-input').focus();}
  function ensureThread(){let t=current();if(t)return t;if(state.threads.length>=C.MAX_THREADS)throw Error('O limite é de 40 conversas. Exporte um backup e remova uma conversa antes de criar outra.');t={id:C.uid(),title:'Nova conversa',persona:state.settings.persona,at:Date.now(),messages:[]};state.threads.push(t);state.active=t.id;return t;}
  function inline(root,text){
    const re=/(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^\s)]+\))/g;let from=0,m;
    while((m=re.exec(text))){root.append(document.createTextNode(text.slice(from,m.index)));const token=m[0];if(token.startsWith('**'))root.append(el('strong','',token.slice(2,-2)));else if(token.startsWith('`'))root.append(el('code','',token.slice(1,-1)));else{const link=token.match(/^\[([^\]]+)\]\((.+)\)$/),url=link&&C.safeURL(link[2]);if(url){const a=el('a','',link[1]);a.href=url;a.target='_blank';a.rel='noopener noreferrer';root.append(a);}else root.append(document.createTextNode(token));}from=m.index+token.length;}
    root.append(document.createTextNode(text.slice(from)));
  }
  function markdown(root,text){
    root.replaceChildren();const lines=String(text).split('\n');let i=0;
    const cells=s=>s.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(s=>s.trim());
    while(i<lines.length){const line=lines[i];if(!line.trim()){i++;continue;}
      if(/^\s*```/.test(line)){const lang=line.replace(/^\s*```/,'').trim().slice(0,30),code=[];i++;while(i<lines.length&&!/^\s*```/.test(lines[i]))code.push(lines[i++]);if(i<lines.length)i++;const block=el('div','code-block'),head=el('div','code-header'),button=el('button','', 'COPIAR');button.type='button';button.prepend(icon('copy'));button.addEventListener('click',()=>copy(code.join('\n')));head.append(el('span','',lang||'CÓDIGO'),button);const pre=el('pre');pre.append(el('code','',code.join('\n')));block.append(head,pre);root.append(block);continue;}
      if(line.includes('|')&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}:?\s*\|/.test(lines[i+1])){const wrap=el('div','markdown-table'),table=el('table'),tr=el('tr');for(const c of cells(line)){const th=el('th');inline(th,c);tr.append(th);}const thead=el('thead');thead.append(tr);table.append(thead);i+=2;const body=el('tbody');let rows=0;while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()&&rows++<200){const row=el('tr');for(const c of cells(lines[i++])){const td=el('td');inline(td,c);row.append(td);}body.append(row);}table.append(body);wrap.append(table);root.append(wrap);continue;}
      const heading=line.match(/^(#{1,4})\s+(.+)/);if(heading){const h=el('h'+Math.min(4,heading[1].length+1));inline(h,heading[2]);root.append(h);i++;continue;}
      const list=line.match(/^\s*(?:([-*+])\s+|(\d+)[.)]\s+)(.+)/);if(list){const ordered=!!list[2],out=el(ordered?'ol':'ul');while(i<lines.length){const x=lines[i].match(/^\s*(?:([-*+])\s+|(\d+)[.)]\s+)(.+)/);if(!x||!!x[2]!==ordered)break;const li=el('li');inline(li,x[3]);out.append(li);i++;}root.append(out);continue;}
      if(/^>\s?/.test(line)){const quote=el('blockquote');inline(quote,line.replace(/^>\s?/,''));root.append(quote);i++;continue;}
      const out=el('p'),paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^\s*```|^#{1,4}\s|^>\s?|^\s*(?:[-*+]\s|\d+[.)]\s)/.test(lines[i])&&!(i+1<lines.length&&lines[i].includes('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])))paragraph.push(lines[i++]);inline(out,paragraph.join('\n'));root.append(out);
    }
  }
  function renderMessages(){
    const t=current(),root=$('messages'),scrollBox=$('message-scroll'),previousTop=scrollBox.scrollTop,follow=scrollRequested;root.replaceChildren();streamRow=null;$('conversation-screen').classList.toggle('has-messages',!!t?.messages.length);if(!t?.messages.length)return;
    for(const m of t.messages){const p=personas[m.persona]||personas.jarvis,row=el('article','message '+m.role);row.dataset.message=m.id;row.style.setProperty('--p-color',p.color);row.style.setProperty('--p-rgb',p.rgb);row.setAttribute('aria-label',m.role==='user'?'Sua mensagem':'Resposta de '+p.short);const avatar=el('div','message-avatar',m.role==='user'?'SR':p.symbol);const body=el('div','message-body'),meta=el('div','message-meta'),time=el('time','',new Date(m.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));meta.append(el('b','',m.role==='user'?'VOCÊ':p.name),time);const content=el('div','message-content');
      if(m.role==='user')content.textContent=m.content;else if(busy&&m.id===progressMessageId){content.classList.add('streaming-text');content.textContent=m.content||'Aguardando o modelo...';row.setAttribute('aria-busy','true');streamRow=content;}else markdown(content,m.content);
      body.append(meta,content);
      if(m.attachments?.length){const files=el('div','message-attachments');for(const a of m.attachments){const data=images.get(a.id);if(a.kind==='image'&&data){const image=el('img','message-image');image.src=data;image.alt=a.name;files.append(image);}else{const file=el('div','message-file',a.name+(a.kind==='image'?' · imagem não incluída no backup':''));file.prepend(icon('clip'));files.append(file);}}body.append(files);}
      if(m.sources?.length){const sources=el('div','source-links');for(const s of m.sources){const url=C.safeURL(s.url);if(!url)continue;const a=el('a','',s.title||new URL(url).hostname);a.href=url;a.target='_blank';a.rel='noopener noreferrer';sources.append(a);}body.append(sources);}
      if(m.content&&m.role==='assistant'&&!(busy&&m.id===progressMessageId)){const actions=el('div','message-actions'),copyButton=el('button','', 'COPIAR');copyButton.type='button';copyButton.prepend(icon('copy'));copyButton.addEventListener('click',()=>copy(m.content));actions.append(copyButton);if(m===t.messages.at(-1)){const retry=el('button','', 'GERAR ALTERNATIVA');retry.type='button';retry.prepend(icon('refresh'));retry.disabled=busy;retry.addEventListener('click',retryResponse);actions.append(retry);}const total=m.usage?.total_tokens||m.usage?.totalTokenCount;const usage=el('span','message-usage',(m.model||'')+(total?' · '+total.toLocaleString('pt-BR')+' tokens':''));actions.append(usage);body.append(actions);if(m.status!=='complete')body.append(el('span','message-partial',m.status==='stopped'?'RESPOSTA INTERROMPIDA':'RESPOSTA PARCIAL'));}
      if(m.role==='user'){const actions=el('div','message-actions'),reuse=el('button','','REUTILIZAR PERGUNTA');reuse.type='button';reuse.prepend(icon('edit'));reuse.addEventListener('click',()=>{if(busy)return;$('chat-input').value=m.content;resizeInput();$('chat-input').focus();});actions.append(reuse);body.append(actions);}
      row.append(avatar,body);root.append(row);
    }
    if(follow)scrollBottom(true);else scrollBox.scrollTop=previousTop;
  }
  function scrollBottom(force=false){const box=$('message-scroll');if(force||scrollRequested)box.scrollTop=box.scrollHeight;}
  async function copy(text){try{await navigator.clipboard.writeText(text);toast('Texto copiado.');}catch{toast('O navegador não liberou a área de transferência. Selecione o texto ou exporte a conversa.');}}
  function hideError(){$('ui-error').hidden=true;}
  function showError(message){$('error-text').textContent=message;$('ui-error').hidden=false;}
  function downloadBinary(name,value,type){const blob=value instanceof Blob?value:new Blob([value],{type}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;(all('dialog[open]').at(-1)||document.body).append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function download(name,text,type='application/json'){const u=URL.createObjectURL(new Blob([text],{type})),a=el('a');a.href=u;a.download=name;(all('dialog[open]').at(-1)||document.body).append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
  function resizeInput(){const input=$('chat-input');input.style.height='auto';const limit=parseFloat(getComputedStyle(input).maxHeight)||150;input.style.height=Math.min(150,Math.max(30,limit),input.scrollHeight)+'px';}
  function renderAttachments(){const box=$('attachments');box.replaceChildren();for(const a of pending){const chip=el('div','attachment-chip');if(a.kind==='image'&&a.data){const img=el('img');img.src=a.data;img.alt='';chip.append(img);}else chip.append(icon('clip'));chip.append(el('span','',a.name));if(a.localFile&&/\.pdf$/i.test(a.name)){const preview=el('button','','PDF');preview.type='button';preview.setAttribute('aria-label','Abrir prévia de '+a.name);preview.addEventListener('click',()=>documents.preview(a.localFile).catch(e=>toast(e.message,true)));chip.append(preview);}const remove=el('button','','×');remove.type='button';remove.setAttribute('aria-label','Remover anexo '+a.name);remove.addEventListener('click',()=>{pending=pending.filter(x=>x.id!==a.id);renderAttachments();});chip.append(remove);box.append(chip);}}
  function cacheImage(id,data){images.set(id,data);let size=[...images.values()].reduce((n,value)=>n+value.length,0);let removed=false;for(const [key,value]of images){if(size<=24*1024*1024)break;images.delete(key);size-=value.length;removed=true;}if(removed)toast('Imagens mais antigas saíram da memória para manter o aplicativo leve. Reanexe se precisar consultá-las.');}
  async function addFiles(files){
    if(busy||filesLoading)return;
    const revision=++attachmentRevision;fileController=new AbortController();const fileSignal=fileController.signal;filesLoading=true;renderConnection();
    try{
      for(const f of Array.from(files).slice(0,4)){
        if(revision!==attachmentRevision)break;
        if(pending.length>=4){toast('Você pode anexar até quatro arquivos por mensagem.');break;}
        const image=['image/png','image/jpeg','image/webp'].includes(f.type),documentFile=/\.(pdf|docx|xlsx)$/i.test(f.name);
        if(f.size>(image?2*1024*1024:documentFile?8*1024*1024:250000)){toast(f.name+': limite de 2 MB por imagem, 8 MB por documento ou 250 KB por texto.',true);continue;}
        if(!image&&!documentFile&&!/\.(txt|md|csv|json|py|js|ts|html|css|sql)$/i.test(f.name)){toast('Use uma imagem PNG/JPG/WebP, PDF, DOCX, XLSX ou texto/código.',true);continue;}
        const a={id:C.uid(),name:f.name.slice(0,160),kind:image?'image':'text',mime:f.type,size:f.size,text:''};
        if(image)a.data=await new Promise((resolve,reject)=>{
          const reader=new FileReader();fileReaders.add(reader);
          reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Não consegui ler a imagem.'));reader.onabort=()=>reject(new DOMException('Leitura cancelada','AbortError'));
          reader.onloadend=()=>fileReaders.delete(reader);reader.readAsDataURL(f);
        });
        else if(documentFile){const result=await documents.extract(f,{signal:fileSignal});a.text=result.text;a.localFile=f;if(result.truncated)toast(f.name+': apenas a parte dentro do limite de 60 mil caracteres foi anexada.');}
        else{const text=await JarvisDocuments.readBlob(f,{text:true,signal:fileSignal});if(text.length>60000){toast(f.name+': o limite é de 60 mil caracteres.',true);continue;}a.text=text;}
        if(revision!==attachmentRevision)break;pending.push(a);renderAttachments();
      }
    }catch(error){if(revision===attachmentRevision&&error.name!=='AbortError')toast(error.message||'Não consegui abrir esse arquivo.',true);}
    finally{if(revision===attachmentRevision){filesLoading=false;renderAttachments();renderConnection();}}
  }
  let progressMessageId=null;
  async function send(event){event?.preventDefault();if(busy)return;if(filesLoading){toast('Aguarde a leitura dos anexos antes de enviar.');return;}if(testing){toast('Aguarde o teste de conexão.');return;}const input=$('chat-input'),draft=input.value.trim();if(!draft&&!pending.length)return;if(!connection){openModal('connection-modal');$('connection-feedback').textContent='Conecte um modelo para enviar sua mensagem. Seu texto foi mantido.';return;}
    let t;try{t=current();if(t&&t.messages.length>C.MAX_MESSAGES-2)throw Error('Essa conversa atingiu o limite de 180 mensagens. Exporte e comece uma nova conversa.');}catch(e){showError(e.message);return;}
    const message={id:C.uid(),role:'user',content:draft||'Analise os arquivos anexados.',at:Date.now(),persona:state.settings.persona,attachments:pending.map(a=>C.cleanMessage({role:'user',content:'',attachments:[a]}).attachments[0])};
    try{C.validateCurrentMessage(message);t=ensureThread();}catch(error){showError(error.message);return;}
    for(const a of pending)if(a.kind==='image')cacheImage(a.id,a.data);
    drafts.delete(state.active||'new');drafts.delete('new');t.messages.push(message);t.at=Date.now();if(t.title==='Nova conversa')t.title=message.content.replace(/\s+/g,' ').slice(0,75);pending=[];input.value='';resizeInput();renderAttachments();save();renderThreadList();await generate(t,t.messages.length-1);
  }
  function hydrated(m){return {...m,attachments:(m.attachments||[]).map(a=>({...a,data:a.kind==='image'?images.get(a.id):undefined}))};}
  async function generate(t,userIndex){
    if(t.messages.length>=C.MAX_MESSAGES){showError('Essa conversa atingiu o limite de 180 mensagens. Exporte e comece uma nova conversa.');return;}
    if(busy||testing||filesLoading||!connection)return;hideError();scrollRequested=true;stopVoice();window.speechSynthesis?.cancel();speaking=false;busy=true;controller=new AbortController();const requestConnection={...connection};const pId=state.settings.persona,p=personas[pId],prefs={...state.settings};
    const output={id:C.uid(),role:'assistant',content:'',at:Date.now(),persona:pId,status:'partial',model:requestConnection.model,attachments:[],sources:[]};progressMessageId=output.id;t.messages.push(output);status('thinking');renderMessages();renderConnection();beep();
    const timer=setTimeout(()=>controller?.abort(),180000);
    try{
      let messages=C.contextMessages(t.messages.slice(0,userIndex+1).map(hydrated),prefs.useContext),webSources=[];
      if(studio?.searchEnabled){webSources=await studio.search(t.messages[userIndex].content,controller.signal);if(webSources.length){const last=messages[messages.length-1];messages=messages.slice(0,-1).concat({...last,content:last.content+'\n\n'+JarvisStudio.sourceContext(webSources)});messages=C.contextMessages(messages,true);}}
      const payload={messages,system:C.buildPrompt(p,prefs,state.memory),persona:pId,preferences:prefs,memory:prefs.shareMemory?state.memory:''};
      if(messages.some(m=>m.attachments?.some(a=>a.omitted==='context_limit')))toast('Imagens mais antigas ficaram fora deste pedido. Até quatro imagens são enviadas por vez.');
      const result=await C.chat(requestConnection,payload,{signal:controller.signal,onToken:text=>{output.content=text;progressText=text;if(!renderFrame)renderFrame=requestAnimationFrame(()=>{renderFrame=null;if(streamRow)streamRow.textContent=progressText;if(scrollRequested)scrollBottom();});},onMeta:meta=>{output.model=meta.model;}});output.content=result.text;output.status='complete';output.model=result.model;output.usage=result.usage;output.sources=[...webSources,...result.sources].filter((source,index,list)=>list.findIndex(x=>x.url===source.url)===index).slice(0,8);connection&&Object.assign(connection,{status:'verified',actualModel:result.model});if(['length','MAX_TOKENS'].includes(result.finishReason))toast('O modelo atingiu o limite desta resposta. Você pode pedir para continuar.');if(prefs.speak)speak(output.content,pId);}
    catch(e){if(e.partialText||output.content){output.content=e.partialText||output.content;output.status=e.name==='AbortError'?'stopped':'partial';output.model=e.model||output.model;}else t.messages=t.messages.filter(m=>m.id!==output.id);if(e.name==='AbortError'){toast('Resposta interrompida.');}else{showError(e.message||'Não consegui consultar o modelo.');if(connection)connection.status='error';}}
    finally{clearTimeout(timer);if(renderFrame)cancelAnimationFrame(renderFrame);renderFrame=null;progressMessageId=null;streamRow=null;busy=false;controller=null;t.at=Date.now();if(!speaking)status('idle');save();renderMessages();renderThreadList();renderConnection();}
  }
  async function retryResponse(){
    if(busy||testing||filesLoading)return;if(!connection){openModal('connection-modal');return;}
    let t=current();if(!t)return;const index=P.lastUserIndex(t.messages);if(index<0)return;
    if(t.messages.slice(index+1).some(m=>m.role==='assistant'&&m.content)){
      if(state.threads.length>=C.MAX_THREADS){showError('Exporte ou remova uma conversa antes de criar uma alternativa. O limite é de 40 conversas.');return;}
      rememberDraft();t=C.forkThread(t,index,state.settings.persona);state.threads.push(t);state.active=t.id;restoreDraft();scrollRequested=true;save();renderThreadList();toast('Alternativa criada. A conversa original foi preservada.');
    }
    await generate(t,index);
  }
  function providerChanged(){
    modelListRevision++;modelListController?.abort();modelListController=null;$('load-models').disabled=false;
    const provider=$('provider').value,p=C.PRESETS[provider],isServer=provider==='server',remembered=provider===state.settings.provider;
    $('key-field').hidden=isServer;$('model-field').hidden=isServer;$('base-field').hidden=isServer;$('connection-advanced').hidden=isServer;$('free-option').hidden=provider!=='openrouter';$('server-info').hidden=!isServer;$('load-models').hidden=isServer;
    $('available-models').replaceChildren();$('api-model').value=remembered?state.settings.model:p.model;$('api-base').value=remembered&&state.settings.base?state.settings.base:p.base;
    $('api-protocol').value=remembered?state.settings.protocol:p.protocol;$('api-auth').value=remembered?state.settings.auth:p.auth;$('api-stream').checked=remembered?state.settings.stream!==false:true;$('api-token-param').value=remembered?state.settings.tokenParam:p.tokenParam||'max_tokens';$('api-system-role').value=remembered?state.settings.systemRole:'system';$('api-headers').value='';$('api-key').value='';$('free-only').checked=state.settings.freeOnly;
    $('key-link').href=p.keyURL||p.docsURL||'#';$('key-link').hidden=!(p.keyURL||p.docsURL);$('key-link').replaceChildren(document.createTextNode(p.keyURL?'OBTER MINHA CHAVE ':'DOCUMENTAÇÃO E ATIVAÇÃO '),icon('external'));
    $('provider-note').textContent=p.local?'Este endereço local aponta para o aparelho que abre a página. O serviço precisa já estar instalado e acessível; no celular, 127.0.0.1 não é o seu computador.':provider==='openrouter'?'A restrição gratuita continua ativa por padrão. Não há troca automática para modelos pagos.':'Escolha um modelo da sua conta. Compatibilidade, CORS, recursos e cobrança dependem do provedor e do modelo. Não há reenvio automático para outro serviço.';
    $('server-info').textContent=backend?(backend.ai.ready?'Servidor encontrado: '+backend.ai.provider+' / '+backend.ai.model+'.':'Servidor encontrado. Configure o provedor e modelo em .env.'):'Servidor não encontrado nesta página. Você pode conectar uma API diretamente, quando o provedor permitir acesso pelo navegador.';
    $('connection-feedback').textContent='';$('connection-feedback').classList.remove('error');
  }
  function connectionFields(){
    const provider=$('provider').value,protocol=$('api-protocol').value,base=provider==='server'?'':C.normalizeBase($('api-base').value.trim(),protocol);
    return {provider,protocol,base,auth:$('api-auth').value,stream:$('api-stream').checked,tokenParam:$('api-token-param').value,systemRole:$('api-system-role').value,headers:C.extraHeaders($('api-headers').value)};
  }
  function renderConnectionForm(){
    $('provider').value=connection?.provider||state.settings.provider;providerChanged();
    if(connection){$('api-model').value=connection.model;$('api-base').value=connection.base||'';$('free-only').checked=connection.freeOnly!==false;if(connection.provider!=='server'){$('api-protocol').value=C.protocol(connection);$('api-auth').value=connection.auth||C.PRESETS[connection.provider].auth;$('api-stream').checked=connection.stream!==false;$('api-token-param').value=connection.tokenParam||'max_tokens';$('api-system-role').value=connection.systemRole||'system';$('api-headers').value=Object.keys(connection.headers||{}).length?JSON.stringify(connection.headers,null,2):'';}$('connection-feedback').textContent=connection.status==='verified'?'Conexão verificada nesta sessão.':'A conexão ainda não foi verificada por uma resposta.';}
  }
  function connect(close=true){
    if(busy||testing)throw Error('Aguarde ou interrompa a operação atual antes de mudar a conexão.');
    const fields=connectionFields(),{provider,base}=fields,model=$('api-model').value.trim(),key=C.connectionKey(connection,provider,base,$('api-key').value);
    if(model.length>180)throw Error('O identificador de modelo é extenso demais.');
    if(provider==='server'){if(!backend?.ai.ready)throw Error('O servidor precisa estar aberto e ter um modelo configurado.');connection={provider,model:backend.ai.model,session:backend.session,status:'armed'};}
    else{if(fields.auth!=='none'&&!key)throw Error('Cole uma chave da sua própria conta ou selecione a autenticação apropriada.');if(!model)throw Error('Escolha ou informe o ID do modelo.');if(provider==='openrouter'&&$('free-only').checked&&model!=='openrouter/free'&&!model.endsWith(':free'))throw Error('Escolha openrouter/free ou um modelo terminado em :free.');connection={...fields,model,key,status:'armed',freeOnly:$('free-only').checked};C.authHeaders(connection);}
    Object.assign(state.settings,{provider,model:connection.model,base,protocol:fields.protocol,auth:fields.auth,stream:fields.stream,tokenParam:fields.tokenParam,systemRole:fields.systemRole,freeOnly:connection.freeOnly!==false});
    $('api-key').value='';save();renderConnection();$('connection-feedback').textContent='Conexão carregada somente nesta aba. A primeira resposta confirma o acesso.';if(close){$('connection-modal').close();toast('Modelo configurado. Envie sua primeira mensagem.');}return connection;
  }
  async function testConnection(){
    if(testing){testController?.abort();return;}if(busy){toast('Aguarde a operação atual.');return;}const button=$('test-connection');try{const c=connect(false);testing=true;renderConnection();$('connection-feedback').classList.remove('error');$('connection-feedback').textContent='Consultando o modelo com uma frase curta...';const abort=new AbortController();testController=abort;const timer=setTimeout(()=>abort.abort(),90000);try{const result=await C.chat({...c},{messages:[{role:'user',content:'Responda apenas uma frase breve de saudação.'}],system:C.buildPrompt(persona(),{...state.settings,shareMemory:false}),preferences:{length:'brief'},persona:state.settings.persona},{signal:abort.signal});if(connection!==c||abort.signal.aborted)return;c.status='verified';c.actualModel=result.model;$('connection-feedback').textContent='Resposta real de '+result.model+': '+result.text.slice(0,400);renderConnection();}finally{clearTimeout(timer);}}
    catch(e){$('connection-feedback').classList.add('error');$('connection-feedback').textContent=e.name==='AbortError'?'O teste foi interrompido ou excedeu o tempo de resposta.':e.message;if(connection)connection.status='error';renderConnection();}finally{testing=false;testController=null;button.disabled=false;renderConnection();}
  }
  function disconnect(notify=true){controller?.abort();testController?.abort();connection=null;$('api-key').value='';stopVoice();window.speechSynthesis?.cancel();speaking=false;if(!busy)status('idle');renderConnection();if(notify)toast('Chave descartada da sessão. Suas conversas permanecem nesta aba.');}
  function voiceOptions(){voices=window.speechSynthesis?.getVoices?.()||[];const select=$('setting-voice'),selected=state.settings.voice;select.replaceChildren(new Option('Automática · disponível no sistema',''));for(const v of voices)select.add(new Option(v.name+' · '+v.lang,v.voiceURI));select.value=voices.some(v=>v.voiceURI===selected)?selected:'';}
  function renderSettings(){const s=state.settings;$('setting-name').value=s.name;$('setting-output').value=s.maxOutputTokens||0;$('setting-length').value=s.length;$('setting-lang').value=s.lang;$('setting-layout').value=s.layoutMode||'auto';$('setting-motion').value=s.motionQuality||'auto';$('setting-gamepad').checked=s.gamepad===true;const names={network:'Rede',stream:'Streaming',database:'Banco local',workers:'Processamento separado',dictation:'Ditado',speech:'Leitura em voz alta',gamepad:'Controle',fullscreen:'Tela cheia',secure:'Contexto seguro'};$('compat-list').replaceChildren(...Object.entries(compat?.capabilities()||{}).map(([key,available])=>{const row=el('span','',names[key]);row.append(el('b','',available?'Disponível':'Indisponível'));return row;}));$('setting-memory').value=state.memory;for(const [id,key]of [['setting-speak','speak'],['setting-effects','effects'],['setting-sound','sound'],['setting-context','useContext'],['setting-history','keepHistory'],['setting-memory-consent','shareMemory']])$(id).checked=s[key];voiceOptions();}
  function saveSettings(e){e.preventDefault();Object.assign(state.settings,{maxOutputTokens:Number($('setting-output').value)||0,layoutMode:$('setting-layout').value,motionQuality:$('setting-motion').value,gamepad:$('setting-gamepad').checked,name:$('setting-name').value.trim().slice(0,50)||'senhor',length:$('setting-length').value,lang:$('setting-lang').value,voice:$('setting-voice').value,speak:$('setting-speak').checked,effects:$('setting-effects').checked,sound:$('setting-sound').checked,useContext:$('setting-context').checked,keepHistory:$('setting-history').checked,shareMemory:$('setting-memory-consent').checked});state.memory=$('setting-memory').value.slice(0,3000);if(!state.settings.speak){window.speechSynthesis?.cancel();speaking=false;if(!busy)status('idle');}applyPersona(state.settings.persona,false);save();renderConnection();renderThreadList();$('settings-modal').close();toast('Preferências salvas.');}
  function speak(text,pId){if(!state.settings.speak||!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g,' Trecho de código disponível na tela. ').replace(/[*#`]/g,'').slice(0,4500));u.lang=state.settings.lang;u.rate=personas[pId]?.rate||1;u.pitch=personas[pId]?.pitch||1;u.voice=voices.find(v=>v.voiceURI===state.settings.voice)||voices.find(v=>v.lang.toLowerCase().startsWith(state.settings.lang.slice(0,2).toLowerCase()))||null;u.onstart=()=>{speaking=true;status('speaking');};u.onend=u.onerror=()=>{speaking=false;status(busy?'thinking':listening?'listening':'idle');};window.speechSynthesis.speak(u);}
  function stopVoice(){listening=false;const previous=recognition;recognition=null;try{previous?.abort();}catch{}$('mic-button').setAttribute('aria-pressed','false');if(!busy&&!speaking)status('idle');}
  function startVoice(){if(busy||testing||filesLoading)return;if(listening){stopVoice();return;}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('O ditado deste navegador não está disponível. Você pode usar o microfone do teclado do celular ou escrever sua mensagem.',true);return;}window.speechSynthesis?.cancel();speaking=false;let sr;try{sr=new SR();}catch{toast('O reconhecimento de voz não está disponível aqui. Use a digitação por voz do teclado do celular ou escreva sua mensagem.',true);return;}recognition=sr;sr.lang=state.settings.lang;sr.continuous=false;sr.interimResults=false;sr.onstart=()=>{if(recognition!==sr){try{sr.abort();}catch{}return;}listening=true;$('mic-button').setAttribute('aria-pressed','true');status('listening');toast('Estou ouvindo. A transcrição ficará no campo para você revisar.');};sr.onresult=e=>{if(recognition!==sr)return;const text=Array.from(e.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join(' ').trim();if(text){$('chat-input').value=($('chat-input').value+' '+text).trim().slice(0,16000);resizeInput();$('chat-input').focus();}};sr.onerror=e=>{if(recognition!==sr)return;toast(['not-allowed','service-not-allowed'].includes(e.error)?'O acesso ao microfone foi negado. Verifique a permissão do navegador.':e.error==='network'?'O serviço de reconhecimento de voz não está disponível nesta rede.':'Não consegui transcrever a fala. Você pode usar o campo de texto.',true);stopVoice();};sr.onend=()=>{if(recognition!==sr)return;listening=false;recognition=null;$('mic-button').setAttribute('aria-pressed','false');if(!busy)status('idle');};try{sr.start();}catch{stopVoice();toast('Não foi possível iniciar a escuta.',true);}}
  let audioContext=null;
  function beep(){if(!state.settings.sound)return;try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.frequency.value=680;gain.gain.setValueAtTime(.0001,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.016,audioContext.currentTime+.015);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.11);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.12);}catch{}}
  async function api(path,body){if(!backend)throw Error('Servidor opcional não conectado. Use Exportar backup para conservar seus dados sem ele.');const {response:r,value}=await P.timedJSON(fetch,path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json','X-Jarvis-Session':backend.session},body:body===undefined?undefined:JSON.stringify(body)},15000);if(!r.ok){const e=Error(value.error||'Falha no servidor opcional.');e.status=r.status;throw e;}return value;}
  async function discover(){if(!/^https?:$/.test(location.protocol))return;try{const {response:r,value}=await P.timedJSON(fetch,'/api/config',{credentials:'same-origin'},2500);if(!r.ok)return;if(!value.session||!value.ai)return;backend=value;const saved=await api('/api/workspace');serverRevision=saved.revision||0;$('backup-status').textContent=saved.workspace?'Há uma cópia no servidor, revisão '+serverRevision+'. Ela só será restaurada se você escolher.':'Servidor disponível. Nenhuma cópia de conversa foi restaurada automaticamente.';}catch{}}
  async function saveServer(explicit=true){if(!explicit&&!state.settings.autoBackup)return;if(serverSaving){serverDirty=true;return;}if(!backend){if(explicit)toast('O backup em arquivo funciona sem servidor. Para SQLite, inicie o servidor opcional.',true);return;}serverSaving=true;try{const r=await api('/api/workspace',{workspace:snapshot(),expectedRevision:serverRevision});serverRevision=r.revision;$('backup-status').textContent='Cópia salva no servidor · revisão '+serverRevision+' · '+new Date().toLocaleTimeString('pt-BR');if(explicit)toast('Cópia salva no servidor.');}catch(e){if(e.status===409){state.settings.autoBackup=false;clearTimeout(serverSaveTimer);save();$('auto-backup').checked=false;const latest=await api('/api/workspace').catch(()=>null);if(latest)serverRevision=latest.revision;$('backup-status').textContent='Outra aba salvou uma versão mais recente. O salvamento automático foi pausado. Exporte seus dados antes de escolher Restaurar ou Salvar uma cópia.';toast('Há outra versão no servidor. Confira Conversas e dados.',true);}else if(explicit)toast(e.message,true);}finally{serverSaving=false;if(serverDirty){serverDirty=false;if(state.settings.autoBackup)serverSaveTimer=setTimeout(()=>saveServer(false),1500);}}}
  function applyImported(data){
    if(busy||testing)throw Error('Aguarde ou interrompa a operação atual antes de restaurar conversas.');
    clearTimeout(serverSaveTimer);serverDirty=false;cancelFileRead();state=C.restoreState(state,data);drafts.clear();images.clear();pending=[];renderAttachments();$('chat-input').value='';resizeInput();scrollRequested=true;
    applyPersona(state.settings.persona,false);renderMessages();renderThreadList();renderConnection();$('auto-backup').checked=false;save();
  }
  function cloudUI(){const active=!!cloud?.connected;$('cloud-state').textContent=active?'Sessão conectada. Cópia remota na revisão '+cloudRevision+'.':'Desconectado. Login e sincronização são opcionais.';for(const id of ['cloud-save','cloud-load','cloud-logout'])$(id).disabled=!active;}
  async function cloudLogin(signup=false){
    const button=$(signup?'cloud-signup':'cloud-login');button.disabled=true;
    try{if(cloud?.connected)throw Error('Saia da sessão atual antes de mudar a conta.');const email=$('cloud-email').value.trim(),password=$('cloud-password').value;if(!email||password.length<8)throw Error('Informe e-mail e senha de pelo menos oito caracteres.');cloud=JarvisCloud.create({url:$('cloud-url').value.trim(),key:$('cloud-key').value,readJSON:C.readJSON});const result=await (signup?cloud.signup(email,password):cloud.login(email,password));$('cloud-password').value='';if(result.confirmationRequired){toast('Se a confirmação de e-mail estiver ativa no projeto, confirme sua conta antes de entrar.');return;}const latest=await cloud.load();cloudRevision=Number(latest.revision)||0;toast(latest.workspace?'Login concluído. Sua cópia só será restaurada quando você escolher.':'Login concluído. Ainda não há uma cópia nesta conta.');}
    catch(e){toast(e.message,true);}finally{button.disabled=false;cloudUI();}
  }
  function initCloud(){
    $('cloud-form').addEventListener('submit',e=>{e.preventDefault();cloudLogin(false);});$('cloud-signup').addEventListener('click',()=>cloudLogin(true));
    $('cloud-save').addEventListener('click',async()=>{if(busy||testing){toast('Aguarde ou interrompa a operação atual antes de sincronizar.');return;}const button=$('cloud-save');button.disabled=true;try{if(!cloud?.connected)throw Error('Entre na nuvem primeiro.');const result=await cloud.save(snapshot(),cloudRevision);cloudRevision=result.revision;toast('Cópia salva na sua conta da nuvem.');}catch(e){toast(e.message,true);}finally{cloudUI();}});
    $('cloud-load').addEventListener('click',async()=>{try{if(!cloud?.connected)throw Error('Entre na nuvem primeiro.');const result=await cloud.load();if(!result.workspace){toast('Não existe uma cópia nesta conta.');return;}const imported=C.importState(result.workspace);if(!await ask('Restaurar a revisão '+result.revision+' da sua nuvem? Exporte os dados atuais antes de substituir as conversas desta aba.','Restaurar da nuvem'))return;applyImported(imported);cloudRevision=result.revision;toast('Cópia restaurada. Reconecte seu provedor de IA quando necessário.');cloudUI();}catch(e){toast(e.message,true);}});
    $('cloud-logout').addEventListener('click',async()=>{try{await cloud?.logout();toast('Sessão da nuvem encerrada.');}catch{cloud?.forget();toast('Credenciais removidas desta aba. A rede não confirmou o encerramento no servidor.');}finally{cloudRevision=0;$('cloud-password').value='';cloudUI();}});cloudUI();
  }
  function init(){
    $('provider').replaceChildren(...Object.entries(C.PRESETS).map(([id,p])=>new Option(p.name,id)));
    buildPersonaUI();applyPersona(state.settings.persona,false);renderMessages();renderThreadList();renderConnection();voiceOptions();
    document.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open)openModal(open.dataset.open);const close=e.target.closest('[data-close]');if(close)close.closest('dialog')?.close();});
    all('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
    $('new-thread').addEventListener('click',newConversation);$('chat-form').addEventListener('submit',send);$('chat-input').addEventListener('input',resizeInput);$('chat-input').addEventListener('keydown',e=>{if(P.submitOnEnter(e,touchLayout())){e.preventDefault();send();}});
    $('message-scroll').addEventListener('scroll',()=>{const box=$('message-scroll');scrollRequested=box.scrollHeight-box.scrollTop-box.clientHeight<110;},{passive:true});
    $('stop-response').addEventListener('click',()=>controller?.abort());$('retry-response').addEventListener('click',retryResponse);$('dismiss-error').addEventListener('click',hideError);
    $('attach-button').addEventListener('click',()=>$('file-input').click());$('cancel-files').addEventListener('click',()=>{cancelFileRead();renderConnection();toast('Leitura de arquivos interrompida.');});$('file-input').addEventListener('change',async e=>{const files=Array.from(e.target.files);try{await addFiles(files);}catch{toast('Não consegui abrir esse arquivo.',true);}e.target.value='';});
    $('provider').addEventListener('change',providerChanged);$('api-protocol').addEventListener('change',()=>{const a={chat:'bearer',responses:'bearer',anthropic:'anthropic',gemini:'google',ollama:'none'};$('api-auth').value=a[$('api-protocol').value]||'bearer';});$('connection-form').addEventListener('submit',e=>{e.preventDefault();try{connect();}catch(err){$('connection-feedback').textContent=err.message;$('connection-feedback').classList.add('error');}});$('test-connection').addEventListener('click',testConnection);
    $('load-models').addEventListener('click',async()=>{
      const button=$('load-models'),revision=++modelListRevision,abort=new AbortController();modelListController?.abort();modelListController=abort;button.disabled=true;const timer=setTimeout(()=>abort.abort(),18000);
      try{
        const fields=connectionFields(),provider=fields.provider,key=C.connectionKey(connection,provider,fields.base,$('api-key').value),models=await C.models(provider,key,{...fields,freeOnly:$('free-only').checked,signal:abort.signal});
        if(revision!==modelListRevision)return;
        $('available-models').replaceChildren(...models.map(m=>new Option(m.name,m.id)));if(!models.length)throw Error('Nenhum modelo de conversa foi retornado para esta conta.');if(provider==='gemini'&&!$('api-model').value)$('api-model').value=models[0].id;
        $('connection-feedback').textContent=models.length+' modelos encontrados. Digite no campo Modelo para escolher da lista.';$('connection-feedback').classList.remove('error');
      }catch(error){if(revision===modelListRevision){$('connection-feedback').textContent=error.name==='AbortError'?'A consulta foi interrompida ou excedeu o prazo.':error.message;$('connection-feedback').classList.add('error');}}
      finally{clearTimeout(timer);if(revision===modelListRevision){button.disabled=false;modelListController=null;}}
    });
    $('clear-session').addEventListener('click',()=>disconnect());$('settings-form').addEventListener('submit',saveSettings);$('help-button').addEventListener('click',()=>openModal('help-modal'));$('mic-button').addEventListener('click',startVoice);$('speak-toggle').addEventListener('click',()=>{state.settings.speak=!state.settings.speak;if(!state.settings.speak){window.speechSynthesis?.cancel();speaking=false;if(!busy)status('idle');}save();renderConnection();toast('Respostas faladas '+(state.settings.speak?'ativadas.':'desativadas.'));});
    if(window.speechSynthesis)window.speechSynthesis.addEventListener('voiceschanged',voiceOptions);
    $('menu-button').addEventListener('click',()=>setDrawer(!$('sidebar').classList.contains('open')));$('drawer-shade').addEventListener('click',closeDrawer);$('drawer-close').addEventListener('click',closeDrawer);
    $('sidebar').addEventListener('keydown',e=>{if(e.key==='Tab'&&drawerMedia.matches&&$('sidebar').classList.contains('open')){const buttons=[...$('sidebar').querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length),first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    if(drawerMedia.addEventListener)drawerMedia.addEventListener('change',closeDrawer);else drawerMedia.addListener(closeDrawer);closeDrawer();
    P.installViewport(window,document,resizeInput);
    $('fullscreen').hidden=!document.fullscreenEnabled||typeof document.documentElement.requestFullscreen!=='function';
    $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('O navegador não liberou a tela cheia.');}});
    $('export-backup').addEventListener('click',()=>{const text=JSON.stringify(snapshot(),null,2);if(new Blob([text]).size>4*1024*1024){toast('Seu backup excede 4 MB. Exporte conversas individualmente e remova as antigas antes de criar o backup completo.',true);return;}download('JARVIS_MK_XV_BACKUP.json',text);toast('Backup exportado sem chaves e sem bytes de imagens.');});
    $('import-backup').addEventListener('click',()=>$('backup-file').click());$('backup-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>4*1024*1024){toast('O limite do backup é de 4 MB.',true);return;}try{const value=JSON.parse(await JarvisDocuments.readBlob(file,{text:true}));const imported=C.importState(value);if(!await ask('Importar '+imported.threads.length+' conversa(s)? Isso substitui as conversas desta aba. Exporte antes para conservá-las. O envio de memória e as cópias automáticas ficam desativados.','Importar backup'))return;applyImported(imported);toast('Conversas importadas. Privacidade desta sessão preservada; memória compartilhada desativada.');}catch(e){toast(e.message||'Backup inválido.',true);}});
    $('export-thread').addEventListener('click',()=>{const t=current();if(!t?.messages.length){toast('Comece uma conversa antes de exportar.');return;}download('JARVIS_CONVERSA.md','# '+t.title+'\n\n'+t.messages.map(m=>'## '+(m.role==='user'?'Você':personas[m.persona]?.name||'Assistente')+'\n\n'+m.content+(m.attachments?.length?'\n\nAnexos: '+m.attachments.map(a=>a.name).join(', '):'')).join('\n\n---\n\n'),'text/markdown;charset=utf-8');});
    for(const [id,method]of [['export-pdf','exportPDF'],['export-word','exportWord']])$(id).addEventListener('click',async()=>{const t=current();if(!t?.messages.length){toast('Abra uma conversa antes de exportar.');return;}const button=$(id);button.disabled=true;try{await documents[method](t,personas);toast('Documento exportado.');}catch(e){toast(e.message,true);}finally{button.disabled=false;}});
    $('export-sheet').addEventListener('click',async()=>{const t=current();let message;for(let i=(t?.messages.length||0)-1;i>=0;i--)if(t.messages[i].role==='assistant'&&/\|/.test(t.messages[i].content)){message=t.messages[i];break;}if(!message){toast('Gere uma resposta com tabela Markdown antes de exportar.');return;}const button=$('export-sheet');button.disabled=true;try{await documents.exportSheet(message.content);toast('Planilha exportada. As células foram gravadas como texto, sem executar fórmulas.');}catch(e){toast(e.message,true);}finally{button.disabled=false;}});
    $('rename-thread').addEventListener('click',()=>{const t=current();if(!t){toast('Não há uma conversa ativa.');return;}const title=prompt('Nome da conversa',t.title);if(title?.trim()){t.title=title.trim().slice(0,100);save();renderThreadList();}});
    $('clear-local').addEventListener('click',async()=>{if(!await ask('Apagar o histórico e a memória pessoal gravados neste navegador? A conversa atual continua nesta aba; cópias exportadas e no servidor não são removidas.','Apagar histórico salvo'))return;try{localStorage.removeItem(STORE);}catch{toast('O navegador não permitiu remover o histórico salvo. Verifique as permissões de armazenamento.',true);return;}state.settings.keepHistory=false;save();renderConnection();toast('O histórico persistente foi removido. A conversa atual continua na memória desta aba.');});
    $('save-server').addEventListener('click',()=>saveServer(true));$('load-server').addEventListener('click',async()=>{try{const r=await api('/api/workspace');if(!r.workspace){toast('O servidor ainda não tem uma cópia.');return;}const imported=C.importState(r.workspace);if(!await ask('Restaurar a revisão '+r.revision+' do servidor? Exporte antes para conservar os dados atuais.','Restaurar cópia'))return;serverRevision=r.revision;applyImported(imported);toast('Cópia do servidor restaurada.');}catch(e){toast(e.message,true);}});
    $('auto-backup').checked=state.settings.autoBackup;$('auto-backup').addEventListener('change',()=>{if(!backend){$('auto-backup').checked=false;toast('O servidor opcional precisa estar conectado.',true);return;}state.settings.autoBackup=$('auto-backup').checked;if(!state.settings.autoBackup)clearTimeout(serverSaveTimer);save();});
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openModal('connection-modal');}if(e.altKey&&e.key.toLowerCase()==='n'){e.preventDefault();newConversation();}if(e.altKey&&/^[1-8]$/.test(e.key)){e.preventDefault();applyPersona(C.PERSONA_IDS[Number(e.key)-1]);}if(e.key==='Escape'&&!all('dialog[open]').length){if(busy)controller?.abort();stopVoice();window.speechSynthesis?.cancel();speaking=false;status(busy?'thinking':'idle');closeDrawer();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stopVoice();window.speechSynthesis?.cancel();speaking=false;status(busy?'thinking':'idle');}});
    window.addEventListener('pagehide',()=>{controller?.abort();testController?.abort();modelListController?.abort();cancelFileRead();save();studio?.forget();cloud?.forget();$('cloud-password').value='';connection=null;$('api-key').value='';stopVoice();window.speechSynthesis?.cancel();speaking=false;});
    window.addEventListener('pageshow',e=>{if(e.persisted){status(busy?'thinking':'idle');renderConnection();cloudUI();resizeInput();closeDrawer();discover();}});
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)document.body.classList.add('no-effects');discover();
  }
  function initVisualMotion(){
    const cards=all('.persona-card'),gallery=$('persona-grid');
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries){
          entry.target.classList.toggle('motion-visible',entry.isIntersecting);
          if(entry.isIntersecting){const image=entry.target.querySelector('image[data-lazy-href]');if(image){image.setAttribute('href',image.dataset.lazyHref);delete image.dataset.lazyHref;}}
        }
      },{root:gallery,threshold:.08});
      cards.forEach(card=>observer.observe(card));
    }else cards.forEach(card=>{card.classList.add('motion-visible');const image=card.querySelector('image[data-lazy-href]');if(image){image.setAttribute('href',image.dataset.lazyHref);delete image.dataset.lazyHref;}});
    const sync=()=>document.body.classList.toggle('effects-paused',document.hidden);
    document.addEventListener('visibilitychange',sync);sync();
  }
  async function boot(){
    if(state.settings.keepHistory&&localDB.available){try{const saved=await localDB.load();if(saved)state=C.cleanState(saved);}catch{/* O histórico legado e a conversa temporária continuam disponíveis. */}}
    JarvisCompat.installDialogFallbacks(document);compat=JarvisCompat.init({settings:()=>state.settings,notify:message=>toast(message)});init();initCloud();initVisualMotion();$('guide-shortcut').addEventListener('click',()=>{closeDrawer();$('guide-launcher').click();});
    documents=JarvisDocuments.init({embedded:config.vendorSources||{},openPanel:openModal,notify:message=>toast(message),download:downloadBinary,attachFiles:addFiles});
    studio=JarvisStudio.init({core:C,connection:()=>connection,serverTool:(kind,query)=>api('/api/'+(kind==='news'?'news':'wolfram'),{query}),serverSearch:async(query,signal)=>{if(signal?.aborted)throw new DOMException('Interrompido','AbortError');return api('/api/search',{query});},notify:message=>toast(message),onSearchChange:()=>renderConnection()});
    JarvisDevice.init({notify:message=>toast(message)});
    FusionGuide.init({art:config.guideArt,openPanel:openModal,voiceEnabled:()=>state.settings.speak&&!busy&&!speaking,notify:message=>toast(message)});
  }
  boot().catch(()=>{document.body.classList.add('boot-error');$('boot-feedback').hidden=false;});
  /* BOOT_COMPLETE */

})();
