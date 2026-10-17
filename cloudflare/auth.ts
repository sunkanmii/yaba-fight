import {betterAuth} from 'better-auth';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import {username} from 'better-auth/plugins';
import {drizzle} from 'drizzle-orm/d1';
import * as schema from './schema';

// A display name may preserve capitalisation, but must never bypass the
// unique username when an API client supplies an unrelated display value.
export function fighterName(user:{username?:string|null;displayUsername?:string|null;name:string}){
 const canonical=user.username||'Fighter';
 return user.displayUsername?.toLowerCase()===canonical.toLowerCase()?user.displayUsername:canonical;
}

export function createAuth(env:Env,origin:string){
 if(!env.BETTER_AUTH_SECRET)throw new Error('Account service is not configured');
 return betterAuth({
  appName:'Yaba Fight',baseURL:origin,secret:env.BETTER_AUTH_SECRET,
  database:drizzleAdapter(drizzle(env.DB),{provider:'sqlite',schema}),
  emailAndPassword:{enabled:true,requireEmailVerification:false,minPasswordLength:10,maxPasswordLength:128,revokeSessionsOnPasswordReset:true},
  session:{expiresIn:60*60*24*30,updateAge:60*60*24},
  user:{deleteUser:{enabled:true}},
  advanced:{useSecureCookies:origin.startsWith('https:'),cookiePrefix:'yf',ipAddress:{ipAddressHeaders:['cf-connecting-ip']}},
  plugins:[username({minUsernameLength:3,maxUsernameLength:18,usernameValidator:value=>/^[a-zA-Z0-9_]+$/.test(value)})]
 });
}
