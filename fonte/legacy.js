/* Ponte mínima para navegadores com Fetch, antes dos módulos modernos. */
(function(){
  if(!Object.hasOwn)Object.hasOwn=function(obj,key){return Object.prototype.hasOwnProperty.call(obj,key);};
  if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{value:function(index){var n=Number(index)||0;n=n<0?Math.ceil(n):Math.floor(n);return this[n<0?this.length+n:n];},writable:true,configurable:true});
  window.addEventListener('error',function(){if(!window.FusionCore){var feedback=document.getElementById('boot-feedback');if(feedback){feedback.hidden=false;feedback.textContent='O navegador não conseguiu iniciar a interface. Use uma versão atualizada do navegador do aparelho.';}}},true);
  if(!window.fetch||!window.Promise||!window.AbortController||!window.URL||!window.TextDecoder){var box=document.getElementById('boot-feedback');box.hidden=false;box.textContent='Este navegador não oferece os recursos necessários. Abra o site em uma versão atualizada do navegador do aparelho.';}
})();
