import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audioContext=this;window.__audioProbe=this.createAnalyser();window.__audioProbe.fftSize=2048;}};
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination instanceof AudioDestinationNode)connect.call(this,window.__audioProbe);return result;};
 });
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8799');
 expect(await page.evaluate(()=>Boolean(window.__audioContext))).toBe(false);
 await page.getByRole('button',{name:'Start sparring'}).click();await page.waitForTimeout(1200);
 const energy=()=>page.evaluate(()=>{const a=window.__audioProbe,data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((n,x)=>n+x*x,0)/data.length)});
 const music=await energy();expect(music).toBeGreaterThan(.00001);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await expect.poll(()=>page.evaluate(()=>window.__audioContext.state)).toBe('suspended');await page.keyboard.press('j');await page.waitForTimeout(550);expect(await page.evaluate(()=>window.__audioContext.state)).toBe('suspended');await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});await expect.poll(()=>page.evaluate(()=>window.__audioContext.state)).toBe('running');
 await page.getByRole('button',{name:'Mute music',exact:true}).click();await page.waitForTimeout(900);expect(await energy()).toBeLessThan(.00001);
 await page.getByRole('button',{name:'Sound and game settings'}).click();
 await page.getByRole('button',{name:'Test effects'}).click();await page.waitForTimeout(60);expect(await energy()).toBeGreaterThan(.00001);
 await page.getByRole('button',{name:'Mute effects'}).click();await page.waitForTimeout(450);await page.getByRole('button',{name:'Test effects'}).click();await page.waitForTimeout(60);expect(await energy()).toBeLessThan(.00001);
 await page.getByLabel('Impact shake').uncheck();await expect(page.locator('.game-app')).toHaveClass(/no-shake/);
 await page.reload();await page.getByRole('button',{name:'Sound and game settings'}).click();await expect(page.getByLabel('Impact shake')).not.toBeChecked();await expect(page.getByRole('button',{name:'Enable effects'})).toBeVisible();
 await page.getByRole('slider',{name:/Sound effects/}).press('ArrowLeft');await expect(page.getByRole('button',{name:'Mute effects'})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Sound and game settings'}).click();await expect(page.getByRole('button',{name:'Mute effects'})).toBeVisible();
 if(errors.length)throw new Error(errors.join('\n'));
 const silent=await browser.newPage();await silent.addInitScript(()=>{window.AudioContext=class{constructor(){throw new Error('Audio unavailable in this browser')}}});await silent.goto(process.env.TEST_URL||'http://127.0.0.1:8799');await silent.getByRole('button',{name:'Start sparring'}).click();await silent.getByRole('button',{name:'Jab J',exact:true}).click();await expect(silent.locator('.controls-heading')).toContainText('Exchange 2');
 console.log('PASS: gesture-only audio, real music signal, hidden-tab suspension survives combat events, independent mutes, audible parry, mute/slider persistence, saved motion settings, and playable fallback without audio. Music RMS:',music.toFixed(5));
}finally{await browser.close()}
