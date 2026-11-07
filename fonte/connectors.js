/* Protocolos de conversa. Sem SDK externo, execução de ferramentas ou retry pago. */
(function(root,factory){const catalog=typeof module==='object'&&module.exports?require('../api-presets.json'):/* CATALOG */ {};const api=factory(catalog);if(typeof module==='object'&&module.exports)module.exports=api;else root.FusionConnectors=api;})(typeof globalThis!=='undefined'?globalThis:this,function(PRESETS){
  'use strict';
  const PROTOCOLS=['chat','responses','anthropic','gemini','ollama'],AUTHS=['bearer','anthropic','api-key','google','none'];
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  function protocol(c){return PROTOCOLS.includes(c.protocol)?c.protocol:PRESETS[c.provider]?.protocol||'chat';}
  function normalizeBase(value,kind,validate){
    let base=validate(value);const tails={chat:'/chat/completions',responses:'/responses',anthropic:'/messages',gemini:'',ollama:'/api/chat'};
    const tail=tails[kind];if(tail&&base.endsWith(tail))base=base.slice(0,-tail.length);
    if(kind==='ollama'&&base.endsWith('/api'))base=base.slice(0,-4);
    return base;
  }
  function extraHeaders(value){
    if(value==null||value==='')return {};let data=value;
    if(typeof value==='string'){if(value.length>8000)throw Error('Os cabeçalhos adicionais excedem 8 mil caracteres.');try{data=JSON.parse(value);}catch{throw Error('Informe os cabeçalhos adicionais como um objeto JSON válido.');}}
    if(!record(data)||Object.keys(data).length>20)throw Error('Use um objeto JSON com até vinte cabeçalhos.');
    const clean={};for(const [key,item]of Object.entries(data)){
      if(!/^(?:x-[a-z0-9-]+|anthropic-workspace-id|anthropic-beta|openai-organization|openai-project)$/i.test(key)||typeof item!=='string'||item.length>2000||/[\r\n]/.test(item))throw Error('Cabeçalho adicional inválido. Use nomes X-… ou os campos de organização/projeto aceitos, com valores de texto.');
      clean[key.toLowerCase()]=item;
    }return clean;
  }
  function authHeaders(c){
    const kind=protocol(c),auth=AUTHS.includes(c.auth)?c.auth:PRESETS[c.provider]?.auth||'bearer',headers=extraHeaders(c.headers);
    const key=typeof c.key==='string'?c.key.trim():'';
    if(/[\r\n]/.test(key)||key.length>4096)throw Error('A chave contém caracteres inválidos ou é extensa demais.');
    if(key&&auth!=='none')headers[auth==='anthropic'?'x-api-key':auth==='google'?'x-goog-api-key':auth==='api-key'?'api-key':'Authorization']=auth==='bearer'?'Bearer '+key:key;
    if(kind==='anthropic'){headers['anthropic-version']='2023-06-01';headers['anthropic-dangerous-direct-browser-access']='true';}
    return headers;
  }
  const imageParts=m=>(m.attachments||[]).map(a=>({a,match:/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(a.data||'')})).filter(x=>x.a.kind==='image'&&x.match);
  const textParts=v=>typeof v==='string'?v:Array.isArray(v)?v.filter(p=>p&&['text','output_text','refusal'].includes(p.type)).map(p=>p.text||p.refusal||'').join(''):'';
  const responseText=v=>typeof v.output_text==='string'?v.output_text:(Array.isArray(v.output)?v.output:[]).filter(p=>p?.type==='message').map(p=>textParts(p.content)).join('');
  function usageSum(v){if(!record(v))return null;const total=v.total_tokens??v.totalTokenCount;if(Number.isFinite(total))return {...v,total_tokens:total};const a=v.input_tokens??v.prompt_tokens??0,b=v.output_tokens??v.completion_tokens??0;return {...v,...(Number.isFinite(a)&&Number.isFinite(b)?{total_tokens:a+b}:{})};}
  function blocked(reason){return ['SAFETY','BLOCKLIST','PROHIBITED_CONTENT','content_filter','error','malformed_function_call','MALFORMED_FUNCTION_CALL'].includes(reason);}
  function extractSources(value,safeURL){
    if(!record(value))return [];const rows=[],array=v=>Array.isArray(v)?v:[];
    for(const row of array(value.citations).concat(array(value.search_results),array(value.sources)).slice(0,100))rows.push(typeof row==='string'?{url:row}:row);
    if(value.annotation)rows.push(value.annotation);
    for(const item of array(value.output).slice(0,100)){
      for(const row of array(item?.action?.sources))rows.push(row);
      for(const part of array(item?.content))for(const row of array(part?.annotations))rows.push(row.url_citation||row);
    }
    const result=[],seen=new Set();for(const row of rows){if(!record(row)||typeof row.url!=='string'||row.url.length>2000)continue;const url=safeURL(row.url);if(!url||seen.has(url))continue;seen.add(url);result.push({url,title:typeof row.title==='string'?row.title.slice(0,180):url});if(result.length===8)break;}return result;
  }
  function createClient(U){
    const {endpoint,safeURL,openAIMessages,geminiMessages,attachmentText,readJSON,events,errorMessage,MAX_OUTPUT}=U;
    const baseOf=c=>normalizeBase(c.base||PRESETS[c.provider]?.base||'',protocol(c),endpoint);
    function requestSpec(c,p){
      const custom=p.preferences?.maxOutputTokens,max=Number.isInteger(custom)&&custom>=256&&custom<=32768?custom:p.preferences?.length==='brief'?1024:p.preferences?.length==='detailed'?4096:2048,stream=c.stream!==false;
      if(c.provider==='server')return {url:'/api/chat',headers:{'Content-Type':'application/json','X-Jarvis-Session':c.session},body:{message:p.messages[p.messages.length-1]?.content||'',messages:p.messages,system:p.system,persona:p.persona,preferences:{...p.preferences,history:true},history:p.messages.slice(0,-1),memory:p.memory||'',web:false},kind:'server'};
      const kind=protocol(c),base=baseOf(c),headers={'Content-Type':'application/json',...authHeaders(c)};
      if(c.provider==='openrouter'&&c.freeOnly!==false&&c.model!=='openrouter/free'&&!c.model?.endsWith(':free'))throw Error('O modo gratuito aceita somente openrouter/free ou modelos :free.');
      if(kind==='gemini'){
        const model=String(c.model||'').replace(/^models\//,'');if(!/^[\w.-]{1,160}$/.test(model))throw Error('Escolha um modelo Gemini válido.');
        return {kind,url:base+'/models/'+encodeURIComponent(model)+(stream?':streamGenerateContent?alt=sse':':generateContent'),headers,body:{systemInstruction:{parts:[{text:p.system}]},contents:geminiMessages(p.messages),generationConfig:{maxOutputTokens:max}}};
      }
      if(kind==='responses')return {kind,url:base+'/responses',headers,body:{model:c.model,instructions:p.system,store:false,stream,max_output_tokens:max,input:p.messages.map(m=>({role:m.role,content:[{type:m.role==='assistant'?'output_text':'input_text',text:attachmentText(m)},...imageParts(m).map(x=>({type:'input_image',image_url:x.a.data}))]}))}};
      if(kind==='anthropic')return {kind,url:base+'/messages',headers,body:{model:c.model,system:p.system,max_tokens:max,stream,messages:p.messages.map(m=>({role:m.role,content:[{type:'text',text:attachmentText(m)},...imageParts(m).map(x=>({type:'image',source:{type:'base64',media_type:'image/'+x.match[1],data:x.match[2]}}))]}))}};
      if(kind==='ollama')return {kind,url:base+'/api/chat',headers,body:{model:c.model,stream,messages:[{role:'system',content:p.system},...p.messages.map(m=>({role:m.role,content:attachmentText(m),...(imageParts(m).length?{images:imageParts(m).map(x=>x.match[2])}:{})}))],options:{num_predict:max}}};
      const messages=openAIMessages(p.messages,p.system);if(c.systemRole==='developer')messages[0].role='developer';if(c.systemRole==='user')messages[0].role='user';
      const field=['max_tokens','max_completion_tokens','none'].includes(c.tokenParam)?c.tokenParam:PRESETS[c.provider]?.tokenParam||'max_tokens';
      return {kind,url:base+'/chat/completions',headers,body:{model:c.model,messages,stream,...(field==='none'?{}:{[field]:max})}};
    }
    async function* ndjson(body,signal){
      if(!body?.getReader)throw Error('O navegador não oferece leitura de respostas em streaming.');
      const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
      try{while(true){if(signal?.aborted)throw new DOMException('Interrompido','AbortError');const part=await reader.read();buffer+=decoder.decode(part.value||new Uint8Array(),{stream:!part.done});let pos;
        while((pos=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,pos).trim();buffer=buffer.slice(pos+1);if(line.length>600000)throw Error('Evento de resposta extenso demais.');if(line)yield line;}
        if(buffer.length>600000)throw Error('Evento de resposta extenso demais.');if(part.done){if(buffer.trim())yield buffer.trim();break;}
      }}finally{try{await reader.cancel();}catch{}reader.releaseLock();}
    }
    async function chat(c,p,{onToken=()=>{},onMeta=()=>{},signal,fetcher=fetch}={}){
      let text='',model=c.model,usage=null,finished=false,finishReason='',sources=[],anthropicUsage={};
      const add=delta=>{if(typeof delta==='string'&&delta){text+=delta;if(text.length>MAX_OUTPUT){text=text.slice(0,MAX_OUTPUT);throw Error('A resposta excedeu o limite de segurança do aplicativo.');}onToken(text);}};
      const check=()=>{if(signal?.aborted)throw new DOMException('Interrompido','AbortError');};
      function process(v,kind,json=false){
        if(!record(v))throw Error('O serviço enviou um formato de resposta inválido.');
        sources=sources.concat(extractSources(v.response||v,safeURL)).filter((row,index,list)=>list.findIndex(item=>item.url===row.url)===index).slice(0,8);
        if(v.error||['error','response.failed','response.error'].includes(v.type)||v.status==='failed')throw Error(kind==='server'&&typeof v.error==='string'?v.error:'O provedor interrompeu a resposta. Verifique a conexão, o modelo e a cota.');
        let delta='';
        if(kind==='server'){if(v.type==='delta')delta=v.text||'';if(v.type==='done'){finished=true;model=v.model||model;usage=v.usage||usage;finishReason=v.finishReason||'';}if(v.type==='sources')sources=extractSources(v,safeURL);}
        else if(kind==='gemini'){
          if(v.promptFeedback?.blockReason)throw Error('O provedor não pôde responder a esse pedido.');const candidate=v.candidates?.[0];delta=(candidate?.content?.parts||[]).filter(x=>!x.thought).map(x=>x.text||'').join('');
          if(candidate?.finishReason){finished=true;finishReason=candidate.finishReason;}usage=v.usageMetadata||usage;model=v.modelVersion||model;if(json)finished=true;
        }else if(kind==='responses'){
          const full=v.response||v;model=full.model||model;usage=full.usage||usage;
          if(['response.output_text.delta','response.refusal.delta'].includes(v.type))delta=v.delta||'';
          if(json||['response.completed','response.incomplete'].includes(v.type)){
            const final=responseText(full);if(final&&!text)delta=final;finished=true;finishReason=full.status==='incomplete'||v.type==='response.incomplete'?(full.incomplete_details?.reason==='max_output_tokens'?'length':full.incomplete_details?.reason||'incomplete'):'stop';
          }
        }else if(kind==='anthropic'){
          if(v.type==='message_start'){model=v.message?.model||model;anthropicUsage={...anthropicUsage,...v.message?.usage};}
          if(v.type==='content_block_delta'&&v.delta?.type==='text_delta')delta=v.delta.text||'';
          if(v.type==='message_delta'){finishReason=v.delta?.stop_reason||finishReason;anthropicUsage={...anthropicUsage,...v.usage};}
          if(v.type==='message_stop')finished=true;
          if(json){delta=textParts(v.content);model=v.model||model;finishReason=v.stop_reason||'stop';anthropicUsage=v.usage||{};finished=true;}usage=usageSum(anthropicUsage);
        }else if(kind==='ollama'){
          delta=v.message?.content||'';model=v.model||model;if(v.done===true){finished=true;finishReason=v.done_reason||'stop';usage=usageSum({input_tokens:v.prompt_eval_count||0,output_tokens:v.eval_count||0});}
        }else{
          const choice=v.choices?.[0];delta=textParts(json?choice?.message?.content:choice?.delta?.content);model=v.model||model;usage=v.usage||usage;
          if(choice?.finish_reason){finished=true;finishReason=choice.finish_reason;}if(json)finished=true;
        }
        if(blocked(finishReason))throw Error('O provedor interrompeu a resposta para este pedido.');add(delta);usage=usageSum(usage);onMeta({model,usage,finishReason});
        return finished&&(json||['server','gemini','responses','anthropic','ollama'].includes(kind));
      }
      try{
        const spec=requestSpec(c,p);let r;
        try{r=await fetcher(spec.url,{method:'POST',headers:spec.headers,body:JSON.stringify(spec.body),credentials:c.provider==='server'?'same-origin':'omit',redirect:'error',signal});}
        catch(e){if(e instanceof TypeError)throw Error('Não consegui alcançar a API. Confira internet, endereço e acesso do navegador (CORS). Se o provedor bloquear acesso direto, use o servidor opcional com a chave configurada nele.');throw e;}check();
        if(!r.ok)throw Error(errorMessage(r.status,c.provider));const mime=(r.headers.get('content-type')||'').toLowerCase();
        if(mime.includes('text/event-stream')||mime.includes('ndjson')||mime.includes('jsonl')){
          const iterator=mime.includes('text/event-stream')?events(r.body,signal):ndjson(r.body,signal);
          for await(const raw of iterator){check();if(raw==='[DONE]'){if(spec.kind==='chat'){finished=true;break;}continue;}let v;try{v=JSON.parse(raw);}catch{throw Error('O serviço enviou um evento inválido.');}if(process(v,spec.kind))break;}
        }else process(await readJSON(r,1024*1024,signal),spec.kind,true);
        check();if(!text.trim())throw Error('O modelo respondeu sem texto. Confira se é um modelo de conversa; esta integração não executa chamadas de ferramentas.');
        if(!finished)throw Error('A conexão terminou antes de o modelo concluir.');return {text,model,usage,finishReason,sources};
      }catch(error){if(error instanceof TypeError)error=Error('O serviço enviou um formato de resposta inválido.');if(!error||typeof error!=='object')error=Error('Falha ao ler a resposta do serviço.');error.partialText=text;error.model=model;throw error;}
    }
    const zero=value=>typeof value==='number'?value===0:typeof value==='string'&&/^(?:0+(?:\.0*)?|\.0+)(?:e[+-]?\d+)?$/i.test(value.trim());
    async function models(provider,key,{fetcher=fetch,signal,base,protocol:kind,auth,headers,freeOnly=true}={}){
      const c={provider,key,base,protocol:kind,auth,headers},type=protocol(c);if(provider==='server')return [];
      if(type==='gemini'&&!key)throw Error('Informe uma chave Gemini para consultar os modelos da conta.');
      const root=baseOf(c),h=authHeaders(c),url=type==='ollama'?root+'/api/tags':type==='gemini'?root+'/models?pageSize=1000':root+'/models';
      const result=[],seen=new Set();let next=url;
      for(let page=0;page<10&&next;page++){
        const r=await fetcher(next,{headers:h,credentials:'omit',redirect:'error',signal});if(!r.ok)throw Error(r.status===404?'Este endpoint não oferece uma lista de modelos. Informe o ID manualmente.':errorMessage(r.status,provider));const data=await readJSON(r,8*1024*1024,signal);
        const items=type==='ollama'?data.models:type==='gemini'?data.models:data.data;if(!Array.isArray(items))throw Error('A lista de modelos recebida é inválida.');
        for(const m of items){if(!record(m))continue;const id=type==='gemini'?m.name?.replace(/^models\//,''):type==='ollama'?m.model||m.name:m.id;
          if(typeof id!=='string'||!id.trim()||id.length>180||/[\u0000-\u001f\u007f]/.test(id)||seen.has(id))continue;
          if(type==='gemini'&&(!Array.isArray(m.supportedGenerationMethods)||!m.supportedGenerationMethods.includes('generateContent')))continue;
          if(provider==='openrouter'&&freeOnly&&!(id.endsWith(':free')&&zero(m.pricing?.prompt)&&zero(m.pricing?.completion)))continue;
          seen.add(id);result.push({id,name:typeof(m.displayName||m.name||m.display_name)==='string'?(m.displayName||m.name||m.display_name).slice(0,250):id});if(result.length>=2000)break;
        }
        if(result.length>=2000)break;
        if(type==='gemini'&&typeof data.nextPageToken==='string'&&data.nextPageToken.length<=2000)next=url+'&pageToken='+encodeURIComponent(data.nextPageToken);
        else if(type==='anthropic'&&data.has_more===true&&typeof data.last_id==='string')next=url+'?after_id='+encodeURIComponent(data.last_id);else next='';
      }
      if(provider==='openrouter'&&freeOnly)return [{id:'openrouter/free',name:'Free Router · seleção automática'},...result.filter(m=>m.id!=='openrouter/free')];return result;
    }
    return {requestSpec,chat,models,ndjson,baseOf};
  }
  return {PRESETS,PROTOCOLS,AUTHS,protocol,normalizeBase,authHeaders,extraHeaders,textParts,responseText,usageSum,extractSources,createClient};
});
