"""Extract the three isolated assets from the generated sheet, preserving alpha.
Usage: python scripts/extract-sprites.py path/to/sprite-sheet.png
Requires Pillow. Source artwork is never overwritten.
"""
from collections import deque
from pathlib import Path
import sys
from PIL import Image, ImageFilter

source = Image.open(sys.argv[1]).convert('RGBA')
output = Path('public/art')
output.mkdir(parents=True, exist_ok=True)
source.save(output / 'sprite-sheet.png')
for name, box in [('left-hand',(0,0,495,960)), ('opponent',(495,0,1080,960)), ('right-hand',(1080,0,1536,960))]:
    asset=source.crop(box)
    mask=asset.getchannel('A').point(lambda p:255 if p>100 else 0)
    width,height=mask.size
    remaining=bytearray(mask.tobytes())
    largest=[]
    for index in range(len(remaining)):
        if not remaining[index]: continue
        pending=deque([index]); remaining[index]=0; component=[]
        while pending:
            at=pending.popleft(); component.append(at)
            x,y=at%width,at//width
            for xx,yy in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if 0<=xx<width and 0<=yy<height:
                    neighbor=yy*width+xx
                    if remaining[neighbor]: remaining[neighbor]=0; pending.append(neighbor)
        if len(component)>len(largest): largest=component
    pixels=bytearray(width*height)
    for index in largest:pixels[index]=255
    clean=Image.frombytes('L',(width,height),bytes(pixels)).filter(ImageFilter.MaxFilter(5))
    alpha=asset.getchannel('A')
    from PIL import ImageChops
    asset.putalpha(ImageChops.multiply(alpha,clean))
    bounds=asset.getchannel('A').getbbox()
    asset=asset.crop(bounds)
    asset.save(output / f'{name}.png',optimize=True)
    print(name,asset.size)
