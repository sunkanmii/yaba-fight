import {request} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:8799';
const contexts=[];const make=async()=>{const c=await request.newContext({baseURL:base,extraHTTPHeaders:{Origin:base}});contexts.push(c);return c};
const owner=await make(),other=await make(),guest=await make();const suffix=Date.now().toString(36);const username=`Test_${suffix}`,email=`qa-${suffix}@example.com`,password='A-test-password-9374';
const post=(ctx,path,data)=>ctx.post(path,{data});
try{
 let r=await post(guest,'/api/rooms',{action:'create-room',name:'Imposter',token:crypto.randomUUID()});assert.equal(r.status(),401);
 r=await post(owner,'/api/auth/sign-up/email',{email,password,name:username,username,displayUsername:username});assert.equal(r.status(),200,await r.text());let data=await r.json();assert.equal(data.user.emailVerified,false);assert.equal(data.user.username,username.toLowerCase());assert.equal('password' in data.user,false);
 let account=await (await owner.get('/api/account')).json();assert.equal(account.user.name,username);assert.equal(account.record.played,0);
 const cookies=(await owner.storageState()).cookies;assert.ok(cookies.some(c=>c.name.includes('session_token')&&c.httpOnly&&c.sameSite==='Lax'));if(base.startsWith('https:'))assert.ok(cookies.every(c=>c.secure));
 r=await post(other,'/api/auth/sign-up/email',{email:`other-${suffix}@example.com`,password,name:'Duplicate',username:username.toUpperCase()});assert.equal(r.ok(),false);
 const otherName=`Other_${suffix}`;r=await post(other,'/api/auth/sign-up/email',{email:`other-${suffix}@example.com`,password,name:username,username:otherName,displayUsername:username});assert.equal(r.status(),200);assert.equal((await (await other.get('/api/account')).json()).user.name,otherName.toLowerCase(),'an unrelated display name must not impersonate a reserved username');
 r=await post(owner,'/api/auth/sign-out',{});assert.equal(r.status(),200);assert.equal((await (await owner.get('/api/account')).json()).user,null);
 r=await post(owner,'/api/auth/sign-in/email',{email,password:'wrong-password'});assert.equal(r.ok(),false);
 r=await post(owner,'/api/auth/sign-in/email',{email,password});assert.equal(r.status(),200);account=await (await owner.get('/api/account')).json();assert.equal(account.user.name,username);
 r=await post(owner,'/api/auth/request-password-reset',{email});assert.equal(r.status(),503);
 r=await post(guest,'/api/sponsors',{slot:'left-wall',brand:'QA'});assert.equal(r.status(),401);
 r=await post(owner,'/api/sponsors',{slot:'left-wall',brand:'QA Brand',email,website:'javascript:alert(1)',message:'QA'});assert.equal(r.status(),400);
 r=await post(owner,'/api/sponsors',{slot:'left-wall',brand:'QA Brand',email,website:'https://example.com',message:'QA enquiry, removed with this test account.'});assert.equal(r.status(),201);assert.match((await r.json()).id,/^[a-f0-9-]{36}$/);
 r=await post(owner,'/api/auth/delete-user',{password});assert.equal(r.status(),200,await r.text());assert.equal((await (await owner.get('/api/account')).json()).user,null);
 r=await post(owner,'/api/auth/sign-in/email',{email,password});assert.equal(r.ok(),false);
 r=await post(other,'/api/auth/delete-user',{password});assert.equal(r.status(),200);
 console.log('PASS: database accounts, reserved case-insensitive usernames, no signup verification, HttpOnly sessions, return login, wrong-password rejection, deferred recovery, sponsor validation/persistence and account deletion.');
}finally{await Promise.all(contexts.map(c=>c.dispose()))}
