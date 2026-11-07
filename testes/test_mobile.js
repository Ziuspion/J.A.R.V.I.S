/* Regressões de teclado, viewport, retorno à página e navegadores sem APIs recentes. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../fonte/platform.js');
test('viewport de telefone conserva a área visível inteira',()=>{
  assert.deepEqual(P.viewportMetrics({layoutHeight:844,height:844}),{height:844,top:0,gap:0,keyboard:false});
});
test('teclado que reduz somente o viewport visual deixa o compositor acima dele',()=>{
  assert.deepEqual(P.viewportMetrics({layoutHeight:844,height:470,editing:true,baselineHeight:844}),{height:470,top:0,gap:374,keyboard:true});
});
test('deslocamento do viewport no Safari é descontado uma única vez',()=>{
  assert.deepEqual(P.viewportMetrics({layoutHeight:844,height:440,offsetTop:54,editing:true}),{height:440,top:54,gap:350,keyboard:true});
});
test('teclado que também reduz o layout usa a altura anterior como referência',()=>{
  assert.deepEqual(P.viewportMetrics({layoutHeight:420,height:420,baselineHeight:844,editing:true}),{height:420,top:0,gap:0,keyboard:true});
});
test('zoom de pinça não encolhe nem reposiciona a aplicação',()=>{
  assert.equal(P.viewportMetrics({layoutHeight:844,height:422,scale:2,editing:true}),null);
  assert.equal(P.viewportMetrics({layoutHeight:844,height:920,scale:.8}),null);
});
test('modo paisagem sem edição mantém os controles e o crédito',()=>{
  assert.equal(P.viewportMetrics({layoutHeight:390,height:390,baselineHeight:844,editing:false}).keyboard,false);
});
test('métricas transitórias inválidas não produzem alturas negativas nem NaN',()=>{
  assert.deepEqual(P.viewportMetrics({layoutHeight:640,height:0,offsetTop:-100}),{height:640,top:0,gap:0,keyboard:false});
  assert.deepEqual(P.viewportMetrics({layoutHeight:640,height:900,offsetTop:NaN}),{height:640,top:0,gap:0,keyboard:false});
  assert.deepEqual(P.viewportMetrics({layoutHeight:NaN,height:650,offsetTop:900}),{height:650,top:0,gap:0,keyboard:false});
});
test('arredondamento e offset excessivo nunca fazem a interface ultrapassar o viewport',()=>{
  const x=P.viewportMetrics({layoutHeight:844,height:439.8,offsetTop:900,editing:true});
  assert.ok(x.height+x.top<=844);assert.equal(x.gap,0);assert.equal(x.keyboard,true);
});
test('Enter envia no desktop e Shift Enter mantém nova linha',()=>{
  assert.equal(P.submitOnEnter({key:'Enter'}),true);assert.equal(P.submitOnEnter({key:'Enter',shiftKey:true}),false);
});
test('Enter do teclado de toque mantém a nova linha sem enviar por acidente',()=>{
  assert.equal(P.submitOnEnter({key:'Enter'},true),false);assert.equal(P.submitOnEnter({key:'a'},false),false);
});
test('composição IME, inclusive o código legado 229, não dispara envio',()=>{
  assert.equal(P.submitOnEnter({key:'Enter',isComposing:true}),false);
  assert.equal(P.submitOnEnter({key:'Enter',keyCode:229}),false);
});
test('gerar alternativa encontra a última pergunta sem Array.findLastIndex',()=>{
  const messages=[{role:'user'},{role:'assistant'},{role:'user'},{role:'assistant'}];messages.findLastIndex=undefined;
  assert.equal(P.lastUserIndex(messages),2);assert.equal(P.lastUserIndex([]),-1);assert.equal(P.lastUserIndex([{role:'assistant'}]),-1);
});
test('consulta com prazo funciona sem AbortSignal.timeout e conserva as opções da requisição',async()=>{
  let sent;const result=await P.timedJSON(async(url,options)=>{sent={url,options};return {ok:true,json:async()=>({ready:true})};},'/api/config',{credentials:'same-origin'},200);
  assert.deepEqual(result.value,{ready:true});assert.equal(sent.options.credentials,'same-origin');assert.equal(sent.url,'/api/config');assert.equal(sent.options.signal.aborted,false);
});
test('prazo também interrompe a leitura do corpo JSON e não só a chegada dos cabeçalhos',async()=>{
  await assert.rejects(P.timedJSON(async(_,o)=>({json:()=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Object.assign(Error('timeout'),{name:'AbortError'})),{once:true}))}),'/slow',{},15),{name:'AbortError'});
});
test('falha de JSON preserva o erro do conteúdo',async()=>{
  await assert.rejects(P.timedJSON(async()=>({json:async()=>{throw new SyntaxError('bad json');}}),'/bad',{},100),SyntaxError);
});

function harness({visual=true,mobile=true}={}){
  const events=()=>{const listeners=new Map();return {addEventListener(k,fn){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(fn);},removeEventListener(k,fn){listeners.get(k)?.delete(fn);},emit(k){for(const fn of listeners.get(k)||[])fn();},count(){return [...listeners.values()].reduce((n,s)=>n+s.size,0);}};};
  let callback=null,changes=0;const values=new Map(),classes=new Set(),media={matches:mobile};
  const win=Object.assign(events(),{innerHeight:844,visualViewport:visual?Object.assign(events(),{height:844,offsetTop:0,scale:1}):undefined,matchMedia:()=>media,requestAnimationFrame(fn){callback=fn;return 1;},cancelAnimationFrame(){callback=null;}});
  const doc=Object.assign(events(),{activeElement:null,documentElement:{style:{setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)}},body:{classList:{toggle(k,on){on?classes.add(k):classes.delete(k);},remove:k=>classes.delete(k)}}});
  const stop=P.installViewport(win,doc,()=>changes++);
  return {win,doc,values,classes,media,stop,changes:()=>changes,flush(){const fn=callback;callback=null;fn?.();},focus(){doc.activeElement={matches:()=>true,closest:()=>null};doc.emit('focusin');}};
}
test('controlador acompanha abrir e fechar teclado e limpa o modo compacto',()=>{
  const h=harness();h.focus();h.win.visualViewport.height=430;h.win.visualViewport.offsetTop=40;h.win.visualViewport.emit('resize');h.flush();
  assert.equal(h.values.get('--app-height'),'430px');assert.equal(h.values.get('--viewport-top'),'40px');assert.equal(h.values.get('--viewport-gap'),'374px');assert.equal(h.classes.has('keyboard-open'),true);
  h.doc.activeElement=null;h.win.visualViewport.height=844;h.win.visualViewport.offsetTop=0;h.doc.emit('focusout');h.win.visualViewport.emit('resize');h.flush();
  assert.equal(h.values.get('--app-height'),'844px');assert.equal(h.classes.has('keyboard-open'),false);h.stop();
});
test('controlador preserva as últimas dimensões durante zoom de acessibilidade',()=>{
  const h=harness(),before=h.changes();h.win.visualViewport.scale=2;h.win.visualViewport.height=422;h.win.visualViewport.emit('resize');h.flush();
  assert.equal(h.values.get('--app-height'),'844px');assert.equal(h.changes(),before);h.stop();
});
test('fallback sem VisualViewport responde ao redimensionamento e ao retorno da página',()=>{
  const h=harness({visual:false});h.win.innerHeight=667;h.win.emit('pageshow');h.flush();assert.equal(h.values.get('--app-height'),'667px');h.stop();
});
test('ao voltar para desktop o controlador remove as dimensões móveis',()=>{
  const h=harness();h.media.matches=false;h.win.emit('resize');h.flush();assert.equal(h.values.size,0);assert.equal(h.classes.has('keyboard-open'),false);h.stop();
});
test('eventos de viewport são agrupados por quadro e seus ouvintes são removidos',()=>{
  const h=harness(),before=h.changes();h.win.visualViewport.height=700;for(let i=0;i<40;i++)h.win.visualViewport.emit('resize');h.flush();assert.equal(h.changes(),before+1);
  h.stop();assert.equal(h.win.count()+h.doc.count()+h.win.visualViewport.count(),0);
});
test('rotação redefine a referência de altura antes de uma nova edição',()=>{
  const h=harness();h.win.innerHeight=390;h.win.visualViewport.height=390;h.win.emit('orientationchange');h.flush();assert.equal(h.values.get('--app-height'),'390px');assert.equal(h.classes.has('keyboard-open'),false);h.stop();
});
test('campo focado em diálogo é rolado no próprio diálogo, sem rolar a janela',()=>{
  const h=harness(),dialog={scrollTop:100,getBoundingClientRect:()=>({top:10,bottom:430})};h.doc.activeElement={matches:()=>true,closest:()=>dialog,getBoundingClientRect:()=>({top:450,bottom:490})};h.win.visualViewport.height=450;h.doc.emit('focusin');h.flush();assert.equal(dialog.scrollTop,178);h.stop();
});
