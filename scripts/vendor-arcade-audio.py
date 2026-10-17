from pathlib import Path
import zipfile,hashlib,json
root=Path(__file__).resolve().parents[1];out=root/'public/audio/arcade';out.mkdir(parents=True,exist_ok=True)
packs={
 'impact':('https://kenney.nl/assets/impact-sounds',{'jab':'Audio/impactPunch_medium_000.ogg','heavy':'Audio/impactPunch_heavy_002.ogg','guard':'Audio/impactSoft_heavy_000.ogg','bell':'Audio/impactBell_heavy_000.ogg'}),
 'jingles':('https://kenney.nl/assets/music-jingles',{'victory':'Audio/Pizzicato jingles/jingles_PIZZI16.ogg'}),
 'voice':('https://kenney.nl/assets/voiceover-pack-fighter',{'fight':'Audio/fight.ogg','winner':'Audio/you_win.ogg','round1':'Audio/round_1.ogg','round2':'Audio/round_2.ogg','round3':'Audio/final_round.ogg'})}
manifest=[]
for pack,(url,files) in packs.items():
 z=zipfile.ZipFile(root/f'artifacts/audio/{pack}.zip');license=z.read('License.txt');(out/f'LICENSE-{pack}.txt').write_bytes(license)
 for name,source in files.items():
  data=z.read(source);(out/f'{name}.ogg').write_bytes(data);manifest.append({'file':f'{name}.ogg','archive_file':source,'source':url,'license':'CC0-1.0','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print('Vendored',len(manifest),'licensed audio clips,',sum(f['bytes'] for f in manifest),'bytes')
