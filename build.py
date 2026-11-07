"""Compila a aplicação em um HTML autônomo, sem dependências externas."""
from pathlib import Path
import json, base64, hashlib, shutil
ROOT = Path(__file__).resolve().parent

def life_svg(kind):
    """Camadas 2D leves; o CSS controla visibilidade e movimento."""
    if kind in ('karen', 'iris'):
        points = [(300,194),(386,243),(386,348),(300,397),(212,348),(212,243)]
        nodes = ''.join(f'<circle class="sensor-node" cx="{x}" cy="{y}" r="4.3" style="--node-delay:-{i*.8:.1f}s"/>' for i,(x,y) in enumerate(points))
        return f'''<g class="core-life new-life sensor-life {kind}-life" fill="none" aria-hidden="true">
          <g class="sensor-track"><circle cx="300" cy="300" r="234" stroke-dasharray="9 91" pathLength="100"/><circle cx="300" cy="300" r="204" stroke-dasharray="3 47 3 47" pathLength="100"/></g>
          <g class="sensor-sweep"><path d="M300 300 405 237A123 123 0 0 1 418 336Z" class="sensor-sector"/><path d="M300 300 405 237"/></g>
          <circle class="sensor-link" cx="300" cy="296" r="101" pathLength="100" stroke-dasharray="6 94"/>
          <circle class="sensor-heart" cx="300" cy="296" r="22"/>{nodes}
        </g>'''
    if kind == 'veronica':
        return '''<g class="core-life new-life veronica-life" fill="none" aria-hidden="true">
          <g class="contingency-track"><circle cx="300" cy="300" r="235" pathLength="100" stroke-dasharray="5 20 5 20 5 20 5 20"/><circle cx="300" cy="300" r="248" pathLength="100" stroke-dasharray="1 24 1 24 1 24 1 24"/></g>
          <g class="contingency-scan"><path d="M242 210v-15h22m72 0h22v15M242 394v15h22m72 0h22v-15"/><path d="M259 269h82" class="contingency-line"/></g>
          <path class="contingency-flow" d="M300 251v112" pathLength="100" stroke-dasharray="15 85"/>
          <circle class="contingency-beacon" cx="300" cy="342" r="10"/>
        </g>'''
    if kind == 'vision':
        return '''<g class="core-life new-life vision-life" fill="none" aria-hidden="true">
          <g class="vision-orbit"><circle cx="300" cy="300" r="238" pathLength="100" stroke-dasharray="12 38 12 38"/><circle cx="300" cy="300" r="213" pathLength="100" stroke-dasharray="1 24 1 24 1 24 1 24"/></g>
          <path class="vision-diamond" d="m300 221 23 23-23 23-23-23Z"/>
          <path class="vision-thought" d="M300 244h-55l-25-25m80 25h55l25-25" pathLength="100" stroke-dasharray="8 92"/>
          <circle class="vision-pulse" cx="300" cy="244" r="31"/>
        </g>'''
    if kind == 'edith':
        return '''<g class="core-life edith-life" fill="none" aria-hidden="true">
          <circle class="life-orbit edith-orbit" cx="300" cy="300" r="239" pathLength="100"/>
          <g class="edith-focus"><path d="M180 276v-19h22m211-9h20v20M191 345v20h22m193-19h20v-21"/><path class="edith-crosshair" d="M282 292h12m-6-6v12m56-12h12m-6-6v12"/></g>
          <g class="edith-reflection"><path d="m219 277 31 66m-17-71 31 66m66-83 31 66"/></g>
          <circle class="life-node edith-node" cx="215" cy="268" r="2.7" style="--life-delay:-.8s"/>
          <circle class="life-node edith-node" cx="404" cy="340" r="2.7" style="--life-delay:-2.2s"/>
          <path class="edith-signal" d="M171 220h27m203 169h26"/>
        </g>'''
    if kind == 'ultron':
        paths = [
            'M218 287C240 242 294 243 327 268S369 301 348 337 276 355 253 326 289 286 327 304 370 360 319 376',
            'M252 224C286 250 254 276 287 299S351 320 379 288 344 242 316 265 294 342 264 366',
            'M211 335C247 359 271 319 305 334S358 373 383 333 341 286 306 310 256 296 249 264',
        ]
        flows = ''.join(f'<path class="ultron-flow ultron-flow-{i}" d="{d}" pathLength="100"/>' for i, d in enumerate(paths))
        points = [(238,278),(284,244),(332,286),(357,330),(302,356),(261,326)]
        nodes = ''.join(f'<circle class="life-node ultron-node" cx="{x}" cy="{y}" r="{2.1 + i%3*.4}" style="--life-delay:-{i*.68:.2f}s"/>' for i,(x,y) in enumerate(points))
        return '<g class="core-life ultron-life" fill="none" aria-hidden="true"><ellipse class="ultron-energy" cx="300" cy="304" rx="115" ry="103"/><circle class="life-orbit ultron-orbit" cx="300" cy="300" r="236" pathLength="100"/><g class="ultron-current">' + flows + nodes + '</g></g>'
    return ''

