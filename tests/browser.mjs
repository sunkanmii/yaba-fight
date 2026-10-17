import {chromium,expect} from '@playwright/test';
const base=process.env.TEST_URL||'http://127.0.0.1:8799';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[];
try{
 const ca=await browser.newContext(),cb=await browser.newContext();
 await ca.addInitScript(()=>localStorage.setItem('yf-name','Ada'));
 await cb.addInitScript(()=>localStorage.setItem('yf-name','Bayo'));
 const a=await ca.newPage(),b=await cb.newPage();
 for(const page of [a,b])page.on('pageerror',error=>errors.push(error.message));
 await a.goto(base);await b.goto(base);
 await a.getByRole('button',{name:'With a friend'}).click();
 await a.getByRole('button',{name:'Create a friend room'}).click();
 await expect(a.locator('.room-details>strong')).toBeVisible();const code=await a.locator('.room-details>strong').innerText();
 await b.getByRole('button',{name:'With a friend'}).click();await b.getByRole('textbox',{name:'Six-character room code'}).fill(code);await b.getByRole('button',{name:'Join',exact:true}).click();
 await expect(a.getByRole('dialog')).toHaveCount(0);await expect(b.getByRole('dialog')).toHaveCount(0);
 await a.getByRole('button',{name:'Jab J',exact:true}).click();await expect(a.locator('.exchange-feedback')).toContainText('WAITING');
 await b.getByRole('button',{name:'Parry P',exact:true}).click();await expect(a.locator('.health-label').first()).toContainText('82 HP');await expect(b.locator('.health-label').last()).toContainText('82 HP');
 await a.getByRole('textbox',{name:'Message to opponent'}).fill('Good hands, Bayo!');await a.getByRole('button',{name:'Send message'}).click();await expect(b.locator('.chat-messages')).toContainText('Good hands, Bayo!');
 await a.getByRole('button',{name:'Practice',exact:true}).click();await a.getByRole('button',{name:'Start sparring'}).click();
 await a.keyboard.press('j');await expect(a.locator('.controls-heading')).toContainText('Exchange 2', {timeout:3000});
 for(let turn=0;turn<32;turn++){
   if(await a.getByRole('button',{name:'Run it back'}).isVisible())break;
   if(await a.getByRole('button',{name:'Next round'}).isVisible()){await a.getByRole('button',{name:'Next round'}).click();continue;}
   const move=a.getByRole('button',{name:'Power K',exact:true});await expect(move).toBeEnabled();await move.click();await a.waitForTimeout(590);
 }
 await expect(a.getByRole('button',{name:'Run it back'})).toBeVisible();
 await a.getByRole('button',{name:'How to play'}).click();await expect(a.getByRole('dialog')).toBeVisible();await a.keyboard.press('Escape');await expect(a.getByRole('dialog')).toHaveCount(0);
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('PASS: two-browser friend-code flow, move reveal, damage, chat, keyboard play, complete three-round practice, and accessible dialog dismissal.');
}finally{await browser.close()}
