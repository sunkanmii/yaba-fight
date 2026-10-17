import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{stdio:'inherit',env:{...process.env,CLOUDFLARE_BUILD:'1',NEXT_PUBLIC_REALTIME_TRANSPORT:'cloudflare'}});
process.exit(result.status??1);
