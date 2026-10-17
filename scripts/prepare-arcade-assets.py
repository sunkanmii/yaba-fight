from PIL import Image
from pathlib import Path
import argparse
import hashlib, json
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True,help='Directory containing the original generated PNG atlases and maps');source=parser.parse_args().source_dir
out=root/'public/arcade';(out/'heads').mkdir(parents=True,exist_ok=True);(out/'maps').mkdir(exist_ok=True)
atlas=Image.open(source/'exec-d13d8b90-1746-49b9-942f-b47e69fea34a.png').convert('RGBA')
print('Atlas',atlas.size,'corner alpha',atlas.getpixel((0,0))[3])
assert atlas.getpixel((0,0))[3]==0,'Atlas must have genuine transparency'
names=['kunle','musa','tunde','lazarus','dele','chuka','ismail']
for i,name in enumerate(names):
 x=i%4;y=i//4;w,h=atlas.size
 cell=atlas.crop((x*w//4,y*h//2,(x+1)*w//4,(y+1)*h//2));bbox=cell.getbbox();cell=cell.crop(bbox);cell.thumbnail((350,400))
 cell.save(out/'heads'/f'{name}.webp',quality=88,method=4)
maps={'bridge':'exec-f31c3afa-41d9-43b8-b1ed-da3b8088445b.png','market':'exec-881d5aa2-eea0-4e82-b87b-e7cf0aa54198.png','rooftop':'exec-6e0056a4-5dab-41b4-82be-3a19f82f7b3d.png'}
for name,path in maps.items():
 im=Image.open(source/path).convert('RGB');im.thumbnail((1440,810));im.save(out/'maps'/f'{name}.webp',quality=85,method=4)
manifest=[{'file':str(p.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'source':'OpenAI image generation, original Yaba Fight art direction, 2026-10-17'} for p in out.rglob('*.webp')]
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('Saved',len(manifest),'assets,',sum(p['bytes'] for p in manifest),'bytes')
