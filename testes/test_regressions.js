'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../fonte/core.js');
const connection={provider:'compatible',base:'https://example.org/v1',model:'test'};
const payload={system:'system',preferences:{},messages:[{role:'user',content:'Olá'}]};
const data=v=>'data: '+JSON.stringify(v)+'\n\n';
function stream(text,{open=false,onCancel=()=>{}}={}){
  return new Response(new ReadableStream({start(c){const b=new TextEncoder().encode(text);for(let i=0;i<b.length;i+=4096)c.enqueue(b.slice(i,i+4096));if(!open)c.close();},cancel:onCancel}),{headers:{'content-type':'text/event-stream'}});
}
for(const provider of ['compatible','server'])test(provider+': conclusão libera um fluxo que permanece aberto',async()=>{
  let canceled=false;
  const source=provider==='server'?data({type:'delta',text:'Concluído'})+data({type:'done',model:'test'}):data({choices:[{delta:{content:'Concluído'}}]})+'data: [DONE]\n\n';
  const result=await C.chat({...connection,provider},payload,{fetcher:async()=>stream(source,{open:true,onCancel:()=>canceled=true})});
  assert.equal(result.text,'Concluído');assert.equal(canceled,true);
});
test('limite considera todas as linhas de um evento SSE',async()=>{
  const r=stream(('data: '+'x'.repeat(10000)+'\n').repeat(61)+'\n');
  await assert.rejects(async()=>{for await(const x of C.events(r.body))void x;},/extenso/);
});
test('overflow em streaming conserva no máximo 60 mil caracteres',async()=>{
  const r=stream(data({choices:[{delta:{content:'x'.repeat(59999)}}]})+data({choices:[{delta:{content:'mais dez caracteres'}}]}));
  await assert.rejects(C.chat(connection,payload,{fetcher:async()=>r}),e=>e.partialText.length===60000&&/limite/.test(e.message));
});
test('JSON inválido não expõe o corpo nem é apresentado como erro de rede',async()=>{
  for(const body of ['{PRIVATE_KEY_SENTINEL', 'null','[]','{"candidates":4}']){
    await assert.rejects(C.chat(connection,payload,{fetcher:async()=>new Response(body,{headers:{'content-type':'application/json'}})}),e=>!e.message.includes('PRIVATE_KEY_SENTINEL')&&!e.message.includes('CORS'));
  }
});
test('leitura JSON tem limite independente do tamanho do texto gerado',async()=>{
  await assert.rejects(C.chat(connection,payload,{fetcher:async()=>Response.json({padding:'x'.repeat(1100000),choices:[]})}),/limite de leitura/);
});
test('JSON abortado não se transforma em resposta concluída',async()=>{
  const abort=new AbortController();abort.abort();
  await assert.rejects(C.chat(connection,payload,{signal:abort.signal,fetcher:async()=>Response.json({choices:[{message:{content:'Ignorar'}}]})}),e=>e.name==='AbortError');
});
test('anexos grandes são recusados antes de montar a requisição',()=>{
  assert.throws(()=>C.contextMessages([{role:'user',content:'Analise',attachments:[{kind:'text',name:'a',text:'x'.repeat(60000)},{kind:'text',name:'b',text:'y'.repeat(60000)}]}]),/100 mil/);
});
test('contexto multimodal mantém quatro imagens recentes sem modificar originais',()=>{
  const messages=Array.from({length:6},(_,i)=>({role:'user',content:'Foto '+i,attachments:[{id:String(i),kind:'image',name:'foto.png',data:'data:image/png;base64,YQ=='}]}));
  const result=C.contextMessages(messages);
  assert.deepEqual(result.filter(m=>m.attachments[0].data).map(m=>m.content),['Foto 2','Foto 3','Foto 4','Foto 5']);
  assert.equal(result[0].attachments[0].omitted,'context_limit');assert.ok(messages.every(m=>m.attachments[0].data));
  assert.match(C.openAIMessages(result,'s')[1].content,/limite de imagens/);
});
test('gerar alternativa cria um ramo e exclui a resposta substituída do contexto',()=>{
  const thread=C.cleanState({threads:[{id:'original',title:'Teste',messages:[{role:'user',content:'Pergunta'},{role:'assistant',content:'Resposta original'}]}]}).threads[0];
  const branch=C.forkThread(thread,0,'friday');
  assert.notEqual(branch.id,thread.id);assert.equal(thread.messages.length,2);assert.equal(branch.messages.length,1);assert.equal(branch.persona,'friday');assert.notEqual(branch.messages[0].id,thread.messages[0].id);
  branch.messages[0].content='Editada';assert.equal(thread.messages[0].content,'Pergunta');
});
test('mudança de endpoint compatível exige uma chave nova',()=>{
  const previous={provider:'compatible',base:'https://one.example/v1',key:'PRIVATE'};
  assert.equal(C.connectionKey(previous,'compatible','https://one.example/v1'),'PRIVATE');
  assert.equal(C.connectionKey(previous,'compatible','https://two.example/v1'),'');
  assert.equal(C.connectionKey(previous,'gemini',''),'');
  assert.equal(C.connectionKey(previous,'compatible','https://two.example/v1',' NEW '),'NEW');
});
test('restauração não ativa retenção, compartilhamento ou cópia automática por backup',()=>{
  const imported={version:4,settings:{keepHistory:true,shareMemory:true,autoBackup:true},threads:[{id:'t',messages:[]}]};
  const restored=C.restoreState(C.cleanState(null),imported);
  assert.equal(restored.settings.keepHistory,false);assert.equal(restored.settings.shareMemory,false);assert.equal(restored.settings.autoBackup,false);assert.equal(restored.active,'t');
  assert.equal(C.restoreState({settings:{keepHistory:true}},imported).settings.keepHistory,true);
});
test('timestamps não finitos são reparados antes de exportar JSON',()=>{
  const value=C.cleanState({threads:[{at:Infinity,messages:[{at:Infinity,role:'user',content:'Oi'}]}]});
  assert.ok(Number.isFinite(value.threads[0].at));assert.ok(Number.isFinite(value.threads[0].messages[0].at));
});
test('lista de modelos malformada tem erro útil e não revela corpo',async()=>{
  await assert.rejects(C.models('openrouter','',{fetcher:async()=>Response.json({data:{secret:'PRIVATE_SENTINEL'}})}),e=>/inválida/.test(e.message)&&!e.message.includes('PRIVATE_SENTINEL'));
});

