"""Build presentation-only previews. Not used in runtime."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent.parent
A=ROOT/'public/assets'
P=ROOT/'preview'
P.mkdir(exist_ok=True)
BG='#101D1A';PANEL='#1A2C25';EDGE='#436248';WHITE='#F3F0DE';LEAF='#B7E35B';MUTE='#B7C9B8'
try:
 font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
 def F(sz):return ImageFont.truetype(font,sz)
except:
 def F(sz):return ImageFont.load_default()
W,H=1250,1580
out=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(out)

def heading(s,y,size=30):d.text((40,y),s,font=F(size),fill=WHITE)
def lbl(s,x,y,size=16,col=MUTE):d.text((x,y),s,font=F(size),fill=col)
def panel(x,y,w,h):d.rounded_rectangle((x,y,x+w,y+h),radius=14,fill=PANEL,outline=EDGE,width=2)
def load(rel):return Image.open(A/rel).convert('RGBA')
def paste(rel,x,y,w=None,h=None,scale=None):
 im=load(rel)
 if scale: im=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)
 elif w and h: im=im.resize((w,h),Image.Resampling.NEAREST)
 out.paste(im,(x,y),im)

d.text((40,30),'FIELD SHIFT  |  ASSETS IMERSIVOS  P0',font=F(31),fill=LEAF)
lbl('Sprite pack v1.0   •   43 PNGs   •   pixel art original   •   spritesheets + fallback',40,80,17)
heading('Cena modular (composição de referência)',133,23)
panel(40,176,1170,435)
# Render scene at 768x432, preserving its 16:9 ratio.
scene=load('environment/field-scene-reference.png').resize((768,432),Image.Resampling.NEAREST)
out.paste(scene,(55,179),scene)
# render right info in side
lbl('CAMADAS',845,218,18,LEAF)
for i,k in enumerate(['sky','horizon','plots','foreground','buildings']):lbl(['01  Ceu / luz','02  Horizonte','03  Talhoes','04  Primeiro plano','05  Construcoes'][i],845,263+i*52,16)
heading('Sistema de evidencia  (32 + 16 px)',650,23)
panel(40,689,1170,170)
for i,k in enumerate(['nasa','farmer','regional','unknown','source','review']):
    x=65+i*193
    paste(f'evidence/evidence-{k}.png',x+31,710,96,96)
    lbl(k.upper(),x+22,813,13)
heading('Fundos de cenarios (composicoes neutras)',901,23)
panel(40,939,1170,195)
for i,k in enumerate(['continuity','soil','water','empty']):
 x=60+i*290
 paste(f'scenarios/scenario-{k}.png',x,960,267,156)
 lbl(['A • Continuidade','B • Alternancia','C • Grade climatica','Sem proposta'][i],x+6,1110,13)
heading('Navegacao e estados de interacao',1170,23)
panel(40,1208,1170,312)
# nav frames: src total 384 x 48. enlarge x2 makes 768 x96
paste('journey/journey-nav-sheet.png',66,1242,768,96)
lbl('DEFAULT  →',66,1350,14)
lbl('ACTIVE  →',466,1350,14)
# rows of spritesheets displayed at scale x1.6-ish
for j,k in enumerate(['selection-ring','slot-place','analysis-loading','draft-saved']):
    im=load(f'interactions/{k}-sheet.png')
    w=im.width; hh=im.height
    # scaled to 1x since quite wide
    x=60 if j%2==0 else 648
    y=1393 if j<2 else 1456
    if w>520:im=im.resize((int(w*.8),int(hh*.8)),Image.Resampling.NEAREST)
    out.paste(im,(x,y),im)
    lbl(k,x,y-17,12)
out.save(P/'fieldshift-assets-overview.png',optimize=True)
# separate 2nd preview for sky/horizon & NASA
W2,H2=1250,760
b=Image.new('RGB',(W2,H2),BG);dr=ImageDraw.Draw(b)
dr.text((40,20),'FIELD SHIFT  |  NASA E INTERACOES',font=F(31),fill=LEAF)
dr.text((40,90),'Terra / orbita: 4 frames de 256 x 256',font=F(18),fill=WHITE)
earth=load('nasa/earth-orbit-sheet.png')
b.paste(earth,(60,126),earth)
for i,(key,label) in enumerate([('satellite','Satelite: 6 frames'),('data-pulse','Pulso de dados: 6 frames')]):
 y=421+i*116
 dr.text((50,y),label,font=F(18),fill=WHITE)
 sprite=load(f'nasa/{key}-sheet.png').resize((768,128),Image.Resampling.NEAREST)
 if y+130>H2: sprite=sprite.resize((576,96),Image.Resampling.NEAREST)
 b.paste(sprite,(440,y-12),sprite)
b.save(P/'fieldshift-animations-overview.png',optimize=True)
print('previews generated')
