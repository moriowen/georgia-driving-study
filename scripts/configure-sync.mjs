// Setup only. The PAT is read from a supplied secret file and never persisted.
// A private pairing key stays outside the repository. Only its hash enters SQL.
import fs from 'node:fs';
import crypto from 'node:crypto';
const [tokenFile,projectRef]=process.argv.slice(2);
if(!tokenFile||!/^[a-z]{20}$/.test(projectRef||''))throw Error('Provide a token file and project ref');
const token=fs.readFileSync(tokenFile,'utf8').trim();
const keyFile='/private/tmp/georgia-driving-sync-key';
const key=fs.existsSync(keyFile)?fs.readFileSync(keyFile,'utf8').trim():crypto.randomBytes(32).toString('hex');
if(!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid pairing key file');
if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,key,{mode:0o600});
const hash=crypto.createHash('sha256').update(key).digest('hex');
const sql=fs.readFileSync(new URL('../supabase/sync.sql',import.meta.url),'utf8')+`\ninsert into driving_study.settings(singleton,key_hash) values(true,'${hash}') on conflict(singleton) do update set key_hash=excluded.key_hash;`;
const response=await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});
if(!response.ok){console.error(JSON.stringify({status:response.status,error:await response.text()}));process.exitCode=1}else{console.log(JSON.stringify({configured:true,projectRef,pairingKeyFile:keyFile}));}
