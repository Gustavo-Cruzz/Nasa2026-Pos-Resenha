"""Validate immutable names/dimensions/frames/transparency/budget for Field Shift P0."""
from pathlib import Path
from PIL import Image
import json
ROOT=Path(__file__).resolve().parent.parent
A=ROOT/'public/assets'
E={
'environment/field-sky-day.png':(512,288,'opaque'),
'environment/field-horizon.png':(512,288,'alpha'),
'environment/field-plots.png':(512,288,'alpha'),
'environment/field-foreground.png':(512,288,'alpha'),
'environment/farm-buildings.png':(256,128,'alpha'),
'environment/field-scene-reference.png':(512,288,'opaque'),
'scenarios/scenario-continuity.png':(192,112,'color'),
'scenarios/scenario-soil.png':(192,112,'color'),
'scenarios/scenario-water.png':(192,112,'color'),
'scenarios/scenario-empty.png':(192,112,'color'),
'journey/journey-nav-sheet.png':(384,48,'alpha'),
'nasa/earth-orbit-sheet.png':(1024,256,'alpha'),
'nasa/earth-orbit-static.png':(256,256,'alpha'),
'nasa/satellite-sheet.png':(384,64,'alpha'),
'nasa/satellite-static.png':(64,64,'alpha'),
'nasa/data-pulse-sheet.png':(384,64,'alpha'),
'nasa/data-pulse-static.png':(64,64,'alpha'),
'nasa/climate-grid-overlay.png':(512,288,'alpha'),
'interactions/selection-ring-sheet.png':(384,64,'alpha'),
'interactions/selection-ring-static.png':(64,64,'alpha'),
'interactions/slot-place-sheet.png':(384,64,'alpha'),
'interactions/slot-place-static.png':(64,64,'alpha'),
'interactions/analysis-loading-sheet.png':(512,64,'alpha'),
'interactions/analysis-loading-static.png':(64,64,'alpha'),
'interactions/draft-saved-sheet.png':(256,64,'alpha'),
'interactions/draft-saved-static.png':(64,64,'alpha'),
'interactions/unknown-placeholder.png':(64,64,'alpha'),
}
for kind in ['nasa','farmer','regional','unknown','source','review']:
 E[f'evidence/evidence-{kind}.png']=(32,32,'alpha')
 E[f'evidence/evidence-{kind}-16.png']=(16,16,'alpha')
for kind in ['explore','farm','lab','compare']:
 E[f'journey/journey-{kind}.png']=(48,48,'alpha')
counts={'nasa/earth-orbit-sheet.png':(4,256),'nasa/satellite-sheet.png':(6,64),'nasa/data-pulse-sheet.png':(6,64),
'journey/journey-nav-sheet.png':(8,48),'interactions/selection-ring-sheet.png':(6,64),
'interactions/slot-place-sheet.png':(6,64),'interactions/analysis-loading-sheet.png':(8,64),'interactions/draft-saved-sheet.png':(4,64)}
manifest=[]; problems=[]
for rel,(w,h,alpha) in E.items():
 p=A/rel
 if not p.exists():problems.append('MISSING '+rel);continue
 im=Image.open(p)
 if im.size!=(w,h):problems.append('DIM '+rel+' '+str(im.size))
 if alpha=='alpha':
  if im.mode!='RGBA':problems.append('NOT RGBA '+rel)
  elif im.getchannel('A').getextrema()[0]!=0:problems.append('NO TRANSPARENT PIXELS '+rel)
 if alpha=='opaque':
  if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]!=255:problems.append('NOT OPAQUE '+rel)
 limit=250_000 if w>=512 and h>=200 else (120_000 if 'sheet' in rel else 40_000)
 if p.stat().st_size>limit:problems.append('OVER BUDGET '+rel)
 frames,size=counts.get(rel,(1,None))
 if size and (w!=frames*size or h!=size):problems.append('FRAME GRID '+rel)
 manifest.append({'file':'public/assets/'+rel,'width':w,'height':h,'format':'PNG','mode':im.mode,'bytes':p.stat().st_size,'frameCount':frames,'frameWidth':size or w,'frameHeight':size or h,'hasTransparency':im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0})
others=[str(p.relative_to(ROOT)) for p in A.rglob('*.png') if str(p.relative_to(A)) not in E]
if others:problems.append('UNTRACKED: '+','.join(others))
with open(ROOT/'assets-manifest.json','w') as f:json.dump({'project':'Field Shift','version':'1.0','p0Files':len(manifest),'files':manifest,'issues':problems},f,indent=2)
if problems:
 print('\n'.join(problems));raise SystemExit(1)
print(f'PASS: {len(manifest)} PNG assets valid, dims, transparency, sprite grids, size budgets.')
