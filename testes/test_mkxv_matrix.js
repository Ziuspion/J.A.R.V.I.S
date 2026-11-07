/* Matrizes determinísticas com oráculos independentes. Nenhuma conta ou hardware é simulado como homologado. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../fonte/core.js'),A=require('../fonte/connectors.js'),D=require('../fonte/device.js'),F=require('../fonte/documents.js'),K=require('../fonte/compatibility.js'),S=require('../fonte/studio.js'),Cloud=require('../fonte/cloud.js'),DB=require('../fonte/storage.js');
const protocols=['chat','responses','anthropic','gemini','ollama'];
const reqTail={chat:'/chat/completions',responses:'/responses',anthropic:'/messages',gemini:'/models/model-test:streamGenerateContent?alt=sse',ollama:'/api/chat'};
const image='data:image/png;base64,aGVsbG8=';
const payload=(kind,length='balanced')=>({system:'SYSTEM_CHECK',persona:'jarvis',preferences:{length},messages:[{role:'user',content:'Primeira pergunta'},{role:'assistant',content:'Resposta anterior'},{role:'user',content:'Pedido novo',attachments:kind==='text'?[{kind:'text',name:'a.txt',text:'CONTEUDO_LOCAL'}]:kind==='image'?[{kind:'image',name:'a.png',mime:'image/png',data:image}]:[]}]});
for(const provider of Object.keys(C.PRESETS).filter(x=>x!=='server'))for(const protocol of protocols)for(const stream of [true,false])for(const kind of ['plain','text','image'])for(const length of ['brief','balanced','detailed'])test(`requisição ${provider}/${protocol}/${stream}/${kind}/${length}`,()=>{
  const c={provider,protocol,stream,model:'model-test',base:'https://api.example.org/v1',key:'HEADER_ONLY_SENTINEL',freeOnly:false,auth:C.PRESETS[provider].auth};
  const spec=C.requestSpec(c,payload(kind,length)),body=JSON.stringify(spec.body),max={brief:1024,balanced:2048,detailed:4096}[length];
  assert.equal(spec.kind,protocol);assert.ok(spec.url.startsWith(c.base));assert.equal(spec.headers['Content-Type'],'application/json');assert.ok(!body.includes(c.key));assert.ok(body.includes('Pedido novo'));assert.ok(body.includes('SYSTEM_CHECK'));
  if(kind==='text')assert.ok(body.includes('CONTEUDO_LOCAL'));if(kind==='image')assert.ok(body.includes('aGVsbG8='));
  const tail=protocol==='gemini'&&!stream?'/models/model-test:generateContent':reqTail[protocol];assert.equal(spec.url,c.base+tail);
  if(protocol==='responses'){assert.equal(spec.body.store,false);assert.equal(spec.body.max_output_tokens,max);assert.equal(spec.body.input[1].content[0].type,'output_text');}
  else if(protocol==='gemini'){assert.equal(spec.body.contents[1].role,'model');assert.equal(spec.body.generationConfig.maxOutputTokens,max);}
  else if(protocol==='ollama')assert.equal(spec.body.options.num_predict,max);
  else if(protocol==='anthropic')assert.equal(spec.body.max_tokens,max);
  else assert.equal(spec.body[C.PRESETS[provider].tokenParam||'max_tokens'],max);
});
function encodeEvents(protocol,text){const middle=Math.floor(text.length/2),parts=[text.slice(0,middle),text.slice(middle)],sse=v=>'data: '+JSON.stringify(v)+'\r\n\r\n';
  if(protocol==='chat')return parts.map(x=>sse({model:'verified',choices:[{delta:{content:x}}]})).join('')+sse({choices:[{delta:{},finish_reason:'stop'}],usage:{total_tokens:7}})+'data: [DONE]\r\n\r\n';
  if(protocol==='responses')return parts.map(x=>sse({type:'response.output_text.delta',delta:x})).join('')+sse({type:'response.completed',response:{model:'verified',status:'completed',usage:{input_tokens:3,output_tokens:4}}});
  if(protocol==='anthropic')return sse({type:'message_start',message:{model:'verified',usage:{input_tokens:3}}})+parts.map(x=>sse({type:'content_block_delta',delta:{type:'text_delta',text:x}})).join('')+sse({type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:4}})+sse({type:'message_stop'});
  if(protocol==='gemini')return parts.map((x,i)=>sse({modelVersion:'verified',candidates:[{content:{parts:[{text:'PRIVATE_THOUGHT',thought:true},{text:x}]},...(i?{finishReason:'STOP'}:{})}],usageMetadata:{totalTokenCount:7}})).join('');
  return parts.map((x,i)=>JSON.stringify({model:'verified',message:{content:x,thinking:'PRIVATE_THOUGHT'},done:!!i,prompt_eval_count:3,eval_count:4})+'\n').join('');
}
function responseStream(text,chunk,mime){const bytes=new TextEncoder().encode(text);return new Response(new ReadableStream({start(c){for(let at=0;at<bytes.length;at+=chunk)c.enqueue(bytes.slice(at,at+chunk));c.close();}}),{headers:{'Content-Type':mime}});}
const samples=['ação','São Paulo','Olá 🌐','中文测试','日本語の文','مرحبا بالعالم','é\u0301 é','linha\nsegunda','a\rb\tc','<script>alert(1)</script>','🚀🤖🟣','Fim: çãõ €'];
for(const protocol of protocols)for(let sample=0;sample<samples.length;sample++)for(let chunk=1;chunk<=23;chunk++)test(`stream UTF8 ${protocol}/${sample}/bytes${chunk}`,async()=>{
  const expected=samples[sample];let last='';const r=await C.chat({provider:'compatible',protocol,base:'https://example.org/v1',model:'model-test'},payload('plain'),{onToken:s=>last=s,fetcher:async()=>responseStream(encodeEvents(protocol,expected),chunk,protocol==='ollama'?'application/x-ndjson':'text/event-stream')});
  assert.equal(r.text,expected);assert.equal(last,expected);assert.equal(r.model,'verified');assert.equal(r.usage.total_tokens,7);assert.ok(!r.text.includes('PRIVATE_THOUGHT'));
});
for(let seed=1;seed<=600;seed++)test(`estado privado ${seed}`,()=>{
  const provider=Object.keys(C.PRESETS)[seed%Object.keys(C.PRESETS).length],raw={settings:{provider,name:'x'.repeat(seed%90),key:'SECRET_'+seed,headers:{'x-key':'SECRET_'+seed},keepHistory:seed%2===0,layoutMode:['tv','reading','bad'][seed%3],gamepad:seed%7===0},apiKey:'SECRET_'+seed,memory:'memória',threads:[{id:'t',messages:[{role:'user',content:'Pergunta '+seed,attachments:[{kind:'image',name:'foto.png',data:'data:image/png;base64,SECRET_'+seed}]}]}]};
  const clean=C.cleanState(raw);assert.ok(!JSON.stringify(clean).includes('SECRET_'));assert.equal(clean.settings.provider,provider);assert.equal(clean.settings.model,C.PRESETS[provider].model||'');assert.ok(clean.settings.name.length<=50);assert.equal(clean.threads[0].messages[0].attachments[0].kind,'image');assert.equal(DB.eligible(clean),seed%2===0);assert.equal(clean.settings.layoutMode,['tv','reading','auto'][seed%3]);
});
for(let seed=1;seed<=340;seed++)test(`contexto limitado ${seed}`,()=>{
  const rows=Array.from({length:seed%42+1},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat((seed*31+i*19)%5300+1),attachments:[{kind:'image',data:image,name:'img'+i}]}));if(rows.at(-1).role!=='user')rows.push({role:'user',content:'Atual '+seed,attachments:[]});
  const before=JSON.stringify(rows),r=C.contextMessages(rows);assert.equal(JSON.stringify(rows),before);assert.ok(r.length<=25);assert.equal(r[0].role,'user');assert.equal(r.at(-1).content,rows.at(-1).content);assert.ok(r.reduce((sum,m)=>sum+m.content.length,0)<=C.MAX_CONTEXT_CHARS);assert.ok(r.flatMap(x=>x.attachments).filter(x=>x.data).length<=4);
});
for(let seed=1;seed<=600;seed++)test(`capacidade manual ${seed}`,()=>{
  const total=seed*7,free=(seed*11)%(total+1),r=D.cleanRecord({model:'Aparelho '+seed,ramTotal:String(total),ramFree:String(free),storageTotal:String(total*2),storageFree:String(free),unit:seed%2?'GB':'GiB'});assert.equal(r.source,'manual');assert.equal(r.ramTotal,String(total));assert.equal(Number(r.ramFree),free);assert.throws(()=>D.cleanRecord({ramTotal:String(total),ramFree:String(total+1)}),/superar/);assert.throws(()=>D.cleanRecord({ramTotal:'-'+seed}),/capacidades/);
});
for(let seed=1;seed<=300;seed++)test(`URL e chave por destino ${seed}`,()=>{
  const base='https://api'+seed+'.example.org/v1',previous={provider:'compatible',base,key:'SECRET'+seed};assert.equal(C.connectionKey(previous,'compatible',base,''),previous.key);assert.equal(C.connectionKey(previous,'compatible',base+'/other',''),'');assert.equal(C.connectionKey(previous,'other',base,''),'');assert.throws(()=>C.endpoint(base+'?key=SECRET'+seed),/sem chave/);assert.throws(()=>C.endpoint('http://remote'+seed+'.example.org'),/HTTPS/);assert.equal(C.normalizeBase(base+'/responses','responses'),base);assert.equal(C.endpoint(base+'///'),base);
});
for(let seed=0;seed<512;seed++)test(`planilha textual ${seed}`,()=>{
  const column=F.columnName(seed),expected=seed<26?String.fromCharCode(65+seed):String.fromCharCode(64+Math.floor(seed/26))+String.fromCharCode(65+seed%26);assert.equal(column,expected);const marker='=SUM(A'+(seed+1)+')<&"\u0000',xml=F.workbookFiles([['Campo','Valor'],[String(seed),marker]])['xl/worksheets/sheet1.xml'];assert.ok(!xml.includes('<f>'));assert.ok(xml.includes('t="inlineStr"'));assert.ok(xml.includes('&lt;&amp;&quot;'));assert.ok(!xml.includes('\u0000'));assert.ok(xml.includes('=SUM(A'+(seed+1)+')'));
});
for(const mode of K.MODES)for(const motion of ['auto','full','lite','off','invalid'])for(let step=0;step<20;step++)test(`perfil ${mode}/${motion}/width${190+step*73}`,()=>{
  const width=190+step*73,reduced=step%7===0,saveData=step%3===0,p=K.profile({layoutMode:mode,motionQuality:motion,gamepad:step%2===0},{width,reduced,saveData});const quality=motion==='invalid'?'auto':motion,expected=reduced||quality==='off'?'off':quality==='auto'?(saveData||width<=480?'lite':'full'):quality;assert.equal(p.mode,mode);assert.equal(p.motion,expected);assert.equal(p.gamepad,step%2===0);
});
for(let seed=1;seed<=400;seed++)test(`foco espacial ${seed}`,()=>{
  const x=seed%30,y=seed%17,rect={left:x,top:y,right:x+20,bottom:y+20},candidates=[{id:'left',rect:{left:x-60,right:x-40,top:y,bottom:y+20}},{id:'right',rect:{left:x+40,right:x+60,top:y,bottom:y+20}},{id:'up',rect:{left:x,right:x+20,top:y-60,bottom:y-40}},{id:'down',rect:{left:x,right:x+20,top:y+40,bottom:y+60}}];for(const direction of ['left','right','up','down'])assert.equal(K.nearest(rect,candidates,direction),direction);
});
for(const format of ['tavily','brave','serper','exa'])for(let seed=0;seed<40;seed++)test(`pesquisa ${format}/${seed}`,()=>{const q='consulta '+seed+' São Paulo',spec=S.searchSpec(format,'ONLY_HEADER',q);assert.ok(!spec.url.includes('ONLY_HEADER'));const rows=[{title:'Fonte '+seed,url:'https://example.org/'+seed,content:'c'.repeat(3100)},{url:'javascript:alert('+seed+')'},{url:'https://example.org/'+seed}];const value=format==='brave'?{web:{results:rows}}:format==='serper'?{organic:rows}:{results:rows};const sources=S.sanitizeSources(value,format,C.safeURL);assert.equal(sources.length,1);assert.equal(sources[0].content.length,3000);assert.ok(S.sourceContext(sources).includes('[1] Fonte '+seed));assert.ok(!S.sourceContext(sources).includes('javascript:'));});
test('serviço de nuvem recusa service_role e segredo moderno',()=>{assert.throws(()=>Cloud.validatePublicKey('sb_secret_teste'),/secreta/);const jwt='e30.'+Buffer.from('{"role":"service_role"}').toString('base64url')+'.x';assert.throws(()=>Cloud.validatePublicKey(jwt),/service_role/);});
test('OpenRouter não muda para imagem paga sem preferência explícita',()=>{assert.throws(()=>S.imageSpec({kind:'openrouter',key:'test',model:'paid-model',base:'https://openrouter.ai/api/v1'},'Desenhe',C.endpoint),/gratuita/);});
test('imagem inválida não vira HTML executável',()=>{for(const kind of ['openai','gemini','openrouter'])for(const value of [null,{},[],{data:[null,{url:'javascript:evil()'},{url:'data:image/svg+xml;base64,abc'}]},{candidates:[{content:{parts:12}}]}])assert.throws(()=>S.imageResults(value,kind,C.safeURL),/imagem compatível/);});
