/* Banco local IndexedDB. Sessões temporárias não são gravadas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JarvisStorage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DB='jarvis-workspaces-v1',TABLE='workspace',MAX_BYTES=4*1024*1024;
  function eligible(state){return state?.settings?.keepHistory===true;}
  function assertSize(value){if(new TextEncoder().encode(JSON.stringify(value)).byteLength>MAX_BYTES)throw Error('O histórico excede 4 MB. Exporte conversas e remova as antigas para voltar a salvar neste navegador.');return value;}
  function create(indexedDB){
    let opening=null;
    function open(){
      if(!indexedDB)return Promise.reject(Error('IndexedDB indisponível neste navegador.'));
      if(opening)return opening;
      opening=new Promise((resolve,reject)=>{let settled=false;const req=indexedDB.open(DB,1),timer=setTimeout(()=>{if(!settled){settled=true;opening=null;reject(Error('O banco local não respondeu. Confira outras abas e as permissões do navegador.'));}},2500);
        req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(TABLE))db.createObjectStore(TABLE);};
        req.onsuccess=()=>{clearTimeout(timer);if(settled){req.result.close();return;}settled=true;req.result.onversionchange=()=>{req.result.close();opening=null;};resolve(req.result);};
        req.onerror=req.onblocked=()=>{clearTimeout(timer);if(settled)return;settled=true;opening=null;reject(Error('O navegador não liberou o banco local. A conversa continua nesta aba; use um backup para conservá-la.'));};
      });return opening;
    }
    async function transaction(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(TABLE,mode),store=tx.objectStore(TABLE);let value;const req=action(store);req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(Error('O banco local não concluiu a operação. Exporte um backup para conservar seus dados.'));});}
    return {load:()=>transaction('readonly',s=>s.get('active')),save:state=>eligible(state)?transaction('readwrite',s=>s.put(assertSize(state),'active')):transaction('readwrite',s=>s.delete('active')),clear:()=>transaction('readwrite',s=>s.delete('active')),available:!!indexedDB};
  }
  return {create,eligible,assertSize,DB,TABLE,MAX_BYTES};
});