def selection_life(kind):
    """Camadas 2D específicas, animadas só em cartões visíveis na galeria."""
    ticks = ''.join(f'<path d="M300 43v{9 if i%3 else 16}" transform="rotate({i*30} 300 300)"/>' for i in range(12))
    nodes = ''.join(f'<circle class="selector-node" cx="300" cy="61" r="{2.2 if i%2 else 3.1}" transform="rotate({i*60} 300 300)" style="--node-delay:-{i*.9:.1f}s"/>' for i in range(6))
    base = f'<g class="selector-graduation">{ticks}</g><g class="selector-orbit"><circle cx="300" cy="300" r="249" pathLength="100" stroke-dasharray="13 12 1 12 13 12 1 12"/><circle cx="300" cy="300" r="222" pathLength="100" stroke-dasharray="2 23 2 23 2 23 2 23"/></g>{nodes}'
    if kind == 'jarvis':
        detail = '<g class="selector-sweep"><path d="M300 300 448 209A174 174 0 0 1 467 350Z" class="selector-sector"/><path d="M300 300 448 209"/></g><g class="selector-routes"><path d="M106 300h38l24-24h37m290 24h-38l-24 24h-37M300 107v38l24 24v37" pathLength="100" stroke-dasharray="9 91"/></g><circle class="selector-heart" cx="300" cy="300" r="121"/>'
    elif kind == 'friday':
        detail = '<g class="selector-tactical"><path d="M125 228v-27h34m282 0h34v27M125 371v27h34m282 0h34v-27"/><path d="M300 104v30m196 166h-30M300 496v-30M104 300h30"/></g><g class="selector-sweep"><path d="M300 300 409 178A164 164 0 0 1 462 322Z" class="selector-sector"/></g><circle class="selector-heart" cx="300" cy="300" r="148"/>'
    elif kind == 'vision':
        detail = '<g class="selector-empathy"><ellipse cx="300" cy="300" rx="183" ry="77" transform="rotate(-30 300 300)"/><ellipse cx="300" cy="300" rx="183" ry="77" transform="rotate(30 300 300)"/></g><path class="selector-gem" d="m300 214 24 25-24 25-24-25Z"/><circle class="selector-heart" cx="300" cy="239" r="39"/>'
    elif kind == 'ultron':
        detail = '<g class="selector-neural"><path d="M208 266c52-58 117 1 99 48s-77 15-50-20 109-32 115 24-99 73-118 23M266 216c36 59-29 105 23 131s97-55 47-78-77 55-111 75" pathLength="100" stroke-dasharray="12 88"/><path d="m226 229 38 39 59-32 35 87-81 37-52-36 92-30"/></g><ellipse class="selector-heart" cx="300" cy="300" rx="104" ry="110"/>'
    elif kind == 'veronica':
        detail = '<g class="selector-gates"><path d="M197 174v-18h45m116 0h45v18M197 426v18h45m116 0h45v-18"/><path d="M173 237h-15v43m0 40v43h15m254-126h15v43m0 40v43h-15"/></g><path class="selector-lift" d="M300 199v200" pathLength="100" stroke-dasharray="9 91"/><circle class="selector-heart" cx="300" cy="343" r="22"/>'
    elif kind in ('karen','iris'):
        detail = '<g class="selector-sensors"><path d="m300 184 101 58v116l-101 58-101-58V242Z" stroke-dasharray="8 12"/><circle cx="300" cy="300" r="107" stroke-dasharray="4 22"/></g><g class="selector-sweep"><path d="M300 300 412 231A132 132 0 0 1 425 344Z" class="selector-sector"/></g><circle class="selector-heart" cx="300" cy="300" r="30"/>'
    else:
        detail = '<g class="selector-optics"><path d="M175 270v-19h28m201 0h28v19M175 346v19h28m201 0h28v-19"/><path d="M199 307h49m96 0h49m-172-38 35 77m77-88 35 77"/></g><path class="selector-lift" d="M183 250h234"/><circle class="selector-heart" cx="300" cy="300" r="146"/>'
    return f'<g class="core-life selector-life selector-{kind}" fill="none" aria-hidden="true">{base}{detail}</g>'

def svg(kind, embedded=True):
    href = 'data:image/png;base64,' + base64.b64encode((ROOT / 'assets/art' / f'{kind}-hud.png').read_bytes()).decode('ascii') if embedded else f'assets/art/{kind}-hud.png'
    label = ''
    if kind in ('jarvis', 'friday'):
        title = 'J.A.R.V.I.S.' if kind == 'jarvis' else 'F.R.I.D.A.Y.'
        sub = 'DISCRETION / LOYALTY' if kind == 'jarvis' else 'ANALYSIS / STRATEGY'
        label = f'<text class="core-word" x="300" y="307">{title}</text><text class="core-subtitle" x="300" y="331">{sub}</text>'
    metric = json.loads((ROOT / 'art-metrics.json').read_text('utf-8'))[kind]
    left, top, right, bottom = metric['bounds']
    factor = metric['targetDiameter'] / max(right-left, bottom-top)
    width, height = metric['width']*factor, metric['height']*factor
    x, y = 300-(left+right)*factor/2, 300-(top+bottom)*factor/2
    return f'<svg class="core-art core-{kind} generated-art" data-art-file="{kind}-hud.png" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image class="hud-art-image" href="{href}" x="{x:.3f}" y="{y:.3f}" width="{width:.3f}" height="{height:.3f}" preserveAspectRatio="xMidYMid meet"/>{label}{life_svg(kind)}{selection_life(kind)}</svg>'