test('Gemini encerra ao receber finishReason mesmo com conexão aberta',async()=>{
  let canceled=false;const result=await C.chat({provider:'gemini',key:'TEST',model:'fixture'},payload,{fetcher:async()=>stream(data({candidates:[{content:{parts:[{text:'Concluído'}]},finishReason:'STOP'}]}),{open:true,onCancel:()=>canceled=true})});
  assert.equal(result.text,'Concluído');assert.equal(canceled,true);
});
test('interrupção no mesmo bloco de rede prevalece sobre DONE',async()=>{
  const abort=new AbortController();
  await assert.rejects(C.chat(connection,payload,{signal:abort.signal,fetcher:async()=>stream(data({choices:[{delta:{content:'Parcial'}}]})+'data: [DONE]\n\n'),onToken:()=>abort.abort()}),e=>e.name==='AbortError'&&e.partialText==='Parcial');
});
test('backup inválido ou acima dos limites não é truncado silenciosamente',()=>{
  for(const value of [{version:4}, {version:4,settings:{},threads:[{messages:[{role:'user',content:'x'.repeat(60001)}]}]},{version:4,settings:{},threads:Array.from({length:41},()=>({messages:[]}))}])assert.throws(()=>C.importState(value),/inválid|limites/);
});

test('backup com IDs de mensagem repetidos mantém autores e conteúdo com IDs únicos',()=>{
  const input={version:4,settings:{},active:'t',threads:[{id:'t',messages:[{id:'same',role:'user',persona:'jarvis',content:'Primeira'},{id:'same',role:'assistant',persona:'friday',content:'Segunda'},{id:'same',role:'user',persona:'iris',content:'Terceira'}]}]};
  const result=C.importState(input).threads[0].messages;
  assert.equal(new Set(result.map(m=>m.id)).size,3);
  assert.deepEqual(result.map(m=>[m.content,m.persona]),[['Primeira','jarvis'],['Segunda','friday'],['Terceira','iris']]);
  assert.equal(result[0].id,'same');assert.deepEqual(input.threads[0].messages.map(m=>m.id),['same','same','same']);
});
test('normalização preserva IDs válidos e estabiliza o backup reparado',()=>{
  const original={threads:[{id:'t',messages:[{id:'a',role:'user',content:'Oi'},{id:'b',role:'assistant',content:'Olá'}]}]};
  const valid=C.cleanState(original);assert.deepEqual(valid.threads[0].messages.map(m=>m.id),['a','b']);
  const repaired=C.cleanState({threads:[{id:'t',messages:[{id:'same',role:'user',content:'Oi'},{id:'same',role:'assistant',content:'Olá'}]}]});
  assert.deepEqual(C.cleanState(JSON.parse(JSON.stringify(repaired))),repaired);
});
function oneChunk(text){return new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close();}});}
async function collectEvents(body){const values=[];for await(const value of C.events(body))values.push(value);return values;}
test('bloco de rede acima de 600 KB pode conter muitos eventos SSE pequenos',async()=>{
  const text=('data: '+'a'.repeat(300)+'\n\n').repeat(2100);
  assert.ok(new TextEncoder().encode(text).length>600000);
  const values=await collectEvents(oneChunk(text));assert.equal(values.length,2100);assert.ok(values.every(v=>v==='a'.repeat(300)));
});
test('fronteiras dos pacotes não alteram o resultado de um fluxo SSE grande',async()=>{
  const text=Array.from({length:2300},(_,i)=>'data: '+i+'-'+'x'.repeat(270)+'\r\n\r\n').join('');
  const bytes=new TextEncoder().encode(text),expected=Array.from({length:2300},(_,i)=>i+'-'+'x'.repeat(270));
  for(const chunk of [127,8192,bytes.length]){
    const body=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=chunk)c.enqueue(bytes.slice(i,i+chunk));c.close();}});
    assert.deepEqual(await collectEvents(body),expected);
  }
});
test('evento SSE individual excessivo continua recusado e libera o leitor',async()=>{
  for(const chunk of [8192,700000]){
    let canceled=false;const bytes=new TextEncoder().encode('data: '+'x'.repeat(600001)+'\n\n');
    const body=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=chunk)c.enqueue(bytes.slice(i,i+chunk));},cancel(){canceled=true;}});
    await assert.rejects(collectEvents(body),/extenso/);assert.equal(canceled,true);assert.equal(body.locked,false);
  }
});
test('comentários e campos SSE não são confundidos com um evento de dados enorme',async()=>{
  const text=(':'+ 'keepalive '.repeat(35)+'\n').repeat(2000)+'event: message\nid: 7\ndata: resposta\n\n';
  assert.ok(new TextEncoder().encode(text).length>600000);
  assert.deepEqual(await collectEvents(oneChunk(text)),['resposta']);
});
test('preço ausente, nulo ou inválido não é classificado como gratuito',async()=>{
  const unknown=[null,undefined,false,true,'',' ','free','0x0',{},[]],models=[];
  for(const [i,value]of unknown.entries())for(const side of ['prompt','completion'])models.push({id:'unknown-'+i+'-'+side+':free',pricing:{prompt:0,completion:0,[side]:value}});
  const result=await C.models('openrouter','',{fetcher:async()=>Response.json({data:models})});
  assert.deepEqual(result.map(m=>m.id),['openrouter/free']);
});
test('preços zero explícitos em formatos decimais continuam disponíveis',async()=>{
  const zeros=[0,'0','0.0','0.000000',' 0 ','0e0','.0'];
  const result=await C.models('openrouter','',{fetcher:async()=>Response.json({data:zeros.map((price,i)=>({id:'zero-'+i+':free',pricing:{prompt:price,completion:price}}))})});
  assert.deepEqual(result.map(m=>m.id),['openrouter/free',...zeros.map((_,i)=>'zero-'+i+':free')]);
});
