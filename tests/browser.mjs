import {chromium,expect} from '@playwright/test';
const base=process.env.TEST_URL||'http://127.0.0.1:8799';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],contexts=[],created=new Set();const password='Browser-test-password-397';
try{
 const ca=await browser.newContext(),cb=await browser.newContext({viewport:{width:390,height:844}});contexts.push(ca,cb);
 const a=await ca.newPage(),b=await cb.newPage();for(const page of [a,b])page.on('pageerror',error=>errors.push(error.message));
 const suffix=Date.now().toString(36);const aname=`Ada_${suffix}`,bname=`Bayo_${suffix}`;
 await a.goto(base);await a.getByRole('button',{name:'Find a fight',exact:true}).click();await a.getByRole('button',{name:'Create account',exact:true}).click();
 await a.getByLabel('Fighter username').fill(aname);await a.getByLabel('Email',{exact:true}).fill(`${aname}@example.com`);await a.getByLabel('Password',{exact:true}).fill(password);await a.getByRole('button',{name:'Claim my name'}).click();await expect(a.locator('.name-button')).toContainText(aname,{timeout:20000});created.add(ca);await expect(a.locator('.room-details>strong')).toBeVisible({timeout:20000});
 await a.getByRole('button',{name:'Practise while waiting'}).click();await a.getByRole('button',{name:'Jab J',exact:true}).click();await expect(a.locator('.controls-heading')).toContainText('Exchange 2');
 const r=await cb.request.post(`${base}/api/auth/sign-up/email`,{data:{name:bname,username:bname,displayUsername:bname,email:`${bname}@example.com`,password},headers:{Origin:base}});expect(r.status()).toBe(200);created.add(cb);
 await b.goto(base);await expect(b.locator('.name-button')).toContainText(bname);await b.getByRole('button',{name:'Find a fight',exact:true}).click();
 await expect(a.locator('.health-label').last()).toContainText(bname,{timeout:20000});await expect(a.locator('.game-app')).toHaveClass(/is-playing/);await expect(b.getByRole('dialog')).toHaveCount(0);await expect(a.getByRole('timer')).toBeVisible();
 await a.getByRole('button',{name:'Jab J',exact:true}).click();await expect(a.locator('.exchange-feedback')).toContainText('WAITING');await b.getByRole('button',{name:'Parry P',exact:true}).click();await expect(a.locator('.health-label').first()).toContainText('82 HP');
 await a.reload();await expect(a.locator('.health-label').first()).toContainText('82 HP');await expect(a.locator('.name-button')).toContainText(aname);await expect(a.getByRole('timer')).toBeVisible();
 await a.getByRole('button',{name:'Open session chat'}).click();await b.getByRole('button',{name:'Open session chat'}).click();await a.getByRole('textbox',{name:'Message to opponent'}).fill('Good hands, Bayo!');await a.getByRole('button',{name:'Send message'}).click();await expect(b.locator('.chat-messages')).toContainText('Good hands, Bayo!');await a.getByRole('button',{name:'Close session chat'}).click();
 await a.getByRole('button',{name:'Online',exact:true}).click();await expect(a.getByRole('dialog')).toBeVisible();await a.getByRole('button',{name:'Close dialog'}).click();await expect(a.locator('.health-label').first()).toContainText('82 HP');await expect(a.locator('.game-app')).toHaveClass(/is-playing/);await a.getByRole('button',{name:'Practice',exact:true}).click();
 for(const [value,art]of [['1','lazarus'],['2','sade'],['0','opponent']]){await a.getByLabel('Or train with a sparring partner').selectOption(value);await expect(a.locator('.fighter-art img')).toHaveAttribute('src',`/art/${art}.webp`)}
 await a.getByRole('button',{name:'Start sparring'}).click();await a.keyboard.press('p');await expect(a.locator('.controls-heading')).toContainText('Exchange 2');await expect(a.getByRole('button',{name:'Breathe R',exact:true})).toBeEnabled();await a.getByRole('button',{name:'Breathe R',exact:true}).click();await expect(a.locator('.controls-heading')).toContainText('Exchange 3');
 for(let turn=0;turn<75;turn++){
  if(await a.getByRole('button',{name:'Run it back'}).isVisible())break;
  if(await a.getByRole('button',{name:'Next round'}).isVisible()){await a.getByRole('button',{name:'Next round'}).click();continue}
  const heavy=a.getByRole('button',{name:'Power K',exact:true}),rest=a.getByRole('button',{name:'Breathe R',exact:true});
  if(await heavy.isEnabled())await heavy.click();else if(await rest.isEnabled())await rest.click();await a.waitForTimeout(1000);
 }
 await expect(a.getByRole('button',{name:'Run it back'})).toBeVisible();await a.getByRole('button',{name:'How to play',exact:true}).click();await expect(a.getByRole('dialog')).toContainText('stamina');await a.keyboard.press('Escape');await expect(a.getByRole('dialog')).toHaveCount(0);
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('PASS: signup UI, human-first menu, live practice while matchmaking, automatic switch to rival, reload restores fight/account, timed play, chat, three distinct fighters, keyboard, stamina recovery, three-round practice and accessible dialogs.');
}finally{for(const c of contexts){if(created.has(c)){const response=await c.request.post(`${base}/api/auth/delete-user`,{data:{password},headers:{Origin:base}}).catch(()=>null);if(response&&!response.ok()){console.error('Test account cleanup failed:',response.status());process.exitCode=1}}await c.close()}await browser.close()}
