"""Field Shift immersive pixel assets v1.0.
Original, editable procedural artwork using Pillow at logical low resolution,
nearest-neighbour upscale to exact target dimensions. No external fonts/assets.
Run: python source/generate_assets.py
"""
from PIL import Image, ImageDraw
from pathlib import Path
import math, random, json, hashlib, io, re
ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'public'/'assets'
for name in ['environment','evidence','interactions','journey','nasa','scenarios']:(ASSETS/name).mkdir(parents=True,exist_ok=True)
random.seed(2026)
C={'forest':'#102317','leaf':'#B7E35B','soil':'#76543A','straw':'#D2B46C','sky':'#6A9FA3','cream':'#F3F0DE','alert':'#E5B94E','deep':'#16332A','moss':'#366A47','grass':'#659947','shade':'#305B49','hill':'#537E6B','teal':'#77C7C4','steel':'#8FA9A1','outline':'#25392B','soilshade':'#4F382B','soilhi':'#A1754A','shadow':'#3E5A40','skydeep':'#356F83'}
N=Image.Resampling.NEAREST

def raw(w,h,opaque=False):
    return Image.new('RGBA',(w,h), C['sky'] if opaque else (0,0,0,0))
def px(im,x,y,clr):
    if 0<=x<im.width and 0<=y<im.height:im.putpixel((int(x),int(y)),tuple(bytes.fromhex(clr.lstrip('#')))+(255,) if isinstance(clr,str) else clr)
def rect(d,xy,c):d.rectangle(tuple(map(int,xy)),fill=c)
def line(d,coords,c,width=1):d.line([(int(x),int(y)) for x,y in coords],fill=c,width=width,joint='curve')
def poly(d,coords,c):d.polygon([(int(x),int(y)) for x,y in coords],fill=c)
def circ(d,bbox,c,outline=None,width=1):d.ellipse(tuple(map(int,bbox)),fill=c,outline=outline,width=width)
def save(im,path,scale=1,opaque=False):
    if scale!=1: im=im.resize((im.width*scale,im.height*scale),N)
    p=ASSETS/path; p.parent.mkdir(parents=True,exist_ok=True)
    im=im.convert('RGB' if opaque else 'RGBA')
    im.save(p,format='PNG',optimize=True)
    return im

def cloud(d,x,y,k=1):
    a=C['cream']; b='#C7DACE'; s=lambda t:int(round(t*k))
    rect(d,[x+s(4),y+s(7),x+s(25),y+s(11)],b)
    rect(d,[x+s(1),y+s(5),x+s(28),y+s(8)],a)
    rect(d,[x+s(6),y+s(2),x+s(22),y+s(6)],a)
    rect(d,[x+s(11),y,x+s(18),y+s(4)],a)

def hill_poly(d,pts,color,highlight=None):
    poly(d,pts,color)
    if highlight:line(d,[(x,y-1) for x,y in pts[:4]],highlight,1)

