import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
await page.goto(process.env.TEST_URL||'http://localhost:3005',{waitUntil:'networkidle'});
await page.screenshot({path:'artifacts/desktop.png',fullPage:true});
await page.getByRole('button',{name:'Start sparring'}).click();
await page.getByRole('button',{name:'Jab J',exact:true}).click();
await page.waitForTimeout(1100);
await page.screenshot({path:'artifacts/fighting.png',fullPage:true});
console.log('Desktop overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
for(const width of [390,768,1024]){await page.setViewportSize({width,height:900});await page.screenshot({path:`artifacts/width-${width}.png`,fullPage:true});console.log(`Overflow at ${width}:`,await page.evaluate(()=>({horizontal:document.documentElement.scrollWidth>innerWidth,vertical:document.documentElement.scrollHeight>innerHeight,controls:document.querySelector('.move-grid').getBoundingClientRect().bottom<=innerHeight})));}
await page.setViewportSize({width:844,height:390});await page.screenshot({path:'artifacts/landscape.png',fullPage:true});console.log('Landscape fit:',await page.evaluate(()=>({vertical:document.documentElement.scrollHeight>innerHeight,controls:document.querySelector('.move-grid').getBoundingClientRect().bottom<=innerHeight})));
await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'End practice'}).click();await page.screenshot({path:'artifacts/mobile-menu.png',fullPage:true});
await browser.close();
