'use client';
import {useState} from 'react';

export type FighterAccount={id:string;name:string;email:string};
export type AccountRecord={played:number;wins:number};
export async function loadAccount(){
 const response=await fetch('/api/account',{cache:'no-store'});
 if(!response.ok)throw new Error('Accounts are unavailable. Please try again shortly.');
 return response.json() as Promise<{user:FighterAccount|null;record?:AccountRecord}>;
}
async function authRequest(path:string,body:unknown){
 const response=await fetch(`/api/auth/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.message||'Could not complete that request. Please try again.');
 return data;
}
export function AccountPanel({user,record,initialName,onChange}:{user:FighterAccount|null;record:AccountRecord;initialName:string;onChange:(user:FighterAccount|null,record?:AccountRecord)=>void}){
 const [view,setView]=useState<'signup'|'login'>('login');const [username,setUsername]=useState(initialName.replace(/[^a-zA-Z0-9_]/g,'').slice(0,18));
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [deleting,setDeleting]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setBusy(true);
  try{await authRequest(view==='signup'?'sign-up/email':'sign-in/email',view==='signup'?{email,password,name:username,username,displayUsername:username}:{email,password});const account=await loadAccount();if(!account.user)throw new Error('Sign-in did not complete. Try again.');setPassword('');onChange(account.user,account.record)}catch(error){setError((error as Error).message)}finally{setBusy(false)}
 }
 async function logout(){setBusy(true);setError('');try{await authRequest('sign-out',{});onChange(null)}catch(error){setError((error as Error).message)}finally{setBusy(false)}}
 async function remove(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await authRequest('delete-user',{password});setPassword('');onChange(null)}catch(error){setError((error as Error).message)}finally{setBusy(false)}}
 if(user)return <div className="account-panel"><p className="account-name">{user.name}</p><p>{user.email}</p><div className="account-record"><span><strong>{record.played}</strong> online fights</span><span><strong>{record.wins}</strong> wins</span></div><small>Your username and online record belong to this account. Practice records stay on this device.</small><button className="secondary-button" disabled={busy} onClick={logout}>Sign out</button><button className="text-button" onClick={()=>{setDeleting(v=>!v);setPassword('');setError('')}}>Delete account</button>{deleting&&<form onSubmit={remove} className="account-form"><p>Delete your account, sessions, online record and sponsor requests permanently. This cannot be undone.</p><label htmlFor="delete-password">Confirm your password</label><input id="delete-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="secondary-button" disabled={busy}>Permanently delete account</button></form>}{error&&<p role="alert" className="form-error">{error}</p>}</div>;
 return <div className="account-panel"><div className="account-tabs"><button className={view==='login'?'active':''} onClick={()=>{setView('login');setError('')}}>Sign in</button><button className={view==='signup'?'active':''} onClick={()=>{setView('signup');setError('')}}>Create account</button></div><p>{view==='signup'?'Claim your name. Return to the same fighter on any device.':'Welcome back. Your corner is waiting.'}</p><form onSubmit={submit} className="account-form">{view==='signup'&&<><label htmlFor="account-username">Fighter username</label><input id="account-username" name="username" spellCheck={false} autoCapitalize="none" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required minLength={3} maxLength={18} pattern="[a-zA-Z0-9_]+" placeholder="MainlandMike"/><small>3–18 letters, numbers or underscores. Your name is reserved.</small></>}<label htmlFor="account-email">Email</label><input id="account-email" name="email" spellCheck={false} autoCapitalize="none" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><label htmlFor="account-password">Password</label><input id="account-password" name="password" type="password" autoComplete={view==='signup'?'new-password':'current-password'} required minLength={view==='signup'?10:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/>{view==='signup'&&<small>At least 10 characters. No email confirmation needed.</small>}{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary-button" disabled={busy}>{busy?'One moment…':view==='signup'?'Claim my name':'Sign in'}</button><small>Password recovery is coming later. Save your password somewhere safe.</small></form></div>;
}
