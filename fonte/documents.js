/* Ferramentas de arquivo locais. Bibliotecas licenciadas são carregadas só ao usar. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JarvisDocuments=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_INPUT=8*1024*1024,MAX_TEXT=60000,MAX_ZIP_EXPANDED=32*1024*1024;
  const FILES={zip:['vendor/jszip/jszip.js','JSZip'],pdfLib:['vendor/pdf-lib/pdf-lib.js','PDFLib'],word:['vendor/docx/docx.js','docx']};
  function boundsText(value,max=MAX_TEXT){const text=String(value||'').replace(/\u0000/g,'');return {text:text.slice(0,max),truncated:text.length>max};}
  async function readBlob(file,{text=false,signal}={}){
    if(signal?.aborted)throw new DOMException('Leitura cancelada','AbortError');
    const method=text?'text':'arrayBuffer';if(typeof file[method]==='function'){const value=await file[method]();if(signal?.aborted)throw new DOMException('Leitura cancelada','AbortError');return value;}
    if(typeof FileReader==='undefined')throw Error('Este navegador não oferece leitura de arquivos. Use uma versão atualizada.');
    return new Promise((resolve,reject)=>{const reader=new FileReader(),abort=()=>reader.abort();signal?.addEventListener('abort',abort,{once:true});reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Não foi possível ler o arquivo.'));reader.onabort=()=>reject(new DOMException('Leitura cancelada','AbortError'));reader.onloadend=()=>signal?.removeEventListener('abort',abort);text?reader.readAsText(file):reader.readAsArrayBuffer(file);});
  }
  function validateArchive(bytes){
    const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);if(data.byteLength>MAX_INPUT)throw Error('O arquivo excede o limite de 8 MB.');const view=new DataView(data.buffer,data.byteOffset,data.byteLength);let eocd=-1;
    for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
    if(eocd<0)throw Error('O arquivo não contém um pacote ZIP válido.');
    const count=view.getUint16(eocd+10,true),start=view.getUint32(eocd+16,true);if(!count||count>1000||start>=eocd)throw Error('O pacote contém entradas demais ou usa um formato não suportado.');
    let at=start,total=0;const entries=new Map();
    for(let i=0;i<count;i++){
      if(at+46>eocd||view.getUint32(at,true)!==0x02014b50)throw Error('O diretório do pacote é inválido.');
      const flags=view.getUint16(at+8,true),method=view.getUint16(at+10,true),compressed=view.getUint32(at+20,true),size=view.getUint32(at+24,true),nameSize=view.getUint16(at+28,true),extra=view.getUint16(at+30,true),comment=view.getUint16(at+32,true),local=view.getUint32(at+42,true);
      if(flags&1||![0,8].includes(method)||size===0xffffffff||local>=start||at+46+nameSize+extra+comment>eocd)throw Error('Pacotes cifrados, ZIP64 ou com entradas inválidas não são aceitos.');
      total+=size;if(total>MAX_ZIP_EXPANDED||size>8*1024*1024||(size>1024*1024&&compressed&&size/compressed>200))throw Error('O pacote expandido excede os limites de leitura.');
      const name=new TextDecoder().decode(data.slice(at+46,at+46+nameSize));if(name.startsWith('/')||name.split('/').includes('..')||entries.has(name))throw Error('O pacote contém caminhos inválidos ou duplicados.');entries.set(name,{size,compressed});at+=46+nameSize+extra+comment;
    }return entries;
  }
  function parseTable(markdown){
    const lines=String(markdown||'').split(/\r?\n/);for(let i=0;i<lines.length-1;i++){
      if(!lines[i].includes('|')||!/^\s*\|?\s*:?-{3,}/.test(lines[i+1]))continue;
      const cells=line=>{const out=[];let cell='',escape=false;for(const c of line.trim().replace(/^\|/,'').replace(/\|$/,'')){if(escape){cell+=c;escape=false;}else if(c==='\\')escape=true;else if(c==='|'){out.push(cell.trim());cell='';}else cell+=c;}out.push((cell+(escape?'\\':'')).trim());return out;};
      const rows=[cells(lines[i])];for(let j=i+2;j<lines.length&&lines[j].includes('|')&&rows.length<5000;j++)rows.push(cells(lines[j]));const width=Math.max(...rows.map(r=>r.length));if(width>100)throw Error('A tabela excede cem colunas.');return rows.map(r=>Array.from({length:width},(_,i)=>r[i]||''));
    }throw Error('Não encontrei uma tabela Markdown nesta resposta.');
  }
  const xmlEscape=value=>String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  async function readZipText(entry,expected,{signal,max=8*1024*1024}={}){
    if(signal?.aborted)throw new DOMException('Leitura cancelada','AbortError');
    return new Promise((resolve,reject)=>{let count=0,text='',done=false;const decoder=new TextDecoder(),stream=entry.internalStream('uint8array');
      const finish=(error)=>{if(done)return;done=true;stream.pause();signal?.removeEventListener('abort',abort);error?reject(error):resolve(text+decoder.decode());};
      const abort=()=>finish(new DOMException('Leitura cancelada','AbortError'));signal?.addEventListener('abort',abort,{once:true});
      stream.on('data',chunk=>{if(done)return;count+=chunk.byteLength;if(count>max||count>expected){finish(Error('O conteúdo expandido excedeu o tamanho declarado ou o limite de leitura.'));return;}text+=decoder.decode(chunk,{stream:true});}).on('error',()=>finish(Error('Não foi possível descompactar o documento.'))).on('end',()=>finish(count!==expected?Error('O tamanho do documento não corresponde ao pacote.'):null)).resume();
    });
  }
  const columnName=index=>{if(!Number.isInteger(index)||index<0||index>16383)throw Error('Coluna inválida.');let out='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out;};
  function workbookFiles(rows){
    if(!Array.isArray(rows)||!rows.length||rows.length>5000||rows.some(r=>!Array.isArray(r)||r.length>100))throw Error('A planilha precisa ter até 5.000 linhas e cem colunas.');
    const sheet=rows.map((r,i)=>'<row r="'+(i+1)+'">'+r.map((v,j)=>'<c r="'+columnName(j)+(i+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xmlEscape(String(v).slice(0,32767))+'</t></is></c>').join('')+'</row>').join('');
    return {'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="JARVIS" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml':'<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+sheet+'</sheetData></worksheet>'};
  }
  function init({embedded={},openPanel,notify=()=>{},download,attachFiles}){
    const modules=new Map(),$=id=>document.getElementById(id);let previewTask=null,previewDocument=null,viewer=null,previewRevision=0;
    const moduleURL=(key,path)=>embedded[key]?URL.createObjectURL(new Blob([embedded[key]],{type:'text/javascript'})):new URL(path,document.baseURI).href;
    function script(key){if(modules.has(key))return modules.get(key);const [path,name]=FILES[key];const promise=new Promise((resolve,reject)=>{if(window[name]){resolve(window[name]);return;}const node=document.createElement('script'),url=moduleURL(key,path);node.src=url;node.onload=()=>{if(url.startsWith('blob:'))URL.revokeObjectURL(url);window[name]?resolve(window[name]):reject(Error('A biblioteca de arquivos não iniciou.'));};node.onerror=()=>{if(url.startsWith('blob:'))URL.revokeObjectURL(url);modules.delete(key);reject(Error('Não foi possível carregar as ferramentas de arquivo. Confira os arquivos da pasta vendor ou use a versão publicada.'));};document.head.append(node);});modules.set(key,promise);return promise;}
    const pdfOptions=()=>embedded.pdf?{}:{cMapUrl:new URL('vendor/pdfjs/cmaps/',document.baseURI).href,cMapPacked:true,standardFontDataUrl:new URL('vendor/pdfjs/standard_fonts/',document.baseURI).href,wasmUrl:new URL('vendor/pdfjs/wasm/',document.baseURI).href};
    async function pdf(){if(!modules.has('pdf'))modules.set('pdf',(async()=>{const url=moduleURL('pdf','vendor/pdfjs/pdf.mjs');try{const value=await import(url);value.GlobalWorkerOptions.workerSrc=moduleURL('pdfWorker','vendor/pdfjs/pdf.worker.mjs');window.pdfjsLib=value;return value;}catch(error){modules.delete('pdf');throw Error('O leitor de PDF não iniciou neste navegador. Use a versão web completa em um navegador atualizado.');}finally{if(url.startsWith('blob:'))URL.revokeObjectURL(url);}})());return modules.get('pdf');}
    function parseXML(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('O documento contém declarações XML não aceitas.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('O XML do documento é inválido.');return doc;}
    async function zipXML(zip,name,entries,signal){if(!entries.has(name)||!zip.file(name))return null;return parseXML(await readZipText(zip.file(name),entries.get(name).size,{signal}));}
    async function extract(file,{signal}={}){
      const check=()=>{if(signal?.aborted)throw new DOMException('Leitura cancelada','AbortError');};check();
      if(file.size>MAX_INPUT)throw Error('O arquivo excede o limite de 8 MB.');const ext=file.name.toLowerCase().split('.').pop(),bytes=new Uint8Array(await readBlob(file,{signal}));
      if(ext==='pdf'){
        const lib=await pdf();check();let task,doc;try{task=lib.getDocument({...pdfOptions(),data:bytes.slice(),isEvalSupported:false,disableFontFace:true,useSystemFonts:true,verbosity:0});if(signal)signal.addEventListener('abort',()=>task.destroy(),{once:true});doc=await task.promise;check();let text='',pages=0;
          for(let n=1;n<=Math.min(doc.numPages,100)&&text.length<=MAX_TEXT;n++){check();const page=await doc.getPage(n),content=await page.getTextContent();text+='\n\n[Página '+n+']\n'+content.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('');pages++;page.cleanup();}
          const bounded=boundsText(text);if(!bounded.text.trim())throw Error('O PDF não contém texto extraível. PDFs digitalizados precisam de OCR ou de um modelo que aceite o documento original.');return {...bounded,pages,totalPages:doc.numPages,truncated:bounded.truncated||pages<doc.numPages};
        }finally{if(doc)await doc.destroy();else if(task)await task.destroy();}
      }
      if(!['docx','xlsx'].includes(ext))throw Error('Formato não suportado pelo extrator local.');
      check();const entries=validateArchive(bytes),JSZip=await script('zip'),zip=await JSZip.loadAsync(bytes);let text='';
      if(ext==='docx'){
        const doc=await zipXML(zip,'word/document.xml',entries,signal);if(!doc)throw Error('Não encontrei o conteúdo Word no arquivo.');const paragraphs=[...doc.getElementsByTagNameNS('*','p')];text=paragraphs.map(p=>[...p.getElementsByTagNameNS('*','t')].map(n=>n.textContent).join('')).join('\n');
      }else{
        const shared=await zipXML(zip,'xl/sharedStrings.xml',entries,signal),strings=shared?[...shared.getElementsByTagNameNS('*','si')].map(si=>[...si.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')):[];
        const sheets=[...entries.keys()].filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort().slice(0,20);if(!sheets.length)throw Error('Não encontrei planilhas no arquivo.');let cells=0;
        for(const name of sheets){const doc=await zipXML(zip,name,entries,signal);text+='\n\n['+name+']\n';for(const row of doc.getElementsByTagNameNS('*','row')){const values=[];for(const c of row.getElementsByTagNameNS('*','c')){if(++cells>100000)throw Error('A planilha excede o limite de células para leitura.');const raw=c.getElementsByTagNameNS('*','v')[0]?.textContent||'';values.push(c.getAttribute('t')==='s'?strings[Number(raw)]||'':c.getAttribute('t')==='inlineStr'?[...c.getElementsByTagNameNS('*','t')].map(n=>n.textContent).join(''):raw||('='+c.getElementsByTagNameNS('*','f')[0]?.textContent).replace('=undefined',''));}text+=values.join('\t')+'\n';if(text.length>MAX_TEXT)break;}if(text.length>MAX_TEXT)break;}
      }
      const bounded=boundsText(text);if(!bounded.text.trim())throw Error('O arquivo não contém texto extraível.');return bounded;
    }
    async function preview(file){
      if(file.size>MAX_INPUT)throw Error('O PDF excede 8 MB.');const revision=++previewRevision;openPanel('pdf-modal');$('pdf-title').textContent=file.name;$('pdf-status').textContent='Carregando PDF localmente…';
      if(previewDocument){await previewDocument.destroy();previewDocument=null;}if(previewTask){await previewTask.destroy();previewTask=null;}
      try{const lib=await pdf();if(!modules.has('pdfViewer'))modules.set('pdfViewer',(async()=>{if(embedded.pdfCSS){const style=document.createElement('style');style.textContent=embedded.pdfCSS;document.head.append(style);}else{const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('vendor/pdfjs/pdf_viewer.css',document.baseURI).href;document.head.append(link);}return import(moduleURL('pdfViewer','vendor/pdfjs/pdf_viewer.mjs'));})());const ui=await modules.get('pdfViewer');if(revision!==previewRevision)return;
        const eventBus=new ui.EventBus(),linkService=new ui.PDFLinkService({eventBus,externalLinkTarget:2,externalLinkRel:'noopener noreferrer'});
        viewer=new ui.PDFSinglePageViewer({container:$('pdf-container'),viewer:$('pdf-viewer'),eventBus,linkService,textLayerMode:1,annotationMode:0});linkService.setViewer(viewer);
        eventBus.on('pagesinit',()=>{viewer.currentScaleValue='page-width';$('pdf-status').textContent='Página 1 / '+previewDocument.numPages;});eventBus.on('pagechanging',e=>{$('pdf-status').textContent='Página '+e.pageNumber+' / '+previewDocument.numPages;});
        previewTask=lib.getDocument({...pdfOptions(),data:new Uint8Array(await readBlob(file)),isEvalSupported:false,useSystemFonts:true,verbosity:0});const doc=await previewTask.promise;if(revision!==previewRevision){await doc.destroy();return;}previewDocument=doc;previewTask=null;viewer.setDocument(doc);linkService.setDocument(doc);
      }catch(e){$('pdf-status').textContent='Não foi possível abrir a prévia. O arquivo pode exigir recursos não disponíveis neste contexto.';notify(e.message);}
    }
    $('pdf-prev').addEventListener('click',()=>{if(viewer&&viewer.currentPageNumber>1)viewer.currentPageNumber--;});$('pdf-next').addEventListener('click',()=>{if(viewer&&previewDocument&&viewer.currentPageNumber<previewDocument.numPages)viewer.currentPageNumber++;});$('pdf-zoom-out').addEventListener('click',()=>{if(viewer)viewer.currentScale=Math.max(.25,viewer.currentScale/1.2);});$('pdf-zoom-in').addEventListener('click',()=>{if(viewer)viewer.currentScale=Math.min(4,viewer.currentScale*1.2);});
    $('pdf-attach-page').addEventListener('click',async()=>{if(!previewDocument||!viewer)return;const button=$('pdf-attach-page');button.disabled=true;try{const page=await previewDocument.getPage(viewer.currentPageNumber),initial=page.getViewport({scale:1}),scale=Math.min(2,1600/Math.max(initial.width,initial.height)),viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));if(!blob||blob.size>2*1024*1024)throw Error('A página renderizada excedeu o limite de 2 MB.');await attachFiles([new File([blob],'pagina-'+viewer.currentPageNumber+'.jpg',{type:'image/jpeg'})]);notify('Página anexada como imagem. O modelo conectado precisa aceitar imagens.');}catch(e){notify(e.message);}finally{button.disabled=false;}});
    $('pdf-modal').addEventListener('close',()=>{previewRevision++;viewer?.setDocument(null);previewDocument?.destroy();previewTask?.destroy();previewDocument=previewTask=viewer=null;});
    async function exportPDF(thread,names){const lib=await script('pdfLib'),doc=await lib.PDFDocument.create(),font=await doc.embedFont(lib.StandardFonts.Helvetica),bold=await doc.embedFont(lib.StandardFonts.HelveticaBold);doc.setTitle(thread.title);doc.setCreator('J.A.R.V.I.S. MK XV');let page,y;
      const safe=text=>Array.from(String(text)).map(c=>{if(c==='\n')return c;try{font.encodeText(c);return c;}catch{return '?';}}).join('');
      function next(){page=doc.addPage([595.28,841.89]);y=784;page.drawText('J.A.R.V.I.S. MK XV',{x:44,y:812,size:9,font:bold,color:lib.rgb(.08,.25,.3)});page.drawText(String(doc.getPageCount()),{x:545,y:25,size:9,font});}
      function line(text,size=11,strong=false){if(y<50)next();page.drawText(safe(text),{x:44,y,size,font:strong?bold:font,color:lib.rgb(.08,.1,.14)});y-=size*1.5;}
      function paragraph(text,size=11,strong=false){for(const raw of safe(text).split('\n')){const words=raw.split(/\s+/);let buf='';for(const word of words){const candidate=buf?buf+' '+word:word;if(font.widthOfTextAtSize(candidate,size)>500&&buf){line(buf,size,strong);buf=word;}else buf=candidate;while(font.widthOfTextAtSize(buf,size)>500&&buf.length>1){let n=buf.length;while(n>1&&font.widthOfTextAtSize(buf.slice(0,n),size)>500)n--;line(buf.slice(0,n),size,strong);buf=buf.slice(n);}}line(buf,size,strong);}}
      next();paragraph(thread.title,18,true);y-=12;for(const message of thread.messages){paragraph(message.role==='user'?'Você':names[message.persona]?.name||'Assistente',12,true);paragraph(message.content);y-=17;}download('JARVIS_CONVERSA.pdf',await doc.save(),'application/pdf');}
    async function exportWord(thread,names){const lib=await script('word'),children=[new lib.Paragraph({text:thread.title,heading:lib.HeadingLevel.TITLE})];for(const m of thread.messages){children.push(new lib.Paragraph({text:m.role==='user'?'Você':names[m.persona]?.name||'Assistente',heading:lib.HeadingLevel.HEADING_2}));for(const text of m.content.split('\n'))children.push(new lib.Paragraph({children:[new lib.TextRun({text})]}));}const doc=new lib.Document({creator:'J.A.R.V.I.S. MK XV',title:thread.title,sections:[{children}]});download('JARVIS_CONVERSA.docx',await lib.Packer.toBlob(doc),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');}
    async function exportSheet(markdown){const rows=parseTable(markdown),JSZip=await script('zip'),zip=new JSZip();for(const [name,body]of Object.entries(workbookFiles(rows)))zip.file(name,body);download('JARVIS_TABELA.xlsx',await zip.generateAsync({type:'blob',compression:'DEFLATE'}),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}
    return {extract,preview,exportPDF,exportWord,exportSheet};
  }
  return {MAX_INPUT,MAX_TEXT,boundsText,readBlob,readZipText,validateArchive,parseTable,columnName,xmlEscape,workbookFiles,init};
});