def build():
    personas = json.loads((ROOT / 'personas.json').read_text('utf-8'))
    template = (ROOT / 'fonte/base.html').read_text('utf-8')
    css = '\n'.join((ROOT / 'fonte' / name).read_text('utf-8') for name in ['app.css', 'hud.css', 'guides.css', 'systems.css', 'living-systems.css', 'stark-systems.css', 'mobile.css', 'extensions.css', 'selection-motion.css', 'adaptive.css'])
    js = '\n'.join((ROOT / 'fonte' / name).read_text('utf-8') for name in ['connectors.js', 'core.js', 'platform.js', 'storage.js', 'cloud.js', 'device.js', 'documents.js', 'studio.js', 'compatibility.js', 'guide.js', 'app.js'])
    js = js.replace('/* CATALOG */ {}', json.dumps(json.loads((ROOT / 'api-presets.json').read_text('utf-8')), ensure_ascii=False))
    for embedded in (True, False):
        visuals = {key: svg(key, embedded) for key in personas}
        guide_art = 'data:image/png;base64,' + base64.b64encode((ROOT / 'assets/art/dum-e-u-hud.png').read_bytes()).decode('ascii') if embedded else 'assets/art/dum-e-u-hud.png'
        vendor_files={'pdf':'vendor/pdfjs/pdf.mjs','pdfWorker':'vendor/pdfjs/pdf.worker.mjs','pdfViewer':'vendor/pdfjs/pdf_viewer.mjs','pdfCSS':'vendor/pdfjs/pdf_viewer.css','pdfLib':'vendor/pdf-lib/pdf-lib.js','zip':'vendor/jszip/jszip.js','word':'vendor/docx/docx.js'}
        vendor_sources={key:(ROOT/path).read_text('utf-8') for key,path in vendor_files.items()} if embedded else {}
        data = json.dumps({'vendorSources':vendor_sources,'release':'15.0.0','personas':personas,'visuals':visuals,'guideArt':guide_art}, ensure_ascii=False).replace('</', '<\\/')
        html = template.replace('<!-- STYLE -->','<style>\n'+css+'\n</style>').replace('<!-- BOOTSTRAP -->','<script>\n'+(ROOT/'fonte/legacy.js').read_text('utf-8')+'\n</script>').replace('<!-- DATA -->','<script type="application/json" id="fusion-data">'+data+'</script>').replace('<!-- SCRIPT -->','<script>\n'+js+'\n</script>')
        if not embedded:
            html = html.replace('</head>','<link rel="manifest" href="manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="apple-touch-icon" href="assets/icons/icon-192.png"></head>')
            html = html.replace('</body>', '<script>if("serviceWorker" in navigator && location.protocol === "https:"){window.addEventListener("load",function(){navigator.serviceWorker.register("./sw.js").catch(function(){});});}</script></body>')
        (ROOT / ('JARVIS_MK_XV.html' if embedded else 'index.html')).write_text(html,'utf-8')
    dist = ROOT / 'dist'
    (dist / 'assets').mkdir(parents=True,exist_ok=True)
    shutil.copytree(ROOT/'assets/art',dist/'assets/art',dirs_exist_ok=True)
    if (ROOT/'assets/icons').exists():shutil.copytree(ROOT/'assets/icons',dist/'assets/icons',dirs_exist_ok=True)
    shutil.copytree(ROOT/'vendor',dist/'vendor',dirs_exist_ok=True)
    shutil.copyfile(ROOT/'index.html',dist/'index.html')
    shutil.copyfile(ROOT/'assets/favicon.svg',dist/'assets/favicon.svg')
    manifest={'name':'J.A.R.V.I.S. MK XV','short_name':'J.A.R.V.I.S.','start_url':'./','scope':'./','display':'standalone','background_color':'#040e15','theme_color':'#040e15','lang':'pt-BR','icons':[{'src':'assets/icons/icon-192.png','sizes':'192x192','type':'image/png'},{'src':'assets/icons/icon-512.png','sizes':'512x512','type':'image/png'}]}
    (ROOT/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),'utf-8')
    shutil.copyfile(ROOT/'manifest.webmanifest',dist/'manifest.webmanifest')
    revision=hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest()[:12]
    worker = (ROOT/'fonte/service-worker.js').read_text('utf-8').replace('__CACHE_VERSION__',revision)
    (ROOT/'sw.js').write_text(worker,'utf-8');(dist/'sw.js').write_text(worker,'utf-8')
    print('J.A.R.V.I.S. MK XV: HTML portátil', (ROOT/'JARVIS_MK_XV.html').stat().st_size, 'bytes; entrada web', (dist/'index.html').stat().st_size, 'bytes; 8 artes 2D sob demanda.')
if __name__ == '__main__':
    build()
