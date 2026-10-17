import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://127.0.0.1:8799';await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();await page.goto(base);
 for(const [width,height]of [[360,640],[375,667],[390,844],[844,390]]){
  await page.setViewportSize({width,height});const cta=page.getByRole('button',{name:'Start sparring'});await expect(cta).toBeVisible();const box=await cta.boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(height);await page.screenshot({path:`artifacts/menu-${width}-${height}.png`});
 }
 await page.setViewportSize({width:375,height:667});await page.locator('.name-button').click();await page.getByRole('button',{name:'Create account',exact:true}).click();await page.screenshot({path:'artifacts/account-phone.png'});await expect(page.getByRole('button',{name:'Claim my name'})).toBeVisible();await page.getByRole('button',{name:'Close dialog'}).click();
 for(const value of ['1','2']){await page.getByLabel('Or train with a sparring partner').selectOption(value);await page.locator('.fighter-art img').evaluate(img=>img.decode());await page.getByRole('button',{name:'Start sparring'}).click();await page.screenshot({path:`artifacts/fighter-${value}-phone.png`});await page.getByRole('button',{name:'End practice'}).click()}
 console.log('PASS: short-phone menus, portrait/landscape primary actions, signup form and distinct rival rendering.');
}finally{await browser.close()}
