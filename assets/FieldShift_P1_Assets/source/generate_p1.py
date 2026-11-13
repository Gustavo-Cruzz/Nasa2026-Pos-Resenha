"""Field Shift P1 neutral pixel-art asset generator.
Original hand-authored procedural art, based on the existing P0 palette/layout.
Requires Pillow. Run: python source/generate_p1.py
All runtime imagery is text-free, no third-party graphical assets included.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import random, math, json, hashlib

ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'public'/'assets'
# Prefer existing P0 assets after merging into a repository; otherwise use bundled art references.
P0=BASE if (BASE/'environment'/'field-sky-day.png').exists() else ROOT/'source'/'p0_reference'
for cat in ['environment','characters','objects','tiles','transitions']:
    (BASE/cat).mkdir(parents=True,exist_ok=True)
random.seed(20261113)
N=Image.Resampling.NEAREST
PA={
 'forest':'#102317','outline':'#25392B','leaf':'#B7E35B',
 'soil':'#76543A','straw':'#D2B46C','sky':'#6A9FA3','cream':'#F3F0DE',
 'alert':'#E5B94E','moss':'#366A47','grass':'#659947',
 'teal':'#77C7C4','dark':'#142C33','soilshade':'#4F382B',
 'lightwood':'#B38457','coat':'#EEE5CB', 'metal':'#8FA9A1',
 'tealnight':'#31546A','night':'#152A45', 'window':'#F2C17A',
}
OUT=PA['outline']

def im(w,h,opaque=False,color=None):
    return Image.new('RGBA',(w,h),color if color else ('#152A45' if opaque else (0,0,0,0)))
def d(im):return ImageDraw.Draw(im)
def R(dr,bb,c):dr.rectangle(tuple(map(int,bb)),fill=c)
def L(dr,pts,c,w=1):dr.line([(int(x),int(y)) for x,y in pts],fill=c,width=w)
def P(dr,pts,c):dr.polygon([(int(x),int(y)) for x,y in pts],fill=c)
def E(dr,bb,c,outline=None,width=1):dr.ellipse(tuple(map(int,bb)),fill=c,outline=outline,width=width)
def save(img,filename,scale=1,opaque=False):
    out=BASE/filename
    out.parent.mkdir(parents=True,exist_ok=True)
    if scale!=1: img=img.resize((img.width*scale,img.height*scale),N)
    img=img.convert('RGB' if opaque else 'RGBA')
    img.save(out,format='PNG',optimize=True)
    return out

def pixcrop_png(path):
    return Image.open(path).convert('RGBA').resize((256,144),N)

def shade_layer(layer, tint=(40,74,100), intensity=.47, alpha_factor=1.0):
    res=layer.copy().convert('RGBA'); q=res.load()
    for y in range(res.height):
        for x in range(res.width):
            r,g,b,a=q[x,y]
            if a:
                q[x,y]=(int(r*(1-intensity)+tint[0]*intensity),
                          int(g*(1-intensity)+tint[1]*intensity),
                          int(b*(1-intensity)+tint[2]*intensity),int(a*alpha_factor))
    return res

def draw_night_sky():
    s=im(256,144,True,'#182D4B');dr=d(s)
    bands=['#142640','#182D4B','#1B3553','#294561','#345A70','#4A6C72']
    for y in range(144):
        R(dr,(0,y,255,y),bands[min(5,y//26)])
    # Sparse decorative sky stars, NOT observation / astronomical model.
    rng=random.Random(3409)
    for j in range(47):
        x=rng.randrange(4,250);y=rng.randrange(4,64)
        if 161<x<196 and 9<y<47:continue
        c='#C7D9C8' if j%4 else '#E5E5C7'
        R(dr,(x,y,x,y),c)
        if j%12==0:
            R(dr,(x-1,y,x+1,y),c);R(dr,(x,y-1,x,y+1),c)
    # moon is purely decorative
    E(dr,(166,13,188,35),'#E5D9A3','#C1CFBF',1)
    R(dr,(169,19,171,21),'#D7CCA0');R(dr,(177,26,180,27),'#D7CCA0')
    # horizontal pixel clouds, kept dim
    for x,y in [(23,25),(68,52),(205,34),(117,39)]:
        R(dr,(x,y+4,x+30,y+7),'#344B69');R(dr,(x+4,y+2,x+24,y+4),'#3E5675')
        R(dr,(x+11,y,x+20,y+3),'#47617F')
    return s

def build_night():
    out=draw_night_sky()
    for k,strength in [('field-horizon.png',.59),('field-plots.png',.55),('field-foreground.png',.52)]:
        layer=pixcrop_png(P0/'environment'/k)
        out.alpha_composite(shade_layer(layer,(31,56,65),strength))
    building=Image.open(P0/'environment'/'farm-buildings.png').convert('RGBA').resize((128,64),N)
    building=shade_layer(building,(38,47,53),.53)
    out.alpha_composite(building,(128,46))
    dr=d(out)
    # windows lit; decorations only, no agricultural status implication
    R(dr,(190,59,196,64),PA['window']); R(dr,(191,59,195,61),'#FFF0BA')
    R(dr,(182,68,187,75),'#D8A466');R(dr,(183,69,186,73),'#F2CE82')
    # little fence post lanterns
    for x,y in [(20,116),(234,116)]:
        R(dr,(x-2,y-2,x+2,y+4),OUT)
        R(dr,(x-1,y-1,x+1,y+2),PA['window'])
    save(out,'environment/field-night.png',2,opaque=True)
    # Optional transparent, crisp additive-style night accents, no blur
    light=im(256,144);ld=d(light)
    for x,y,sz in [(193,62,11),(185,71,6),(20,117,8),(234,117,8)]:
        for k,alp in [(sz,(231,194,105,16)),(sz//2,(242,208,130,25))]:
            R(ld,(x-k,y-k//2,x+k,y+k//2),alp)
        R(ld,(x-1,y-1,x+1,y+1),(255,226,153,100))
    save(light,'environment/field-night-lights.png',2)
    # modular sky replacement for users wishing day P0 composition at nighttime
    save(draw_night_sky(),'environment/field-sky-night.png',2,opaque=True)
    return out

# --------- Character silhouettes (32x32 logical, x2 export = 64) ---------
def character(role,talk=False,phase=0):
    a=im(32,32);dr=d(a)
    # Positioning always constant: ground y=30, no shadow into other sprites
    if role=='producer':
        # bushy brown hair, boots, overalls, broad straw hat
        R(dr,(11,23,14,28),OUT);R(dr,(17,23,20,28),OUT)
        R(dr,(11,26,15,29),'#5C4A3D');R(dr,(17,26,21,29),'#5C4A3D')
        R(dr,(11,19,20,25),OUT);R(dr,(12,20,19,25),'#607F53')
        R(dr,(14,19,17,25),'#9D6E49')
        # shirt
        R(dr,(10,13,21,21),OUT);R(dr,(11,14,20,20),'#8DAF6D')
        R(dr,(13,18,18,22),'#9C6A45')
        # arms pose (talk motion only)
        if talk and phase in [1,2]:
            R(dr,(7,14,10,19),OUT);R(dr,(7,17,10,19),'#BF926B')
            L(dr,[(21,15),(25,12),(27,10 if phase==2 else 12)],OUT,3)
            R(dr,(26,9 if phase==2 else 11,28,12 if phase==2 else 14),'#C7946F')
        else:
            R(dr,(7,15,10,23),OUT);R(dr,(8,19,10,23),'#C7946F')
            R(dr,(21,15,24,23),OUT);R(dr,(21,19,23,23),'#C7946F')
        # hair dark behind face
        R(dr,(11,7,21,16),OUT)
        R(dr,(12,8,20,16),'#654232')
        R(dr,(13,8,19,15),'#D5A27B')
        R(dr,(14,11,14,12),OUT); R(dr,(18,11,18,12),OUT)
        R(dr,(15,14,17,14),'#965846')
        # hat brim and ribbon
        R(dr,(7,7,24,9),OUT);R(dr,(9,5,22,7),PA['straw'])
        R(dr,(12,3,20,6),OUT);R(dr,(13,3,19,6),'#E0C786')
        R(dr,(12,6,20,6),'#6F6941')
    else:
        # curly dark hair, glasses and pale technical jacket
        R(dr,(11,25,14,28),OUT);R(dr,(17,25,20,28),OUT)
        R(dr,(10,27,14,30),'#59483C');R(dr,(17,27,21,30),'#59483C')
        R(dr,(11,19,21,26),OUT);R(dr,(12,20,20,25),'#435A6D')
        R(dr,(10,13,22,22),OUT);R(dr,(11,14,21,21),PA['coat'])
        R(dr,(14,14,18,21),'#5DAB96')
        R(dr,(11,15,13,19),'#D7D6BA')
        R(dr,(19,15,21,19),'#D7D6BA')
        if talk and phase in [1,2]:
            L(dr,[(22,15),(25,13),(27,12 if phase==2 else 14)],OUT,3)
            R(dr,(26,11 if phase==2 else 13,28,14 if phase==2 else 16),'#AA7159')
            R(dr,(7,16,9,22),PA['coat'])
        else:
            R(dr,(8,15,10,22),PA['coat']);R(dr,(22,15,24,22),PA['coat'])
            R(dr,(8,22,10,23),'#AE7B61');R(dr,(22,22,24,23),'#AE7B61')
        # bun and textured hair
        E(dr,(9,3,13,7),OUT);R(dr,(11,5,21,13),OUT)
        R(dr,(12,8,20,15),'#B9866A')
        for x,y in [(11,5),(13,3),(16,4),(19,5),(21,7)]:R(dr,(x,y,x+2,y+2),'#4A302A')
        R(dr,(12,10,15,12),OUT);R(dr,(17,10,20,12),OUT)
        R(dr,(13,11,14,11),PA['cream']);R(dr,(18,11,19,11),PA['cream'])
        R(dr,(15,11,17,11),OUT)
        R(dr,(15,14,17,14),'#6C4637')
        R(dr,(11,4,13,4),'#80604D')
    return a

def build_characters():
    for role in ['producer','technician']:
        n=character(role,False);talk=character(role,True,2)
        save(n,f'characters/{role}-neutral.png',2)
        save(talk,f'characters/{role}-talk.png',2)
        frames=[character(role,True,0),character(role,True,1),character(role,True,2),character(role,True,1)]
        sheet=im(32*len(frames),32)
        for i,fr in enumerate(frames):sheet.alpha_composite(fr,(32*i,0))
        save(sheet,f'characters/{role}-talk-sheet.png',2)

# --------- neutral conversation props, source 16 -> 32 --------------
def prop(kind):
    c=im(16,16);dr=d(c)
    if kind=='clipboard':
        R(dr,(3,2,12,15),OUT);R(dr,(4,3,11,14),'#9F714A');R(dr,(5,4,10,13),PA['cream']);
        R(dr,(6,1,9,3),'#617C77')
        for y in [7,9,11]:R(dr,(6,y,9,y),'#7C978C')
    elif kind=='sample':
        # plain labeled container, no lettering; tag shape separate from sample
        R(dr,(4,4,12,14),OUT);R(dr,(5,5,11,13),'#D8E0CF')
        R(dr,(5,10,11,13),'#84674A')
        R(dr,(4,2,12,5),'#839693');R(dr,(5,1,11,2),'#A2B3AC')
        R(dr,(6,6,10,9),'#E6DEB9');R(dr,(7,7,9,7),'#557A73')
    elif kind=='tablet':
        R(dr,(1,3,14,13),OUT);R(dr,(2,4,13,12),'#728D87');R(dr,(3,5,12,11),'#3D6F7C')
        R(dr,(4,9,5,10),PA['leaf']);R(dr,(7,7,8,10),PA['leaf']);R(dr,(10,6,11,10),PA['straw'])
        R(dr,(7,12,8,12),'#E4E4D2')
    elif kind=='report':
        P(dr,[(3,1),(10,1),(14,5),(14,15),(3,15)],OUT)
        P(dr,[(4,2),(9,2),(9,6),(13,6),(13,14),(4,14)],PA['cream'])
        P(dr,[(10,2),(12,4),(10,4)],'#B0C2B6')
        for y in [8,10,12]:R(dr,(5,y,11,y),'#8BA79C')
        R(dr,(5,5,8,5),'#6D9785')
    return c

def build_props():
    for kind in ['clipboard','sample','tablet','report']:
        save(prop(kind),f'objects/{kind}.png',2)

# -------- Terrain tiles, designed seamless where needed, no crops ------------------
def terrain(kind,variation=0):
    c=im(16,16,True,{'grass':'#5F8B56','soil':'#866448','path':'#B79769','water':'#326F83'}[kind]);dr=d(c)
    rng=random.Random(200+variation+{'grass':7,'soil':14,'path':25,'water':39}[kind])
    if kind=='grass':
        R(dr,(0,0,15,15),'#5C8654')
        # scatter points do not imply crop condition
        for _ in range(26):
            x=rng.randrange(16);y=rng.randrange(16)
            R(dr,(x,y,x+1,y),rng.choice(['#70975B','#47734E','#83A465']))
        for _ in range(6):
            x=rng.randrange(1,15);y=rng.randrange(1,14)
            R(dr,(x,y,x,y+2),'#315B49')
    elif kind=='soil':
        R(dr,(0,0,15,15),'#806048')
        for _ in range(29):
            x=rng.randrange(16);y=rng.randrange(16)
            R(dr,(x,y,x+rng.randrange(2),y),rng.choice(['#65472F','#A07954','#9D764F']))
        for y in [3,10]:
            for x in range(0,16,5):R(dr,(x,y,x+2,y),'#75543A')
    elif kind=='path':
        R(dr,(0,0,15,15),'#BA9B6B')
        for _ in range(28):
            x=rng.randrange(16);y=rng.randrange(16)
            R(dr,(x,y,x,y),rng.choice(['#8B7654','#CFB482','#D3BE8D']))
        for x in [3,11]:
            for y in range(2,15,4): R(dr,(x,y,x+1,y),'#A68A5D')
    elif kind=='water':
        R(dr,(0,0,15,15),'#397E8D')
        for y in [3,9,14]:
            ofs=(variation%2)*3
            for x in range(-3,16,7):
                R(dr,(x+ofs,y,x+3+ofs,y),'#6DB0B4')
                R(dr,(x+1+ofs,y+1,x+2+ofs,y+1),'#2F7180')
        for y in [6,12]:
            for x in [1,7,14]:R(dr,(x,y,x+1,y),'#2D697C')
    return c

def build_tiles():
    order=[('soil',0),('soil',1),('path',0),('path',1),('grass',0),('grass',1),('water',0),('water',1)]
    sheet=im(16*4,16*2)
    for i,(kind,v) in enumerate(order):
        t=terrain(kind,v)
        name=f'tile-{kind}' + ('-alt' if v else '')
        save(t,f'tiles/{name}.png',2)
        sheet.alpha_composite(t,((i%4)*16,(i//4)*16))
    save(sheet,'tiles/neutral-terrain-sheet.png',2)
    return order

# -------- 8 frame non-ranking closing transition, three hypotheses -> review ----
def card(canvas,x,y,w,h,kind):
    dr=d(canvas)
    # x,y/w/h in logical 256x144 pixels
    R(dr,(x-2,y-2,x+w+2,y+h+2),OUT)
    R(dr,(x-1,y-1,x+w+1,y+h+1),PA['cream'])
    R(dr,(x,y,x+w,y+h),'#5A9395')
    P(dr,[(x,y+h//2),(x+w//3,y+h//3),(x+w*2//3,y+h//2),(x+w,y+h//3),(x+w,y+h)],'#527E71')
    R(dr,(x,y+h*2//3,x+w,y+h),'#BB9E6D')
    if kind==0:
        # winding single path, not a planted field
        L(dr,[(x+2,y+h-3),(x+w//3,y+h-9),(x+w//2,y+h-14)],'#73523D',2)
    elif kind==1:
        # neutral alternating terrain blocks
        for j in range(4):R(dr,(x+2+j*max(2,w//5),y+h-8,x+4+j*max(2,w//5),y+h-3), '#8D6C4C' if j%2 else '#E3BB76')
    else:
        # abstract square observation grid, never an alert/weather prediction
        for j in range(1,4):
            L(dr,[(x+j*w//4,y+2),(x+j*w//4,y+h-2)],'#79BDB6')
        for j in range(1,3):
            L(dr,[(x+2,y+j*h//3),(x+w-2,y+j*h//3)],'#79BDB6')

def clipboard(canvas,x,y,s=1):
    dr=d(canvas)
    # centered front card with three unlabeled, equal lines and dots, no checkmark
    w=39*s;h=51*s
    R(dr,(x-2*s,y-2*s,x+w+2*s,y+h+2*s),OUT)
    R(dr,(x,y,x+w,y+h),'#986B46')
    R(dr,(x+4*s,y+4*s,x+w-4*s,y+h-4*s),PA['cream'])
    R(dr,(x+12*s,y-5*s,x+27*s,y+5*s),OUT)
    R(dr,(x+15*s,y-4*s,x+24*s,y+2*s),'#92A7A2')
    for j in range(3):
        cy=y+(14+j*12)*s
        R(dr,(x+8*s,cy,x+13*s,cy+5*s),'#90ADA0')
        R(dr,(x+17*s,cy+1*s,x+31*s,cy+2*s),'#879A8C')
        R(dr,(x+17*s,cy+4*s,x+26*s,cy+5*s),'#BEC7B4')
    return x,y,x+w,y+h

def transition_frame(index,scene_base):
    img=scene_base.copy().convert('RGBA')
    # Alpha-compose decorative slate shading rather than replacing source alpha.
    veil=im(256,144)
    R(d(veil),(0,0,255,143),(17,43,40,62))
    img.alpha_composite(veil)
    dr=d(img)
    t=index/7
    # Cards are hypotheses, not competing winners: equal size and placement parity
    start=[(20,46),(105,36),(190,46)]
    stop=[(61,41),(105,41),(149,41)]
    convergence=min(1, t*1.5)
    if index<=4:
        for j in range(3):
            x=round(start[j][0]*(1-convergence)+stop[j][0]*convergence)
            y=round(start[j][1]*(1-convergence)+stop[j][1]*convergence)
            card(img,x,y,41,34,j)
    elif index<=6:
        for j in range(3):
            x=round(stop[j][0]+([0,-9,-18][j])*(index-4)/3)
            y=round(stop[j][1]+([0,8,16][j])*(index-4)/3)
            card(img,x,y,41,34,j)
    if index>=2 and index<=5:
        # soft motion hints, not approval marks or superiority
        ys=92
        for j in range(3):
            x=92+j*18
            L(dr,[(x,ys+j%2*3),(x+5,ys+j%2*3)],'#E6D2A2')
    if index>=4:
        u=(index-4)/3
        # Clipboard slides in from right, sits centrally at finish
        x=round(239*(1-u)+106*u)
        y=round(66*(1-u)+57*u)
        clipboard(img,x,y,1)
    if index==7:
        # small, equally weighted tabs representing all three hypotheses behind the review
        for j,x in enumerate([66,105,144]):
            card(img,x,80,30,19,j)
        clipboard(img,107,52,1)
    return img

def build_transition(day_scene):
    frames=[transition_frame(i,day_scene) for i in range(8)]
    sheet=im(256*8,144)
    for i,fr in enumerate(frames):sheet.alpha_composite(fr,(i*256,0))
    save(sheet,'transitions/transition-review-sheet.png',2)
    save(frames[-1],'transitions/transition-review-static.png',2)
    return frames


def main():
    print('Generating Field Shift P1 assets...')
    night=build_night()
    build_characters();build_props();tile_order=build_tiles()
    scene=Image.open(P0/'environment/field-scene-reference.png').convert('RGBA').resize((256,144),N)
    transition=build_transition(scene)
    metadata={
      'product':'Field Shift','assetLot':'P1','version':'1.0','generatedAt':'2026-11-13',
      'pixelStyle':{'logicalPixelScale':2,'resize':'nearest-neighbor','transparentCanvas':'RGBA','lightDirection':'upper-left'},
      'night':{'files':['environment/field-night.png','environment/field-night-lights.png','environment/field-sky-night.png'],'role':'decorative theme only','observational':False,'baseScene':'P0 original, same coordinates'},
      'characters':{'files':['characters/producer-neutral.png','characters/producer-talk.png','characters/producer-talk-sheet.png','characters/technician-neutral.png','characters/technician-talk.png','characters/technician-talk-sheet.png'],'frameSize':[64,64],'talkFrames':4,'talkSheetWidth':256,'role':'fictional non-region-specific demo characters'},
      'conversationObjects':{'files':['objects/clipboard.png','objects/sample.png','objects/tablet.png','objects/report.png'],'size':[32,32]},
      'tiles':{'frameSize':[32,32],'sheet':'tiles/neutral-terrain-sheet.png','sheetDimensions':[128,64],'order':[{'name':'tile-'+k+('-alt' if v else ''),'row':i//4,'column':i%4} for i,(k,v) in enumerate(tile_order)],'semantics':'generic surface only'},
      'reviewTransition':{'file':'transitions/transition-review-sheet.png','static':'transitions/transition-review-static.png','frames':8,'frameSize':[512,288],'sheetDimensions':[4096,288],'frameDurationMs':100,'loop':False,'semantic':'three equal hypotheses enter a review clipboard, no winner'},
      'assets':[]
    }
    for file in sorted(BASE.rglob('*.png')):
        pi=Image.open(file)
        metadata['assets'].append({'path':str(file.relative_to(BASE)),'size':[pi.width,pi.height], 'mode':pi.mode, 'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
    (ROOT/'assets-p1-manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Assets:',len(metadata['assets']))
    for record in metadata['assets']:
        print(record['path'],record['size'],record['bytes'])

if __name__=='__main__':main()
