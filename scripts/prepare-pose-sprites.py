"""Normalize complete illustrated poses with one fixed scale and cell anchor."""
from PIL import Image
from pathlib import Path
import argparse,hashlib,json
from collections import deque

def extract_character(frame):
 # Atlas admission: retain the connected character, excluding neighbouring-cell bleed.
 # This changes neither the drawing, dimensions, scale nor anchor of the sprite.
 alpha=frame.getchannel('A');pixels=alpha.load();width,height=frame.size
 seen=bytearray(width*height);largest=[]
 for y in range(height):
  for x in range(width):
   offset=y*width+x
   if seen[offset] or pixels[x,y]==0:continue
   queue=deque([(x,y)]);seen[offset]=1;component=[]
   while queue:
    px,py=queue.popleft();component.append((px,py))
    for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
     if 0<=nx<width and 0<=ny<height:
      index=ny*width+nx
      if not seen[index] and pixels[nx,ny]>0:seen[index]=1;queue.append((nx,ny))
   if len(component)>len(largest):largest=component
 mask=Image.new('L',frame.size);kept=mask.load()
 for x,y in largest:kept[x,y]=pixels[x,y]
 frame.putalpha(mask)
 return frame
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--mapping',type=Path,required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'public/arcade';mapping=json.loads(args.mapping.read_text())
for name,filename in mapping.items():
 image=Image.open(args.source_dir/filename).convert('RGBA');columns=3 if name=='player' else 4;rows=2;target=out/('player' if name=='player' else f'fighters/{name}');target.mkdir(parents=True,exist_ok=True)
 assert image.size==(1536,1024),f'Unexpected sheet dimensions: {name}'
 assert image.getpixel((0,0))[3]==0,f'Sheet must have genuine transparency: {name}'
 for i in range(columns*rows):
  x=i%columns;y=i//columns;w,h=image.size
  # Full cells preserve common scale and bottom-center anchors across poses.
  frame=image.crop((round(x*w/columns),round(y*h/rows),round((x+1)*w/columns),round((y+1)*h/rows)))
  if name!='player':frame=extract_character(frame)
  frame.save(target/f'{i}.webp',quality=85,method=4)
 print(name,image.size,columns*rows,'fixed-cell poses')
manifest=[{'file':str(p.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'source':'Original OpenAI-generated Yaba Fight illustration, fixed-cell normalization, 2026-10-17'} for p in out.rglob('*.webp')]
(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print('Shipping art',sum(p['bytes'] for p in manifest),'bytes')
