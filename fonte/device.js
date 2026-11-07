/* Diagnóstico local com consentimento. Não inventa sensores do sistema operacional. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JarvisDevice=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STORE='jarvis-device-record-v1',KEYS=['ramTotal','ramFree','storageTotal','storageFree'];
  function cleanRecord(value){
    const input=value&&typeof value==='object'?value:{},out={model:typeof input.model==='string'?input.model.trim().slice(0,80):'',unit:input.unit==='GiB'?'GiB':'GB',source:'manual',at:Date.now()};
    for(const key of KEYS){const raw=String(input[key]??'').trim().replace(',','.');if(raw===''){out[key]='';continue;}if(!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,3})?$/.test(raw)||Number(raw)>100000)throw Error('Informe capacidades entre 0 e 100.000, com até três casas decimais.');if(key.endsWith('Total')&&Number(raw)===0)throw Error('A capacidade total precisa ser maior que zero.');out[key]=raw;}
    if(out.ramTotal&&out.ramFree&&Number(out.ramFree)>Number(out.ramTotal))throw Error('A RAM disponível não pode superar a RAM total.');
    if(out.storageTotal&&out.storageFree&&Number(out.storageFree)>Number(out.storageTotal))throw Error('O espaço livre não pode superar o armazenamento total.');return out;
  }
  const dimension=v=>Number.isFinite(Number(v))?Math.max(1,Math.round(Number(v))):1;const view=value=>({width:dimension(value.width),height:dimension(value.height),touch:!!value.touch});
  function init({notify=()=>{}}={}){
    const $=id=>document.getElementById(id);let authorized=false,record=null;
    function updateView(){
      const screen=view({width:window.visualViewport?.width||window.innerWidth,height:window.visualViewport?.height||window.innerHeight,touch:window.matchMedia('(pointer:coarse)').matches});
      $('device-viewport').textContent=screen.width+' × '+screen.height+' px CSS';$('device-input').textContent=screen.touch?'Apresentação para toque':'Apresentação para ponteiro/teclado';
    }
    function render(){
      $('device-consent').hidden=authorized;$('device-content').hidden=!authorized;if(!authorized)return;
      updateView();
      for(const key of KEYS){$('device-'+key).textContent=record?.[key]?record[key].replace('.',',')+' '+record.unit:'Não disponibilizado pelo navegador';$('record-'+key).value=record?.[key]||'';}
      $('record-model').value=record?.model||'';$('record-unit').value=record?.unit||'GB';$('device-provenance').textContent=record?'Capacidades informadas por você. Não são medições ao vivo. Dados variáveis precisam ser atualizados manualmente.':'O modo web não fornece RAM física nem armazenamento total/livre exatos. Nenhum valor estimado foi usado para preencher estes campos.';
    }
    $('authorize-device').addEventListener('click',()=>{authorized=true;try{const raw=localStorage.getItem(STORE);if(raw)record=cleanRecord(JSON.parse(raw));$('record-remember').checked=!!raw;}catch{record=null;}render();});
    $('device-record-form').addEventListener('submit',e=>{e.preventDefault();if(!authorized)return;try{const raw={model:$('record-model').value,unit:$('record-unit').value};for(const key of KEYS)raw[key]=$('record-'+key).value;record=cleanRecord(raw);if($('record-remember').checked){try{localStorage.setItem(STORE,JSON.stringify(record));}catch{notify('Dados mantidos nesta aba. O navegador não permitiu gravá-los.');}}else{try{localStorage.removeItem(STORE);}catch{}}render();notify('Valores registrados com origem identificada.');}catch(error){notify(error.message);}});
    $('revoke-device').addEventListener('click',()=>{authorized=false;record=null;for(const key of KEYS)$('record-'+key).value='';try{localStorage.removeItem(STORE);}catch{notify('A autorização desta aba foi revogada, mas o navegador impediu apagar o registro salvo. Remova os dados do site nas configurações do navegador.');}render();});
    $('persist-device-data').addEventListener('click',async()=>{if(!authorized)return;const button=$('persist-device-data');button.disabled=true;try{if(!navigator.storage?.persist){$('device-persistence').textContent='Este navegador não oferece a solicitação de armazenamento persistente.';return;}const granted=await navigator.storage.persist();$('device-persistence').textContent=granted?'O navegador concedeu armazenamento persistente para os dados deste site. Isso não libera acesso à RAM ou ao disco físico.':'O navegador não concedeu a persistência. Seus backups em arquivo continuam disponíveis.';}catch{$('device-persistence').textContent='Não foi possível solicitar persistência neste contexto. Use o site por HTTPS e exporte backups.';}finally{button.disabled=false;}});
    window.addEventListener('resize',()=>{if(authorized)updateView();},{passive:true});render();
  }
  return {KEYS,cleanRecord,view,init};
});
