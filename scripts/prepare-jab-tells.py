from PIL import Image
from pathlib import Path
import hashlib,json,argparse
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);source=parser.parse_args().source
im=Image.open(source).convert('RGBA');assert im.size==(1536,1024);assert im.getpixel((0,0))[3]==0
for i,name in enumerate(['kunle','musa','tunde','lazarus','dele','chuka','ismail']):
 x=i%4;y=i//4
 cell=im.crop((x*384,y*512,(x+1)*384,(y+1)*512));cell.save(Path('public/arcade/fighters')/name/'8.webp',quality=85,method=4)
root=Path('.');out=root/'public/arcade';manifest=[{'file':p.as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'source':'Original OpenAI-generated Yaba Fight illustration, fixed-cell normalization, 2026-10-17'} for p in out.rglob('*.webp')];(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print('Shipping art:',sum(p['bytes'] for p in manifest))
