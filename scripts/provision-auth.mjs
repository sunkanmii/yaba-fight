// Generates one local development secret and uploads the same value without
// printing it. .dev.vars is ignored by Git. Run once when provisioning accounts.
import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const path=new URL('../.dev.vars',import.meta.url);
let vars=existsSync(path)?readFileSync(path,'utf8'):'';
let secret=vars.match(/^BETTER_AUTH_SECRET=(.+)$/m)?.[1];
if(!secret){secret=randomBytes(48).toString('base64url');vars+=`\nBETTER_AUTH_SECRET=${secret}\n`;writeFileSync(path,vars)}
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','put','BETTER_AUTH_SECRET'],{input:secret,encoding:'utf8'});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');process.exit(result.status??1);
