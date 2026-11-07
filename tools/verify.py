"""Verificação reproduzível da edição MK XV; nenhum teste usa uma conta externa."""
from pathlib import Path
import hashlib,json,re,subprocess,sys,time,xml.etree.ElementTree as ET
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
JS=['test_frontend.js','test_regressions.js','test_mobile.js','test_mkxv_matrix.js','test_extensions.js']
COMPAT={'platform.js','mobile.css','compatibility.js','adaptive.css','legacy.js','service-worker.js'}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(command,log):
    start=time.monotonic();r=subprocess.run(command,cwd=ROOT,text=True,encoding='utf-8',errors='replace',stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    (DOCS/log).write_text(r.stdout,encoding='utf-8')
    if r.returncode:raise RuntimeError('Falha em '+log+'\n'+r.stdout[-1800:])
    return r.stdout,round(time.monotonic()-start,3)
def lines(path):return len(path.read_text(encoding='utf-8').splitlines())
def main():
    DOCS.mkdir(exist_ok=True)
    js,jstime=run(['node','--test','--test-reporter=tap',*[str(Path('testes')/name) for name in JS]],'RESULTADO_MK_XV_JS.tap')
    py,pytime=run([sys.executable,'-m','unittest','discover','-s','testes','-p','test_*.py'],'RESULTADO_MK_XV_PYTHON.txt')
    jsn=int(re.search(r'^# tests (\d+)',js,re.M)[1]);jspass=int(re.search(r'^# pass (\d+)',js,re.M)[1]);pyn=int(re.search(r'Ran (\d+) tests?',py)[1]);assert jsn==jspass
    portable=(ROOT/'JARVIS_MK_XV.html').read_text('utf-8');web=(ROOT/'index.html').read_text('utf-8')
    match=re.search(r'<script type="application/json" id="fusion-data">(.*?)</script>',portable,re.S);config=json.loads(match[1]);order=['jarvis','friday','vision','ultron','veronica','karen','edith','iris'];assert list(config['personas'])==order
    assert list(config['visuals'])==order and len(config['vendorSources'])==7
    assert 'data:image/png;base64,' in config['guideArt']
    assert 'vendorSources": {}' in web
    metrics=json.loads((ROOT/'art-metrics.json').read_text('utf-8'));art_checks=[]
    for key,svg in config['visuals'].items():
        node=ET.fromstring(svg);assert node.attrib['preserveAspectRatio']=='xMidYMid meet';image=node.find('image');assert image is not None
        m=metrics[key];left,top,right,bottom=m['bounds'];width=float(image.attrib['width']);height=float(image.attrib['height']);diameter=max((right-left)*width/m['width'],(bottom-top)*height/m['height']);assert abs(diameter-520)<.01
        assert image.attrib['preserveAspectRatio']=='xMidYMid meet' and 'data:image/png;base64,' in image.attrib['href'];art_checks.append({'persona':key,'visibleDiameter':round(diameter,4),'file':f'assets/art/{key}-hud.png','sha256':sha(ROOT/f'assets/art/{key}-hud.png')})
    credit='Created using AI by Orlando with assistance, and based on the first version created by Nikolas.';assert credit in portable and credit in web
    for key,value in config['personas'].items():assert not re.search(r'sexta[ -]?feira',json.dumps(value,ensure_ascii=False),re.I)
    deps=json.loads((ROOT/'vendor/DEPENDENCIAS.json').read_text('utf-8'));vendor_total=0
    for dependency in deps:
        actual=lines(ROOT/'vendor'/dependency['file']);assert actual==dependency['lines'];vendor_total+=actual
    compat=[p for p in (ROOT/'fonte').iterdir() if p.name in COMPAT]
    base=[p for p in (ROOT/'fonte').iterdir() if p.is_file() and p.suffix in {'.js','.css','.html'} and p.name not in COMPAT]+list((ROOT/'servidor').glob('*.py'))+[ROOT/'server.py',ROOT/'build.py']
    base+=[ROOT/'api-presets.json',ROOT/'personas.json',ROOT/'art-metrics.json']+list((ROOT/'database').glob('*.sql'))
    authored=sum(map(lines,base));compat_total=sum(map(lines,compat));base_total=authored+vendor_total;assert base_total>=200000
    counts={'base_authored_including_configuration':authored,'base_functional_libraries':vendor_total,'base_total':base_total,'compatibility':compat_total,'tests':sum(lines(p) for p in (ROOT/'testes').iterdir() if p.suffix in {'.py','.js'}),'method':'Physical lines including comments; excludes compiled HTML, dist duplicates, reports, binaries and guide authoring.'}
    catalog=json.loads((ROOT/'api-presets.json').read_text('utf-8'));assert len(catalog)==27
    report={'release':'J.A.R.V.I.S. MK XV','version':'15.0.0','verifiedAtUTC':datetime.now(timezone.utc).isoformat(),'tests':{'javascript':{'total':jsn,'passed':jspass,'seconds':jstime},'python':{'total':pyn,'passed':pyn,'seconds':pytime},'total':jsn+pyn,'liveProvidersTested':False},'sourceLines':counts,'order':order,'connectionPresets':len(catalog),'artChecks':art_checks,'artFootprintTolerance':.01,'artFootprintCoordinateSystem':'600 x 600 SVG; target 520','build':{'portableBytes':(ROOT/'JARVIS_MK_XV.html').stat().st_size,'webEntryBytes':(ROOT/'index.html').stat().st_size},'notValidated':['Physical Android/iOS/TV/console/watch devices','Every provider account/model combination','Supabase live RLS in a real project','Public deployment in user account']}
    (DOCS/'VALIDACAO_MK_XV.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8');print(json.dumps({'tests':jsn+pyn,'javascript':jsn,'python':pyn,'baseLines':base_total,'compatibilityLines':compat_total,'presets':len(catalog)},ensure_ascii=False))
if __name__=='__main__':main()
