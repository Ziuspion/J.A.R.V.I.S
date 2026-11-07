/* Adaptação por recursos disponíveis, sem identificar o navegador pelo user agent. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FusionPlatform=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const positive=(value,fallback)=>Number.isFinite(value)&&value>0?value:fallback;
  function viewportMetrics({layoutHeight,height,offsetTop=0,scale=1,baselineHeight,editing=false}){
    // O zoom de acessibilidade deve ampliar o conteúdo, sem reconstruir o layout.
    if(Number.isFinite(scale)&&Math.abs(scale-1)>.02)return null;
    const layout=positive(layoutHeight,positive(height,1));
    const visible=Math.min(layout,positive(height,layout));
    const top=Math.min(Math.max(0,Number.isFinite(offsetTop)?offsetTop:0),layout-visible);
    return {height:Math.floor(visible),top:Math.floor(top),gap:Math.ceil(Math.max(0,layout-visible-top)),
      keyboard:!!editing&&(Math.max(layout,positive(baselineHeight,layout))-visible>120||visible<460)};
  }
  function submitOnEnter(event,touchLayout=false){
    return event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229&&!touchLayout;
  }
  function lastUserIndex(messages){for(let i=messages.length-1;i>=0;i--)if(messages[i].role==='user')return i;return -1;}
  async function timedJSON(fetcher,url,options={},milliseconds=15000){
    // Não depende de AbortSignal.timeout, ausente em versões mais antigas do Safari.
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),milliseconds);
    try{const response=await fetcher(url,{...options,signal:abort.signal});return {response,value:await response.json()};}
    finally{clearTimeout(timer);}
  }
  function installViewport(win,doc,onChange=()=>{}){
    const root=doc.documentElement,viewport=win.visualViewport;
    const mobile=win.matchMedia('(max-width: 980px), (pointer: coarse)');
    let frame=0,baseline=win.innerHeight,last='';
    const editing=()=>!!doc.activeElement?.matches('textarea,input:not([type=checkbox]):not([type=button]):not([type=file]):not([type=range]),[contenteditable=true]');
    function update(){
      frame=0;
      if(!mobile.matches){
        for(const key of ['--app-height','--viewport-top','--viewport-gap'])root.style.removeProperty(key);
        doc.body.classList.remove('keyboard-open');last='';onChange();return;
      }
      const focused=editing();
      if(!focused&&(!viewport||Math.abs(viewport.scale-1)<.02))baseline=win.innerHeight;
      const metrics=viewportMetrics({layoutHeight:win.innerHeight,height:viewport?.height,offsetTop:viewport?.offsetTop,scale:viewport?.scale,baselineHeight:baseline,editing:focused});
      if(!metrics)return;
      const signature=JSON.stringify(metrics);if(signature===last)return;last=signature;
      root.style.setProperty('--app-height',metrics.height+'px');root.style.setProperty('--viewport-top',metrics.top+'px');root.style.setProperty('--viewport-gap',metrics.gap+'px');
      doc.body.classList.toggle('keyboard-open',metrics.keyboard);onChange();
      // Rola somente o diálogo: não arrasta o documento inteiro atrás do teclado.
      const active=doc.activeElement,dialog=active?.closest('dialog.modal[open]');
      if(dialog&&focused){const field=active.getBoundingClientRect(),box=dialog.getBoundingClientRect();
        if(field.bottom>box.bottom-18)dialog.scrollTop+=field.bottom-box.bottom+18;
        else if(field.top<box.top+18)dialog.scrollTop-=box.top-field.top+18;
      }
    }
    function schedule(){if(!frame)frame=win.requestAnimationFrame(update);}
    function rotate(){baseline=win.innerHeight;last='';schedule();}
    const bindings=[[win,'resize',schedule],[win,'orientationchange',rotate],[win,'pageshow',schedule],[doc,'focusin',schedule],[doc,'focusout',schedule]];
    if(viewport)bindings.push([viewport,'resize',schedule],[viewport,'scroll',schedule]);
    for(const [target,event,fn]of bindings)target.addEventListener(event,fn,{passive:true});
    update();
    return ()=>{for(const [target,event,fn]of bindings)target.removeEventListener(event,fn);if(frame)win.cancelAnimationFrame(frame);};
  }
  return {viewportMetrics,submitOnEnter,lastUserIndex,timedJSON,installViewport};
});
