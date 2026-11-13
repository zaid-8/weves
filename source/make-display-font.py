from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'assets' if (ROOT/'assets').exists() else ROOT/'aethra/assets'
units=1000
fb=FontBuilder(units,isTTF=True)
letters='AEMRHST'
fb.setupGlyphOrder(['.notdef','space']+list(letters))
fb.setupCharacterMap({ord(c):c for c in letters}|{32:'space'})
glyphs={};metrics={}
def pen():return TTGlyphPen(None)
def poly(p,pts):
 p.moveTo(pts[0])
 for pt in pts[1:]:p.lineTo(pt)
 p.closePath()
def box(p,x,y,w,h):poly(p,[(x,y),(x,y+h),(x+w,y+h),(x+w,y)])
for c in ['.notdef','space']:
 p=pen();glyphs[c]=p.glyph();metrics[c]=(300,0)
p=pen();poly(p,[(35,0),(35,700),(190,700),(450,252),(710,700),(865,700),(865,0),(713,0),(713,439),(510,89),(390,89),(187,439),(187,0)]);glyphs['M']=p.glyph();metrics['M']=(900,35)
p=pen();poly(p,[(15,0),(322,700),(518,700),(835,0),(664,0),(602,148),(238,148),(177,0)]);poly(p,[(294,280),(546,280),(420,575)]);glyphs['A']=p.glyph();metrics['A']=(850,15)
p=pen();p.moveTo((35,0));p.lineTo((35,700));p.lineTo((605,700));p.qCurveTo((865,700),(865,470));p.qCurveTo((865,290),(666,255));p.lineTo((891,0));p.lineTo((688,0));p.lineTo((471,247));p.lineTo((192,247));p.lineTo((192,0));p.closePath();p.moveTo((192,389));p.lineTo((585,389));p.qCurveTo((702,389),(702,474));p.qCurveTo((702,561),(585,561));p.lineTo((192,561));p.closePath();glyphs['R']=p.glyph();metrics['R']=(920,35)
p=pen();p.moveTo((805,700));p.lineTo((805,558));p.lineTo((279,558));p.qCurveTo((180,558),(180,491));p.qCurveTo((180,421),(279,421));p.lineTo((582,421));p.qCurveTo((830,421),(830,214));p.qCurveTo((830,0),(589,0));p.lineTo((30,0));p.lineTo((30,144));p.lineTo((580,144));p.qCurveTo((675,144),(675,213));p.qCurveTo((675,285),(578,285));p.lineTo((274,285));p.qCurveTo((25,285),(25,491));p.qCurveTo((25,700),(274,700));p.closePath();glyphs['S']=p.glyph();metrics['S']=(860,25)
p=pen();poly(p,[(35,0),(35,700),(740,700),(740,555),(193,555),(193,423),(691,423),(691,281),(193,281),(193,145),(740,145),(740,0)]);glyphs['E']=p.glyph();metrics['E']=(780,35)
p=pen();poly(p,[(20,700),(840,700),(840,548),(510,548),(510,0),(350,0),(350,548),(20,548)]);glyphs['T']=p.glyph();metrics['T']=(860,20)
p=pen();poly(p,[(35,0),(35,700),(195,700),(195,426),(665,426),(665,700),(825,700),(825,0),(665,0),(665,275),(195,275),(195,0)]);glyphs['H']=p.glyph();metrics['H']=(860,35)
fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=780,descent=-120);fb.setupNameTable({'familyName':'Aethra Display','styleName':'Bold','uniqueFontIdentifier':'AethraDisplay-Bold-1','fullName':'Aethra Display Bold','psName':'AethraDisplay-Bold','version':'Version 1.0'});fb.setupOS2(sTypoAscender=780,sTypoDescender=-120,usWinAscent=780,usWinDescent=120,usWeightClass=700);fb.setupPost();fb.font.flavor='woff';fb.save(str(ASSETS/'aethra-display.woff'))
(ASSETS/'DISPLAY-FONT.txt').write_text('Aethra Display Bold\nCustom geometric lettering drawn for AETHRA. Includes A E H M R S T and space.\nUse, modify and redistribute with this project. No external font download is required.\n')
print('Reference-inspired display font generated')
