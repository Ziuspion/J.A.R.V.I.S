"""Gera uma aplicação completa em UM HTML, sem instalar dependências."""
from pathlib import Path
from math import sin,cos,pi
import json
ROOT=Path(__file__).resolve().parent

def path_arc(r,a,b,cx=300,cy=300):
 return f'M{cx+cos(a)*r:.2f},{cy+sin(a)*r:.2f} A{r} {r} 0 0 1 {cx+cos(b)*r:.2f},{cy+sin(b)*r:.2f}'
def circle(r,klass='soft',width=1):return f'<circle cx="300" cy="300" r="{r}" class="{klass}" stroke-width="{width}"/>'
def ticks(r,count=96,large=10,small=4):
 out=[]
 for i in range(count):
  a=i*2*pi/count;rr=r+(large if i%8==0 else small)
  out.append(f'<path d="M{300+cos(a)*r:.2f},{300+sin(a)*r:.2f} {300+cos(a)*rr:.2f},{300+sin(a)*rr:.2f}"/>')
 return ''.join(out)
def svg(kind):
 out=[f'<svg class="core-art core-{kind}" viewBox="0 0 600 600" aria-hidden="true"><g class="subtle" stroke-width=".7"><path d="M300 23v26m0 502v26M23 300h27m500 0h27"/><path d="M67 139h30l23 23m413-23h-30l-23 23M67 461h30l23-23m413 23h-30l-23-23"/></g>']
 if kind=='jarvis':
  out.extend([circle(247,'subtle',.7),circle(229,'soft',1),'<g class="rotor-a glow-line" stroke-width="3">'])
  for i in range(10):out.append(f'<path d="{path_arc(238,i*pi/5+.035,i*pi/5+.52)}" opacity="{.8 if i%3 else .3}"/>')
  out.extend(['</g><g class="soft" stroke-width=".85">',ticks(219,96,11,4),'</g>',circle(196,'band',27),'<g class="rotor-b" stroke-width="1">'])
  for i in range(64):
   a=i*pi/32;r=184;rr=207
   out.append(f'<path class="soft" d="M{300+cos(a)*r:.2f},{300+sin(a)*r:.2f} {300+cos(a)*rr:.2f},{300+sin(a)*rr:.2f}"/>')
  out.extend(['</g>',circle(177,'bright glow-line',3),circle(169,'soft',1),'<g class="rotor-a subtle">'])
  for i in range(48):out.append(f'<rect x="296" y="140" width="8" height="12" rx="2" transform="rotate({i*7.5} 300 300)"/>')
  out.extend(['</g>',circle(143,'soft',1),circle(125,'subtle',1),'<g class="rotor-b secondary" stroke-width="3">'])
  for a,b in [(-2.9,-2.0),(.5,.84)]:out.append(f'<path d="{path_arc(185,a,b)}"/>')
  out.extend(['</g><g class="subtle" stroke-width=".6"><path d="M215 259h28l15-15h84l19 19h31m-164 85h22l14 15h74l17-17h31M231 230h44m54 0h29M245 383h108"/><circle cx="249" cy="348" r="3"/><circle cx="359" cy="263" r="3"/></g><text class="core-word" x="300" y="312">J.A.R.V.I.S.</text><text class="core-subtitle" x="300" y="339">PERSONAL INTELLIGENCE</text>'])
 elif kind=='friday':
  out.extend([circle(240,'subtle',1),'<g class="rotor-a bright" stroke-width="7">'])
  for a,b in [(-1.53,-.14),(.07,1.4),(1.63,2.94),(3.23,4.58)]:out.append(f'<path d="{path_arc(233,a,b)}"/>')
  out.extend(['</g><g class="soft" stroke-width="1">',ticks(206,48,16,8),'</g>',circle(181,'soft',1),'<g class="rotor-b" stroke-width="28">'])
  for i in range(24):
   if i in (4,5,15):continue
   out.append(f'<path class="{ "bright" if i%7 else "band"}" d="{path_arc(171,i*pi/12+.015,i*pi/12+.235)}"/>')
  out.extend(['</g>',circle(148,'bright glow-line',8),circle(130,'soft',1),circle(116,'subtle',1),circle(100,'subtle',1),'<path class="secondary" stroke-width="3" d="'+path_arc(190,-3.05,-1.0)+'"/>'])
  for i in range(4):out.append(f'<circle class="core-fill" cx="{300+cos(-2.55+i*.045)*218:.1f}" cy="{300+sin(-2.55+i*.045)*218:.1f}" r="3"/>')
  out.extend(['<text class="core-word" x="300" y="311">F.R.I.D.A.Y.</text><text class="core-subtitle" x="300" y="338">READY WHEN YOU ARE</text>'])
 elif kind=='edith':
  out.extend(['<g class="soft" stroke-width="1"><path d="M36 190v-32h95m338 0h95v32M36 403v35h95m338 0h95v-35M46 184h118l19-15h233l19 15h119M46 412h118l19 15h233l19-15h119"/><rect x="194" y="191" width="212" height="215" rx="5"/><path d="M186 191v215m228-215v215"/></g><g class="bright glow-line" stroke-width="2"><path d="M40 215v-27h34m452 0h34v27M40 385v27h34m452 0h34v-27"/></g>'])
  for cx in [118,482]:
   for r,o in [(74,.2),(64,.5),(49,.2),(35,.6),(22,.25)]:out.append(f'<circle cx="{cx}" cy="300" r="{r}" opacity="{o}" stroke-width="1"/>')
   out.append(f'<circle class="scan-ring" cx="{cx}" cy="300" r="59" stroke-dasharray="4 9" stroke-width="3" opacity=".55"/>')
   for i in range(24):
    a=i*pi/12;out.append(f'<path class="subtle" d="M{cx+cos(a)*68:.2f},{300+sin(a)*68:.2f} {cx+cos(a)*76:.2f},{300+sin(a)*76:.2f}"/>')
   out.append(f'<path class="secondary soft" d="M{cx-16} 300h32m-16-16v32"/>')
  out.append('<g class="holo-face" stroke-width="1"><path d="M300 213C264 213 245 243 248 281L255 330 274 363 300 378 326 363 345 330 352 281C355 243 336 213 300 213Z"/><path d="M252 260q48-25 96 0M249 281q51-24 102 0M253 304q47-13 94 0M258 326q42-12 84 0M271 349q29-7 58 0M300 214v164M280 218q-18 71 4 149m36-149q18 71-4 149M261 238q-4 54 11 104m67-104q4 54-11 104"/><path class="bright" d="m265 281 19-3m32 0 19 3M300 282l-8 35h16m-25 24q17 6 34 0"/><path d="m256 269 25-9 19 12 19-12 25 9M256 320l24-16 20 12 20-12 24 16M271 349l29-22 29 22"/></g><g class="soft secondary" stroke-width="1">')
  for sign in [-1,1]:
   points=[]
   for i in range(101):
    x=65+i*4.7;y=459+sin(i*.20+sign*.7)*7*sign;points.append(f'{x:.1f},{y:.1f}')
   out.append('<polyline points="'+' '.join(points)+'"/>')
  out.extend(['</g><text class="core-word" x="300" y="511">E.D.I.T.H.</text><text class="core-subtitle" x="300" y="535">TACTICAL CLARITY</text>'])
 elif kind=='ultron':
  out.extend([circle(239,'subtle',1),'<g class="rotor-a soft" stroke-width="2">'])
  for i in range(12):out.append(f'<path d="{path_arc(227,i*pi/6+.04,i*pi/6+.43)}"/>')
  out.extend(['</g><g class="subtle" stroke-width=".8">',ticks(241,72,10,4),'</g><path class="soft" d="m300 76 194 112v224L300 524 106 412V188Z"/><g class="metal-face" stroke-width="1.1"><path class="face-shell" d="m300 121 77 33 34 68-6 118-38 77-67 42-67-42-38-77-6-118 34-68Z"/><path d="m300 121-22 77 22 48 22-48-22-77m-77 33 55 44-58 42-31-18m188-68-55 44 58 42 31-18M220 240l18 79 39 22 23-35 23 35 39-22 18-79M195 340l43-21-5 98m172-77-43-21 5 98M238 319l-8-53m132 53 8-53M277 341l-12 43 35 19 35-19-12-43M265 384l-7 29 42 23 42-23-7-29M233 417l25-4m109 4-25-4"/><path class="eyes" d="m225 265 58 16-12 14-40-11Zm150 0-58 16 12 14 40-11Z"/><path class="jaw" d="M279 363h42m-46 9h50m-45 9h40"/></g><text class="core-word" x="300" y="506">ULTRON</text><text class="core-subtitle" x="300" y="531">PRECISION ENGINE</text>'])
 out.append('</svg>');return ''.join(out)

def build():
 personas=json.loads((ROOT/'personas.json').read_text('utf-8'))
 visuals={key:svg(key) for key in personas}
 html=(ROOT/'fonte/base.html').read_text('utf-8')
 css=(ROOT/'fonte/app.css').read_text('utf-8')
 js=(ROOT/'fonte/core.js').read_text('utf-8')+'\n'+(ROOT/'fonte/app.js').read_text('utf-8')
 data=json.dumps({'personas':personas,'visuals':visuals},ensure_ascii=False).replace('</','<\\/')
 html=html.replace('<!-- STYLE -->','<style>\n'+css+'\n</style>').replace('<!-- DATA -->','<script type="application/json" id="fusion-data">'+data+'</script>').replace('<!-- SCRIPT -->','<script>\n'+js+'\n</script>')
 for name in ['index.html','JARVIS_FUSION_MK_XIV.html']:(ROOT/name).write_text(html,'utf-8')
 print('Fusion MK XIV:',len(html.encode()),'bytes por HTML, quatro identidades, sem arquivos externos obrigatórios.')
if __name__=='__main__':build()
