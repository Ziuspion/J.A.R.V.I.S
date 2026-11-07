/* Supabase opcional: autenticação e snapshots privados sob RLS. Sem SDK externo. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JarvisCloud=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function validatePublicKey(value){
    const key=String(value||'').trim();if(!key||key.length>4096||/[\r\n]/.test(key)||key.startsWith('sb_secret_'))throw Error('Use somente a chave publishable/anon do projeto, nunca uma chave secreta.');
    if(key.split('.').length===3){try{const part=key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),claims=JSON.parse(atob(part));if(claims.role==='service_role')throw Error('service_role');}catch(e){if(e.message==='service_role')throw Error('A chave service_role não pode ser usada no navegador.');}}
    return key;
  }
  function create({url,key,fetcher=fetch,readJSON,now=()=>Date.now()}){
    const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw Error('Use a URL HTTPS raiz do projeto Supabase.');
    const base=parsed.origin,publishable=validatePublicKey(key);let session=null;
    async function call(path,{body,token,method='POST'}={}){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try{const response=await fetcher(base+path,{method,credentials:'omit',redirect:'error',signal:controller.signal,headers:{apikey:publishable,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
        const value=response.status===204?{}:await readJSON(response,4*1024*1024,controller.signal);
        if(!response.ok){const e=Error(value.code==='40001'?'Há uma cópia mais recente na nuvem. Exporte seus dados antes de restaurar ou salvar novamente.':response.status===401||response.status===403?'A sessão da nuvem expirou ou foi recusada. Entre novamente e confira as políticas do banco.':response.status===404?'Banco não encontrado. Execute o SQL de ativação no seu projeto Supabase.':'A nuvem recusou a operação. Confira sua conta, a configuração do projeto e o SQL de ativação.');e.status=value.code==='40001'?409:response.status;throw e;}
        return value;
      }catch(error){if(error.name==='AbortError')throw Error('A operação na nuvem excedeu o prazo.');if(error instanceof TypeError)throw Error('Não foi possível alcançar seu projeto Supabase. Confira a URL e a rede.');throw error;}
      finally{clearTimeout(timer);}
    }
    function accept(value){if(!value.access_token||!value.user?.id)throw Error('Confirme o e-mail antes de entrar, se essa opção estiver ativada no seu projeto.');session={access:value.access_token,refresh:value.refresh_token,user:value.user.id,email:value.user.email||'',expires:now()+Math.max(0,Number(value.expires_in)||3600)*1000};return {email:session.email};}
    async function access(){if(!session)throw Error('Entre na sua conta da nuvem primeiro.');if(session.expires-now()<60000){if(!session.refresh){session=null;throw Error('Sua sessão expirou. Entre novamente.');}accept(await call('/auth/v1/token?grant_type=refresh_token',{body:{refresh_token:session.refresh}}));}return session.access;}
    return {
      async login(email,password){return accept(await call('/auth/v1/token?grant_type=password',{body:{email,password}}));},
      async signup(email,password){const value=await call('/auth/v1/signup',{body:{email,password}});if(value.access_token)return accept(value);return {confirmationRequired:true};},
      async load(){return call('/rest/v1/rpc/jarvis_load_workspace',{body:{},token:await access()});},
      async save(workspace,revision){return call('/rest/v1/rpc/jarvis_save_workspace',{body:{p_workspace:workspace,p_expected_revision:revision},token:await access()});},
      async logout(){const previous=session;session=null;if(previous)await call('/auth/v1/logout',{token:previous.access});},
      forget(){session=null;},get connected(){return !!session;}
    };
  }
  return {validatePublicKey,create};
});
