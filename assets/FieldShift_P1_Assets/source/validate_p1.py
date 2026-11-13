"""Validate runtime image package P1, names, alpha, exact sizes and frame bounds."""
from pathlib import Path
from PIL import Image
import sys
ROOT=Path(__file__).resolve().parent.parent
A=ROOT/'public/assets'
assert A.is_dir(),'Missing assets directory'
expected={
 'environment/field-night.png':((512,288),'RGB'),
 'environment/field-night-lights.png':((512,288),'RGBA'),
 'environment/field-sky-night.png':((512,288),'RGB'),
 'characters/producer-neutral.png':((64,64),'RGBA'),
 'characters/producer-talk.png':((64,64),'RGBA'),
 'characters/producer-talk-sheet.png':((256,64),'RGBA'),
 'characters/technician-neutral.png':((64,64),'RGBA'),
 'characters/technician-talk.png':((64,64),'RGBA'),
 'characters/technician-talk-sheet.png':((256,64),'RGBA'),
 'objects/clipboard.png':((32,32),'RGBA'),
 'objects/sample.png':((32,32),'RGBA'),
 'objects/tablet.png':((32,32),'RGBA'),
 'objects/report.png':((32,32),'RGBA'),
 'tiles/neutral-terrain-sheet.png':((128,64),'RGBA'),
 'transitions/transition-review-sheet.png':((4096,288),'RGBA'),
 'transitions/transition-review-static.png':((512,288),'RGBA'),
}
for kind in ['grass','path','soil','water']:
    for suffix in ['','-alt']:
        expected['tiles/tile-'+kind+suffix+'.png']=((32,32),'RGBA')
failures=[]
for path,(dims,mode) in expected.items():
    f=A/path
    if not f.exists():failures.append('missing: '+path);continue
    I=Image.open(f);I.load()
    if I.size!=dims:failures.append('size mismatch: '+path+str(I.size))
    if I.mode!=mode:failures.append('mode mismatch: '+path+I.mode)
    cap=250*1024 if path.startswith('environment/') else 120*1024 if path.endswith('-sheet.png') else 40*1024
    if f.stat().st_size>cap:failures.append('oversized: '+path)
    if mode=='RGBA' and not path.startswith('tiles/') and path!='transitions/transition-review-static.png' and not path.endswith('transition-review-sheet.png'):
        minimum,maximum=I.getchannel('A').getextrema()
        if minimum!=0:failures.append('no fully transparent pixel: '+path)
        if maximum==0:failures.append('entirely transparent: '+path)
# Static fallback must be same as last frame of 8-frame sheet
if (A/'transitions/transition-review-sheet.png').exists():
    sheet=Image.open(A/'transitions/transition-review-sheet.png').convert('RGBA')
    last=sheet.crop((7*512,0,8*512,288))
    stat=Image.open(A/'transitions/transition-review-static.png').convert('RGBA')
    if last.tobytes()!=stat.tobytes():failures.append('review static not equal to last animation frame')
# No stray assets with duplicate filenames
files=list(A.rglob('*.png'))
if len(files)!=len(expected):failures.append(f'Expected {len(expected)} images, found {len(files)}')
if failures:
    print('FAIL',len(failures));print('\n'.join(failures));sys.exit(1)
print(f'PASS: {len(expected)} PNG assets validated (dimension, mode, filesize, transparency and final frame).')
