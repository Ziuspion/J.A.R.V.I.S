/* Contratos locais: nenhum teste chama uma API externa ou usa chave real. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../fonte/core.js');
const personas=JSON.parse(fs.readFileSync(path.join(__dirname,'../personas.json'),'utf8'));
const connection={provider:'openrouter',model:'openrouter/free',key:'TEST_ONLY_SENTINEL',freeOnly:true};
const payload={persona:'jarvis',system:'TRUSTED_SYSTEM',preferences:{length:'balanced'},messages:[{role:'user',content:'Olá'}]};
function response(text,chunk=7){const bytes=new TextEncoder().encode(text);return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=chunk)c.enqueue(bytes.slice(i,i+chunk));c.close();}}),{headers:{'content-type':'text/event-stream'}});}
const sse=(value)=>'data: '+JSON.stringify(value)+'\n\n';
const token=(content,extra={})=>({choices:[{delta:{content}}],...extra});
async function collect(r){const out=[];for await(const value of C.events(r.body))out.push(value);return out;}

test('sessão temporária e envio de memória opt-in por padrão',()=>{
  const s=C.defaultSettings();assert.equal(s.keepHistory,false);assert.equal(s.shareMemory,false);assert.equal(s.useContext,true);assert.equal(s.freeOnly,true);
});
test('backup elimina credenciais e bytes das imagens',()=>{
  const value=C.cleanState({settings:{key:'SECRET',apiKey:'SECRET',token:'SECRET',base:'https://user:SECRET@example.org/v1'},key:'SECRET',threads:[{id:'t',messages:[{role:'user',content:'Olá',attachments:[{kind:'image',data:'data:image/png;base64,SECRET',name:'foto.png'}]}]}]});
  assert.ok(!JSON.stringify(value).includes('SECRET'));assert.equal(value.settings.base,'');assert.equal(value.threads[0].messages[0].attachments[0].kind,'image');
});
test('importação antiga traz conversas, sem módulos removidos',()=>{
  const value=C.importState({version:3,data:{notes:['OLD_MODULE'],memory:'preferência'},vault:{active:'t',prefs:{},threads:[{id:'t',messages:[{role:'user',content:'Conversa original'}]}]}});
  assert.equal(value.version,4);assert.equal(value.active,'t');assert.equal(value.memory,'preferência');assert.ok(!JSON.stringify(value).includes('OLD_MODULE'));
});
test('backup desconhecido é rejeitado',()=>assert.throws(()=>C.importState({version:99}),/compatível/));
test('papel de sistema não entra por backup ou contexto',()=>{
  const s=C.cleanState({threads:[{messages:[{role:'system',content:'BAD'},{role:'user',content:'GOOD'}]}]});assert.equal(s.threads[0].messages.length,1);
  assert.deepEqual(C.contextMessages([{role:'system',content:'BAD'},{role:'user',content:'GOOD'}]).map(m=>m.content),['GOOD']);
});
test('contexto respeita consentimento e limite de mensagens',()=>{
  const messages=Array.from({length:40},(_,i)=>({role:i%2?'user':'assistant',content:String(i)}));
  assert.equal(C.contextMessages(messages,false).length,1);assert.equal(C.contextMessages(messages,false)[0].content,'39');assert.ok(C.contextMessages(messages).length<=25);assert.equal(C.contextMessages(messages)[0].role,'user');
});
test('contexto descarta o trecho mais antigo por tamanho',()=>{
  const result=C.contextMessages([{role:'user',content:'a'.repeat(60000)},{role:'assistant',content:'b'.repeat(60000)},{role:'user',content:'Atual'}]);assert.deepEqual(result.map(m=>m.content),['Atual']);
});
test('anexos são texto e visão multimodal, com aviso para imagem não disponível',()=>{
  const m={role:'user',content:'Analise',attachments:[{kind:'text',name:'a.txt',text:'TEXTO'},{kind:'image',name:'foto.png',mime:'image/png',data:'data:image/png;base64,YQ=='},{kind:'image',name:'antiga.png'}]};
  const open=C.openAIMessages([m],'SYSTEM');assert.equal(open[0].role,'system');assert.match(open[1].content[0].text,/TEXTO/);assert.match(open[1].content[0].text,/não estão disponíveis/);assert.equal(open[1].content[1].image_url.url,'data:image/png;base64,YQ==');
  const gemini=C.geminiMessages([m]);assert.deepEqual(gemini[0].parts[1],{inlineData:{mimeType:'image/png',data:'YQ=='}});
});
test('uso de tokens Gemini é preservado no backup',()=>assert.equal(C.cleanMessage({role:'assistant',content:'ok',usage:{totalTokenCount:123}}).usage.total_tokens,123));
test('URLs de links não executam código nem carregam credenciais',()=>{
  for(const x of ['javascript:alert(1)','data:text/html,x','file:///etc/passwd','https://user:pw@example.org'])assert.equal(C.safeURL(x),null);
  assert.equal(C.safeURL('https://example.org'),'https://example.org/');
});
test('API remota exige HTTPS e impede chave na URL',()=>{
  for(const x of ['http://example.org/v1','https://key@example.org/v1','https://example.org/v1?key=x','file:///etc/passwd'])assert.throws(()=>C.endpoint(x));
  assert.equal(C.endpoint('http://127.0.0.1:11434/v1/'),'http://127.0.0.1:11434/v1');
});
test('oito identidades distinguem assistência geral de entretenimento',()=>{
  const prompts=Object.values(personas).map(p=>C.buildPrompt(p,{name:'Orlando',length:'brief',shareMemory:false},'PRIVATE_MEMORY',new Date('2026-11-06T12:00:00Z')));
  assert.equal(new Set(prompts).size,8);for(const [i,p]of prompts.entries()){assert.match(p,i===3?/exclusivamente de entretenimento/:/assistente generativo de uso geral/);assert.match(p,/Orlando/);assert.ok(!p.includes('PRIVATE_MEMORY'));}assert.ok(!prompts[3].includes('Você é um assistente generativo de uso geral'));
});
test('novas identidades sobrevivem a backup e restauração com seus autores',()=>{
  assert.deepEqual(C.PERSONA_IDS,Object.keys(personas));
  for(const id of ['veronica','karen','iris','vision']){
    const value=C.cleanState({settings:{persona:id},active:'new-identity',threads:[{id:'new-identity',persona:id,messages:[{id:'u',role:'user',persona:id,content:'Continue'},{id:'a',role:'assistant',persona:id,content:'Resposta preservada'}]}]});
    const imported=C.importState(JSON.parse(JSON.stringify(value)));
    const restored=C.restoreState(C.cleanState(null),imported);
    assert.equal(restored.settings.persona,id);
    assert.equal(restored.threads[0].persona,id);
    assert.deepEqual(restored.threads[0].messages.map(m=>m.persona),[id,id]);
    const branch=C.forkThread(restored.threads[0],0,id);
    assert.equal(branch.persona,id);assert.equal(branch.messages[0].persona,id);
  }
});
test('cada nova identidade chega intacta aos adaptadores sem depender de Jarvis',()=>{
  for(const id of ['veronica','karen','iris','vision']){
    const system=C.buildPrompt(personas[id],{name:'Orlando',length:'brief',shareMemory:false});
    assert.ok(system.includes(personas[id].prompt));
    for(const client of [connection,{provider:'gemini',model:'example-model',key:'TEST'}]){
      const spec=C.requestSpec(client,{...payload,persona:id,system});
      assert.equal(client.provider==='gemini'?spec.body.systemInstruction.parts[0].text:spec.body.messages[0].content,system);
    }
    assert.equal(C.requestSpec({provider:'server',session:'TEST'},{...payload,persona:id,system}).body.persona,id);
  }
  assert.equal(C.cleanMessage({role:'assistant',content:'x',persona:'unknown'}).persona,'jarvis');
});
test('OpenRouter e Gemini recebem o escopo de roast sem restaurar assistência geral',()=>{
  const system=C.buildPrompt(personas.ultron,{name:'Orlando',length:'brief',shareMemory:false});
  const current={...payload,persona:'ultron',system,messages:[{role:'user',content:'Escreva meu código'}]};
  const open=C.requestSpec(connection,current),gemini=C.requestSpec({provider:'gemini',model:'example-model',key:'TEST'},current);
  assert.equal(open.body.messages[0].content,system);assert.equal(gemini.body.systemInstruction.parts[0].text,system);
  assert.match(system,/ESCOPO EXCLUSIVO: Entretenimento/);assert.ok(!system.includes('Você é um assistente generativo de uso geral'));
});
test('memória só entra no prompt com consentimento',()=>{
  assert.match(C.buildPrompt(personas.jarvis,{shareMemory:true},'OPTED_IN'),/OPTED_IN/);
});
test('OpenRouter envia chave em cabeçalho, contexto e modelo escolhidos',()=>{
  const spec=C.requestSpec(connection,payload);assert.equal(spec.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(spec.headers.Authorization,'Bearer TEST_ONLY_SENTINEL');assert.ok(!spec.url.includes('SENTINEL'));assert.equal(spec.body.messages[0].content,'TRUSTED_SYSTEM');assert.equal(spec.body.model,'openrouter/free');assert.equal(spec.body.stream,true);
});
test('restrição gratuita impede modelo pago e não faz fallback',()=>{
  assert.throws(()=>C.requestSpec({...connection,model:'vendor/paid'},payload),/gratuito/);
  assert.equal(C.requestSpec({...connection,model:'vendor/model:free'},payload).body.model,'vendor/model:free');
});
test('Gemini usa endpoint nativo e papel model',()=>{
  const spec=C.requestSpec({provider:'gemini',model:'example-model',key:'GEMINI_TEST'}, {...payload,messages:[{role:'assistant',content:'Resposta'},{role:'user',content:'Continue'}]});
  assert.match(spec.url,/:streamGenerateContent\?alt=sse$/);assert.equal(spec.headers['x-goog-api-key'],'GEMINI_TEST');assert.equal(spec.body.contents[0].role,'model');assert.equal(spec.body.systemInstruction.parts[0].text,'TRUSTED_SYSTEM');
  assert.throws(()=>C.requestSpec({provider:'gemini',model:'../invalid'},payload));
});
test('servidor opcional recebe sessão e a identidade atual',()=>{
  const spec=C.requestSpec({provider:'server',session:'CSRF_TEST'}, {...payload,persona:'ultron'});assert.equal(spec.url,'/api/chat');assert.equal(spec.headers['X-Jarvis-Session'],'CSRF_TEST');assert.equal(spec.body.persona,'ultron');assert.equal(spec.body.web,false);
});
test('SSE preserva UTF-8, comentários, CRLF e eventos multilinha fragmentados',async()=>{
  const result=await collect(response(': keepalive\r\ndata: ação ☕\r\ndata: segunda linha\r\n\r\ndata: [DONE]\r\n\r\n',1));assert.deepEqual(result,['ação ☕\nsegunda linha','[DONE]']);
});
test('SSE entrega último evento ao finalizar o fluxo',async()=>assert.deepEqual(await collect(response('data: final',1)),['final']));
test('stream OpenAI mantém texto, modelo real e uso',async()=>{
  const chunks=[];const result=await C.chat(connection,payload,{fetcher:async()=>response(': OPENROUTER PROCESSING\n\n'+sse(token('Olá, ',{model:'actual-model'}))+sse(token('senhor.'))+sse({choices:[{delta:{},finish_reason:'stop'}],usage:{total_tokens:8}})+'data: [DONE]\n\n'),onToken:t=>chunks.push(t)});
  assert.equal(result.text,'Olá, senhor.');assert.equal(result.model,'actual-model');assert.equal(result.usage.total_tokens,8);assert.deepEqual(chunks,['Olá, ','Olá, senhor.']);
});
test('Gemini ignora raciocínio oculto e preserva conclusão por limite',async()=>{
  const result=await C.chat({provider:'gemini',model:'example-model',key:'TEST'},payload,{fetcher:async()=>response(sse({candidates:[{content:{parts:[{thought:true,text:'HIDDEN'},{text:'Visível'}]},finishReason:'MAX_TOKENS'}],modelVersion:'actual-gemini',usageMetadata:{totalTokenCount:20}}))});assert.equal(result.text,'Visível');assert.equal(result.finishReason,'MAX_TOKENS');assert.equal(result.model,'actual-gemini');
});
test('servidor transmite texto, fontes e metadados sem resposta pronta',async()=>{
  const result=await C.chat({provider:'server',session:'TEST',model:'server-model'},payload,{fetcher:async()=>response(sse({type:'sources',sources:[{title:'Fonte',url:'https://example.org'}]})+sse({type:'delta',text:'Resposta do fluxo'})+sse({type:'done',model:'actual',finishReason:'length',usage:{total_tokens:12}}))});assert.equal(result.text,'Resposta do fluxo');assert.equal(result.model,'actual');assert.equal(result.sources.length,1);assert.equal(result.usage.total_tokens,12);assert.equal(result.finishReason,'length');
});
test('queda de streaming não vira resposta completa',async()=>{
  await assert.rejects(C.chat(connection,payload,{fetcher:async()=>response(sse(token('Parcial')))}),e=>e.partialText==='Parcial'&&/antes/.test(e.message));
});
test('erro após primeiro token conserva a resposta parcial',async()=>{
  await assert.rejects(C.chat(connection,payload,{fetcher:async()=>response(sse(token('Parcial'))+sse({error:{message:'RAW_SECRET'}}))}),e=>e.partialText==='Parcial'&&!e.message.includes('RAW_SECRET'));
});
test('interrupção do usuário conserva texto parcial',async()=>{
  const abort=new AbortController();await assert.rejects(C.chat(connection,payload,{signal:abort.signal,fetcher:async()=>response(sse(token('Parcial'))+'data: [DONE]\n\n',1),onToken:()=>abort.abort()}),e=>e.name==='AbortError'&&e.partialText==='Parcial');
});
test('evento malformado é relatado',async()=>assert.rejects(C.chat(connection,payload,{fetcher:async()=>response('data: INVALID\n\n')}),/inválido/));
test('resposta sem texto não cria saudação artificial',async()=>assert.rejects(C.chat(connection,payload,{fetcher:async()=>response('data: [DONE]\n\n')}),/sem texto/));
test('HTTP de cota e erro de rede têm mensagens acionáveis',async()=>{
  await assert.rejects(C.chat(connection,payload,{fetcher:async()=>new Response('RAW_SECRET',{status:429})}),e=>/cota/.test(e.message)&&!e.message.includes('RAW_SECRET'));
  await assert.rejects(C.chat(connection,payload,{fetcher:async()=>{throw new TypeError('Failed to fetch');}}),/CORS/);
});
test('API compatível pode retornar JSON sem streaming',async()=>{
  const result=await C.chat({provider:'compatible',model:'custom',base:'https://example.org/v1'},payload,{fetcher:async()=>Response.json({choices:[{message:{content:'JSON real'},finish_reason:'length'}],model:'actual-custom'})});assert.equal(result.text,'JSON real');assert.equal(result.finishReason,'length');assert.equal(result.model,'actual-custom');
});
test('resposta JSON acima do limite é parcial e explícita',async()=>assert.rejects(C.chat(connection,payload,{fetcher:async()=>Response.json({choices:[{message:{content:'a'.repeat(C.MAX_OUTPUT+1)}}]})}),e=>e.partialText.length===C.MAX_OUTPUT&&/limite/.test(e.message)));
test('lista OpenRouter inclui apenas variantes sem preço e sem fallback pago',async()=>{
  const result=await C.models('openrouter','',{fetcher:async()=>Response.json({data:[{id:'a:free',pricing:{prompt:'0',completion:'0'}},{id:'b:free',pricing:{prompt:'0.1',completion:'0'}},{id:'paid',pricing:{prompt:'1',completion:'1'}}]})});assert.deepEqual(result.map(m=>m.id),['openrouter/free','a:free']);
});
test('lista Gemini usa chave no cabeçalho e retorna somente modelos de geração',async()=>{
  let request;const result=await C.models('gemini','GEMINI_TEST',{fetcher:async(url,options)=>{request={url,options};return Response.json({models:[{name:'models/chat-example',displayName:'Chat',supportedGenerationMethods:['generateContent']},{name:'models/embed',supportedGenerationMethods:['embedContent']}]});}});
  assert.equal(request.options.headers['x-goog-api-key'],'GEMINI_TEST');assert.ok(!request.url.includes('GEMINI_TEST'));assert.deepEqual(result.map(m=>m.id),['chat-example']);
});