def draw_sky():
    im=raw(256,144,True);d=ImageDraw.Draw(im)
    bands=['#326477','#397B8A','#458C98','#539AA4','#6A9FA3','#87BAC0']
    for y in range(144):
        v=min(5,y//28);rect(d,[0,y,255,y],bands[v])
    # stepped upper-left glint
    for y in range(20,37):
        x=45
        if (y-20)**2<70:
            sz=int(math.sqrt(70-(y-20)**2));line(d,[(x-sz,y),(x+sz,y)],'#E6DCAE')
    cloud(d,28,33,0.9);cloud(d,167,28,1.0);cloud(d,203,61,0.6);cloud(d,92,19,0.55)
    return save(im,Path('environment/field-sky-day.png'),2,True)

def draw_horizon():
    im=raw(256,144);d=ImageDraw.Draw(im)
    # layered distant ridge, not crop-specific
    poly(d,[(0,88),(15,80),(31,84),(45,74),(69,82),(88,68),(113,78),(132,69),(153,82),(173,69),(199,78),(224,70),(248,83),(255,79),(255,115),(0,115)],'#427487')
    poly(d,[(0,96),(16,88),(37,94),(55,82),(76,89),(95,78),(118,86),(136,80),(157,94),(186,82),(212,93),(240,84),(255,93),(255,122),(0,122)],'#4C877F')
    # far tree horizon line
    poly(d,[(0,104),(11,99),(26,102),(44,94),(67,98),(85,93),(103,98),(121,93),(140,97),(154,93),(177,100),(198,92),(217,96),(233,94),(255,100),(255,123),(0,123)],'#477854')
    for x,y,r in [(8,101,7),(19,102,6),(45,98,9),(61,103,7),(196,100,7),(220,99,8),(239,97,10),(250,101,6)]:
        circ(d,[x-r,y-r,x+r,y+r],C['moss'])
        circ(d,[x-r+2,y-r+1,x+1,y+1],'#729E57')
        rect(d,[x-1,y+4,x+1,y+12],'#4C4933')
    return save(im,Path('environment/field-horizon.png'),2)

def draw_plots():
    im=raw(256,144);d=ImageDraw.Draw(im)
    # low flat plain, no live crops
    poly(d,[(0,112),(50,106),(128,110),(208,107),(255,109),(255,143),(0,143)],'#A88F59')
    poly(d,[(0,118),(60,112),(128,115),(198,111),(255,114),(255,144),(0,144)],'#C6A969')
    line(d,[(0,112),(75,108),(137,112),(255,109)],'#E8C87C',2)
    # ground perspective plough furrows, steady brown/ochre patterns
    for anchor in [-130,-84,-45,-14,22,60,105,155,220,295,345,395]:
        line(d,[(128+(anchor-128)*0.22,110),(anchor,143)],'#7D5B39',2)
        line(d,[(128+(anchor-128)*0.22+2,110),(anchor+4,143)],'#DDC080',2)
    for y in (119,129,139):
        # little broken pixels represent dry straw remnants not crops
        for x in range(4,256,21):
            if (x+y)%5<3:line(d,[(x,y),(x+4,y)],'#B99C68')
    return save(im,Path('environment/field-plots.png'),2)

def tuft(d,x,y,s=1):
    line(d,[(x,y),(x-3*s,y-5*s),(x-5*s,y-7*s)],'#28553B',max(1,s))
    line(d,[(x,y),(x,y-8*s)],'#457C4A',max(1,s))
    line(d,[(x,y),(x+3*s,y-6*s)],'#4E8548',max(1,s))
    line(d,[(x,y),(x+6*s,y-5*s)],'#93B157',max(1,s))
    line(d,[(x-3*s,y),(x+3*s,y)],'#294936',max(1,s))

def draw_foreground():
    im=raw(256,144);d=ImageDraw.Draw(im)
    # fencing left and right, unobstructed middle, no visible crop plants
    for x in [9,31,53,209,234,252]:
        poly(d,[(x-2,140),(x-2,115),(x,112),(x+3,115),(x+3,140)],C['outline'])
        rect(d,[x-1,116,x+2,138],C['soil'])
        line(d,[(x,117),(x,136)],'#A88A55',1)
    for x0,x1 in [(4,58),(205,255)]:
        for y in (121,132):
            rect(d,[x0,y,x1,y+4],C['outline'])
            rect(d,[x0,y+1,x1,y+2],'#956F46')
    for x,y,k in [(5,143,1),(18,142,2),(38,144,1),(61,143,2),(77,143,1),(185,143,2),(203,142,1),(220,143,2),(242,143,2),(255,144,1)]:tuft(d,x,y,k)
    for x in (3,13,66,190,239):
        rect(d,[x,140,x+3,143],'#6E974C')
    return save(im,Path('environment/field-foreground.png'),2)

def draw_buildings():
    # 128x64 -> 256x128, transparent. Place scene left 256px, top 92px in full scene.
    im=raw(128,64);d=ImageDraw.Draw(im)
    # silhouettes entirely on right of source so center scene is free
    # silos at x 95 and 109
    for x in (95,108):
        rect(d,[x-2,11,x+8,61],C['outline']); rect(d,[x,10,x+6,59],'#ADB6AA')
        rect(d,[x,11,x+2,59],'#CBD0B8');rect(d,[x+5,13,x+6,59],'#748C85')
        poly(d,[(x-2,11),(x+1,4),(x+5,4),(x+8,11)],C['outline'])
        poly(d,[(x,11),(x+2,6),(x+4,6),(x+6,11)],'#BAC9B9')
        for y in (24,38,53):line(d,[(x,y),(x+6,y)],'#8CA69F')
    # farmhouse / barn medium, stepped roof, frame
    poly(d,[(39,28),(61,8),(84,27),(84,62),(38,62)],C['outline'])
    poly(d,[(42,28),(61,12),(81,29),(81,61),(41,61)],'#A65B45')
    poly(d,[(38,30),(61,6),(85,29),(80,32),(61,14),(42,32)],'#6D4937')
    line(d,[(42,31),(61,13),(82,32)],'#D2B46C',2)
    rect(d,[52,40,70,61],'#4C382D');rect(d,[54,41,68,61],'#BD815D')
    line(d,[(54,42),(68,59)],'#F3E0BA',2);line(d,[(68,42),(54,59)],'#F3E0BA',2)
    rect(d,[57,26,66,33],C['outline']);rect(d,[59,27,64,31],C['cream'])
    rect(d,[29,58,120,63],'#4C6E3D')
    tuft(d,33,61,1);tuft(d,119,62,1)
    return save(im,Path('environment/farm-buildings.png'),2)

def compose_scene():
    img=Image.open(ASSETS/'environment/field-sky-day.png').convert('RGBA')
    for f in ['field-horizon.png','field-plots.png','field-foreground.png']:
        layer=Image.open(ASSETS/'environment'/f).convert('RGBA');img.alpha_composite(layer)
    buildings=Image.open(ASSETS/'environment/farm-buildings.png').convert('RGBA')
    img.alpha_composite(buildings,(256,92))
    img.save(ASSETS/'environment/field-scene-reference.png',optimize=True)
    return img

# SCENARIO ART: lower-res, transparent art on top of environment-style scenic miniatures.
def mini_scene(kind):
    im=raw(96,56,True); d=ImageDraw.Draw(im)
    rect(d,[0,0,95,55],'#77ABB1')
    rect(d,[0,39,95,55],'#A38B59')
    cloud(d,8,6,0.5);cloud(d,78,11,0.4)
    poly(d,[(0,39),(15,31),(32,36),(54,29),(76,38),(95,30),(95,44),(0,44)],'#4A887F')
    poly(d,[(0,42),(20,36),(43,39),(60,34),(80,39),(95,35),(95,46),(0,46)],'#4C7956')
    rect(d,[0,45,95,55],'#C0A36D')
    if kind=='continuity':
        # uninterrupted single curved trail on left; center-right reserved for overlay
        poly(d,[(11,55),(28,45),(37,42),(43,42),(37,47),(24,55)],'#7C583B')
        line(d,[(16,55),(31,46),(41,42)],'#E0C47A',2)
        for x in range(0,96,17):line(d,[(x,51),(x+10,50)],'#AC8B57')
    elif kind=='soil':
        # geometrically interspersed blocks, no statement of fertility
        for x in range(0,49,17):
            poly(d,[(x,48),(x+12,46),(x+8,55),(x-3,55)], '#8F6949' if x%2 else '#E0C184')
        for x in range(0,96,22):line(d,[(x,43),(x+18,43)],'#E0C780')
    elif kind=='water':
        # abstract data grid, observation not water saving, muted teal
        for x in range(0,96,13):line(d,[(x,5),(x,55)],'#5AAFB2',1)
        for y in range(6,56,11):line(d,[(0,y),(95,y)],'#5AAFB2',1)
        circ(d,[14,21,35,42],None,'#EDF1CB',1)
        line(d,[(24,29),(24,36)],'#EDF1CB',1)
    else:
        # Neutral bare land; not drought, undergrowth etc
        for y in (46,50,54):
            for x in range(0,96,19):line(d,[(x,y),(x+7,y)],'#A27D56',1)
    # no objects placed inside center-right overlay zone
    return im

def make_scenarios():
    for name,variant in [('scenario-continuity','continuity'),('scenario-soil','soil'),('scenario-water','water'),('scenario-empty','empty')]:
        save(mini_scene(variant),Path('scenarios')/(name+'.png'),2)

# EVIDENCE ICONS at designed 16x16, 2x export also at 32
# All 6 have distinct silhouettes, never color-only. Symbols no letters/numerals.
def icon_img(kind,active=False):
    im=raw(16,16);d=ImageDraw.Draw(im)
    o=C['outline'];light=C['cream'];green=C['leaf'];brown=C['soil'];teal=C['teal']
    if kind=='nasa':
        # satellite and signal, diagonally offset wing panels
        rect(d,[1,3,5,7],o);rect(d,[2,4,4,6],'#519CBA')
        rect(d,[10,9,14,13],o);rect(d,[11,10,13,12],'#519CBA')
        line(d,[(5,7),(9,10)],'#E9E9D3',2);rect(d,[6,6,10,9],o);rect(d,[7,7,9,8],light)
        line(d,[(8,4),(10,3),(12,4)],teal);line(d,[(9,2),(12,1),(14,3)],teal)
    elif kind=='farmer':
        # wide hat and human, clear silhouette
        rect(d,[4,3,11,5],o);rect(d,[2,6,13,7],o);rect(d,[3,5,12,6],C['straw'])
        rect(d,[5,7,10,11],o);rect(d,[6,7,9,10],'#D5A17B')
        rect(d,[3,12,12,15],o);rect(d,[4,12,11,14],'#4E9166')
        rect(d,[6,12,9,13],C['cream'])
    elif kind=='regional':
        # fold map with high pin, no country reference
        poly(d,[(1,5),(5,3),(9,5),(14,3),(14,14),(10,15),(6,13),(1,15)],o)
        poly(d,[(2,6),(5,5),(8,7),(8,13),(5,11),(2,13)],'#A5C88B')
        poly(d,[(9,7),(13,5),(13,13),(9,14)],'#7C9A68')
        circ(d,[7,0,12,5],C['alert'],o)
        line(d,[(9,4),(9,8)],'#E5B94E')
    elif kind=='unknown':
        # dashed, neutral blank tile, tiny central dot: not error
        for x in [3,6,9,12]:px(im,x,1,C['steel']);px(im,x,14,C['steel'])
        for y in [3,6,9,12]:px(im,1,y,C['steel']);px(im,14,y,C['steel'])
        circ(d,[6,6,9,9],C['cream'])
    elif kind=='source':
        # folded document with linked chain, recognizable without text
        poly(d,[(2,1),(10,1),(14,5),(14,15),(2,15)],o)
        poly(d,[(3,2),(9,2),(9,6),(13,6),(13,14),(3,14)],light)
        line(d,[(4,7),(8,7)],'#678074');line(d,[(4,10),(7,10)],'#678074')
        circ(d,[7,9,11,12],None,C['sky'],2)
        circ(d,[9,7,13,10],None,C['sky'],2)
    elif kind=='review':
        # clipboard and spyglass: review, not approved
        rect(d,[3,2,12,15],o);rect(d,[4,3,11,14],'#BC9B72');rect(d,[5,4,10,13],C['cream'])
        rect(d,[6,1,9,3],C['soilshade']);circ(d,[5,6,10,11],None,'#497E79',1)
        line(d,[(10,10),(14,14)],'#497E79',2)
    return im

def make_evidence():
    for key in ['nasa','farmer','regional','unknown','source','review']:
        i=icon_img(key)
        save(i,Path('evidence')/('evidence-'+key+'-16.png'))
        save(i,Path('evidence')/('evidence-'+key+'.png'),2)

# NAV ICONS, at 24x24 logical => 48x48 output, keep silhouettes clear.
def nav_icon(kind,active):
    im=raw(24,24);d=ImageDraw.Draw(im)
    b=C['outline']; p=C['leaf'] if active else C['straw']; subtle='#426E62' if active else '#66807B'
    if active:
        rect(d,[1,1,22,22],'#204431');rect(d,[2,2,21,21],'#274D38')
    if kind=='explore':
        poly(d,[(4,7),(10,5),(15,7),(20,5),(20,19),(15,21),(10,19),(4,21)],b)
        poly(d,[(5,8),(10,6),(14,8),(14,18),(10,18),(5,19)],'#8DAF91')
        poly(d,[(15,8),(19,7),(19,18),(15,19)],'#B5CAA8')
        circ(d,[12,1,19,8],p,b);rect(d,[15,7,16,11],p)
    if kind=='farm':
        poly(d,[(2,11),(12,3),(22,11),(20,13),(12,7),(4,13)],b)
        rect(d,[4,11,20,21],b);rect(d,[6,12,18,19],'#A56A52')
        rect(d,[10,13,14,20],C['cream'])
        line(d,[(10,14),(14,19)],b);line(d,[(14,14),(10,19)],b)
        rect(d,[11,8,13,11],p)
    if kind=='lab':
        rect(d,[9,2,14,4],b);rect(d,[10,4,13,12],C['steel'])
        poly(d,[(9,12),(4,20),(5,22),(19,22),(20,20),(14,12)],b)
        poly(d,[(9,13),(6,19),(7,20),(17,20),(18,19),(14,13)],p)
        circ(d,[11,15,13,17],C['cream'])
    if kind=='compare':
        for x,y,h in [(4,14,7),(10,10,11),(16,6,15)]:
            rect(d,[x,y,x+3,20],b);rect(d,[x+1,y+1,x+2,19],p if active else subtle)
        line(d,[(2,21),(22,21)],C['cream'])
    return im

def make_journey():
    kinds=['explore','farm','lab','compare']
    sheet=raw(24*8,24)
    for i,k in enumerate(kinds):
        j=nav_icon(k,False);save(j,Path('journey')/f'journey-{k}.png',2);sheet.alpha_composite(j,(i*24,0))
    for i,k in enumerate(kinds):sheet.alpha_composite(nav_icon(k,True),((i+4)*24,0))
    save(sheet,Path('journey/journey-nav-sheet.png'),2)

# NASA overlay and animated sheets
# Icons are frame-invariant silhouettes with small positional variations.
def earth_frame(fr):
    im=raw(64,64);d=ImageDraw.Draw(im);o=C['outline']
    # perspective orbit ellipse elliptical offset changes position
    d.ellipse([6,18,59,46],outline=C['teal'],width=1)
    d.ellipse([11,12,53,54],fill=o)
    d.ellipse([13,14,51,52],fill='#287A91')
    d.ellipse([17,17,45,44],fill='#3E9EB0')
    # polygon continents pseudo-decorative, not observation
    shift=fr*3
    poly(d,[((19+shift)%42+11,21),(33+shift%7,20),(41+shift%5,25),(36+shift%5,31),(27+shift%5,29),(22+shift%5,36),(18+shift%5,29)],'#8ABF65')
    poly(d,[(34+fr,39),(41+fr,38),(42+fr,45),(35+fr,47)],'#B6C66D')
    circ(d,[15,19,20,24],'#D0E3D0')
    # orbital marker
    angle=fr*math.pi/2; x=32+25*math.cos(angle); y=32+13*math.sin(angle)
    circ(d,[x-2,y-2,x+2,y+2],C['cream'])
    return im

def satellite_frame(fr):
    im=raw(32,32);d=ImageDraw.Draw(im)
    x=fr%3-1;y=fr%2
    rect(d,[4+x,10+y,12+x,19+y],C['outline']);rect(d,[5+x,11+y,11+x,18+y],'#468CAD')
    for xx in [7,10]:line(d,[(xx+x,12+y),(xx+x,17+y)],'#7DC7C4')
    rect(d,[19+x,10+y,27+x,19+y],C['outline']);rect(d,[20+x,11+y,26+x,18+y],'#468CAD')
    for xx in [22,25]:line(d,[(xx+x,12+y),(xx+x,17+y)],'#7DC7C4')
    rect(d,[13+x,12+y,18+x,18+y],C['cream']);line(d,[(14+x,11+y),(18+x,8+y)],C['straw'])
    circ(d,[15+x,7+y,20+x,10+y],None,C['straw'],1)
    return im

def pulse_frame(fr):
    im=raw(32,32);d=ImageDraw.Draw(im)
    circ(d,[6,13,10,17],C['cream'])
    for r in (5,8,11):
        if r<=2+fr*2:
            for angle in [a*math.pi/16 for a in range(-6,7)]:
                x=int(9+r*math.cos(angle));y=int(15+r*math.sin(angle));px(im,x,y,C['teal'])
    return im

def climate_overlay():
    im=raw(256,144);d=ImageDraw.Draw(im)
    for x in range(0,256,16):line(d,[(x,0),(x,143)],(112,205,207,78))
    for y in range(0,144,16):line(d,[(0,y),(255,y)],(112,205,207,78))
    for x,y in [(40,40),(111,24),(201,69),(67,103),(228,119)]:
        rect(d,[x-2,y-2,x+2,y+2],(207,234,209,178))
        line(d,[(x-6,y),(x+6,y)],(215,237,216,125))
        line(d,[(x,y-6),(x,y+6)],(215,237,216,125))
    return save(im,Path('nasa/climate-grid-overlay.png'),2)

def make_nasa():
    sheet=raw(256,64)
    for fr in range(4):sheet.alpha_composite(earth_frame(fr),(64*fr,0))
    save(sheet,Path('nasa/earth-orbit-sheet.png'),4)
    save(earth_frame(0),Path('nasa/earth-orbit-static.png'),4)
    for which,method in [('satellite',satellite_frame),('data-pulse',pulse_frame)]:
        sheet=raw(32*6,32)
        for fr in range(6):sheet.alpha_composite(method(fr),(32*fr,0))
        save(sheet,Path('nasa')/(which+'-sheet.png'),2)
        save(method(0),Path('nasa')/(which+'-static.png'),2)
    climate_overlay()

# interaction animations

def interaction_frame(which,fr,count):
    im=raw(32,32);d=ImageDraw.Draw(im)
    if which=='selection-ring':
        for i in range(8):
            angle=2*math.pi*i/8
            x=int(16+11*math.cos(angle));y=int(16+11*math.sin(angle))
            col=C['leaf'] if i==(fr%8) or i==(fr+1)%8 else '#638765'
            rect(d,[x-1,y-1,x+1,y+1],col)
        circ(d,[8,8,24,24],None,'#52775D',1)
    elif which=='slot-place':
        rect(d,[5,8,26,24],None)
        for y in (6,25):line(d,[(6,y),(25,y)],'#6C9D78')
        for x in (6,25):line(d,[(x,7),(x,25)],'#6C9D78')
        if fr<4:
            # small placement ripple, never rating/success score
            r=fr+1;d.ellipse([16-r,16-r,16+r,16+r],outline=C['leaf'],width=1)
        else:
            circ(d,[13,13,19,19],C['leaf'])
    elif which=='analysis-loading':
        for i in range(8):
            angle=2*math.pi*i/8; x=int(16+10*math.cos(angle));y=int(16+10*math.sin(angle))
            rect(d,[x-1,y-1,x+1,y+1],C['teal'] if i==fr else '#496E6A')
        circ(d,[14,14,18,18],C['cream'])
    elif which=='draft-saved':
        rect(d,[8,6,23,25],C['outline']);rect(d,[9,7,22,24],C['cream'])
        rect(d,[11,8,20,13],'#719C92');rect(d,[12,18,19,23],C['soil'])
        if fr>=2:line(d,[(11,16),(14,19),(20,13)],'#70A656',2)
    return im

def make_interactions():
    configurations=[('selection-ring',6),('slot-place',6),('analysis-loading',8),('draft-saved',4)]
    for which,count in configurations:
        sheet=raw(32*count,32)
        for fr in range(count):sheet.alpha_composite(interaction_frame(which,fr,count),(32*fr,0))
        save(sheet,Path('interactions')/(which+'-sheet.png'),2)
        save(interaction_frame(which,0,count),Path('interactions')/(which+'-static.png'),2)
    im=raw(32,32);d=ImageDraw.Draw(im)
    for x in range(6,27,3):px(im,x,6,C['steel']);px(im,x,25,C['steel'])
    for y in range(6,27,3):px(im,6,y,C['steel']);px(im,25,y,C['steel'])
    circ(d,[14,14,18,18],C['cream'])
    save(im,Path('interactions/unknown-placeholder.png'),2)

def produce():
    draw_sky();draw_horizon();draw_plots();draw_foreground();draw_buildings();compose_scene()
    make_scenarios();make_evidence();make_journey();make_nasa();make_interactions()
    print('produced')
if __name__=='__main__':produce()
