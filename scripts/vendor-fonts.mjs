import {mkdir,writeFile} from 'node:fs/promises';
const target='public/fonts';await mkdir(target,{recursive:true});
const url='https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=DM+Sans:wght@400;600;700&display=swap';
const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'}});if(!response.ok)throw new Error('Font stylesheet unavailable');
const css=await response.text();let local='';let index=0;
for(const block of css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[\s\S]*?\})/g)){
 const remote=block[1].match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];if(!remote)continue;const font=await fetch(remote);if(!font.ok)throw new Error('Font download failed');const name=`yaba-${index++}.woff2`;await writeFile(`${target}/${name}`,Buffer.from(await font.arrayBuffer()));local+=block[1].replace(remote,`/fonts/${name}`)+'\n';
}
if(!index)throw new Error('No Latin font blocks found');await writeFile('app/fonts.css',local);
for(const [repo,name]of [['ofl/dmsans','DM-Sans-OFL.txt'],['ofl/barlowcondensed','Barlow-Condensed-OFL.txt']]){const license=await fetch(`https://raw.githubusercontent.com/google/fonts/main/${repo}/OFL.txt`);if(license.ok)await writeFile(`${target}/${name}`,await license.text());}
console.log(`Vendored ${index} font files; no runtime requests to Google Fonts.`);
