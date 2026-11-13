from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
BASE=Path(__file__).resolve().parent.parent
A=BASE/'public/assets';S=Image.Resampling.NEAREST
bg='#102317';fg='#F3F0DE';accent='#B7E35B';secondary='#ABC4B2'
W,H=1290,1150
out=Image.new('RGB',(W,H),bg);d=ImageDraw.Draw(out)
try:
    ft='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';font=lambda sz:ImageFont.truetype(ft,sz)
except:font=lambda sz:ImageFont.load_default()
def title(x,y,s,size=22,color=fg):d.text((x,y),s,font=font(size),fill=color)
def border(x,y,w,h):d.rounded_rectangle((x,y,x+w,y+h),radius=12,outline='#597F62',width=2)
def picture(file,x,y,size=None,scale=None):
    img=Image.open(A/file).convert('RGBA')
    if size:img=img.resize(size,S)
    if scale:img=img.resize((img.width*scale,img.height*scale),S)
    out.paste(img,(x,y),img)

title(36,18,'FIELD SHIFT  |  LOTE P1 — ARTES DE DEMONSTRAÇÃO',31,accent)
title(36,62,'Tema noturno, personagens, objetos neutros, tiles e transição para revisão',16,secondary)
border(28,105,1234,353)
title(46,119,'1. CENÁRIO NOTURNO  •  tema decorativo',19)
picture('environment/field-night.png',48,150)
title(48,443,'field-night.png  •  512 × 288',14,secondary)
picture('environment/field-night.png',640,192,(432,243))
title(641,443,'Mesmo alinhamento de talhões/camadas P0',14,secondary)
border(28,473,1234,239)
title(46,485,'2. PERSONAGENS FICTÍCIAS  •  poses e conversas',19)
for i,(key,label) in enumerate([('producer-neutral','Produtora: neutra'),('producer-talk','Produtora: conversa'),('technician-neutral','Técnica: neutra'),('technician-talk','Técnica: conversa')]):
    x=55+i*300
    picture('characters/'+key+'.png',x,535,scale=2)
    title(x,676,label,15)
border(28,725,1234,187)
title(46,738,'3. OBJETOS TÉCNICOS  •  32px',19)
for i,(key,label) in enumerate([('clipboard','Prancheta'),('sample','Amostra'),('tablet','Tablet'),('report','Relatório')]):
    x=60+i*140
    picture('objects/'+key+'.png',x,800,scale=2)
    title(x,872,label,13)
title(620,746,'4. TILES NEUTROS  •  32px / tile',19)
picture('tiles/neutral-terrain-sheet.png',680,775,scale=2)
title(947,803,'Solo / caminho / grama / água',13,secondary)
title(947,823,'Variações neutras sem culturas',13,secondary)
border(28,926,1234,188)
title(46,937,'5. TRANSIÇÃO — três hipóteses → revisão técnica  •  8 × 100ms',19)
sheet=Image.open(A/'transitions/transition-review-sheet.png').convert('RGBA')
for i in range(8):
    fr=sheet.crop((512*i,0,512*(i+1),288))
    fr=fr.resize((144,81),S)
    x=48+i*151;y=991
    out.paste(fr,(x,y),fr)
    title(x+3,1080,str(i+1),12,secondary)
p=BASE/'preview/fieldshift-p1-overview.png';out.save(p,optimize=True)
print(p)
