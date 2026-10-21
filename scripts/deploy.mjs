import { spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function run(command,args,cwd=root,capture=false) {
 const result=spawnSync(command,args,{cwd,encoding:'utf8',stdio:capture?'pipe':'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error(capture?`${command} failed: ${result.stderr.trim()}`:`${command} exited with status ${result.status}`);
 return result.stdout?.trim();
}
let temporary;
try {
 const remote=run('git',['remote','get-url','origin'],root,true);
 const match=remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
 if(!match)throw new Error('Origin must point to your GitHub repository.');
 const [,owner,repo]=match;
 const envText=['.env','.env.local','.env.production','.env.production.local'].filter(f=>existsSync(join(root,'app',f))).map(f=>readFileSync(join(root,'app',f),'utf8')).join('\n');
 for(const key of ['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY']) {
  if(!process.env[key]&&!new RegExp(`^${key}=.+`,'m').test(envText))throw new Error(`Set ${key} in app/.env.local before deploying the cloud CRM.`);
 }
 if(!existsSync(join(root,'app/node_modules')))run('npm',['ci','--prefix','app']);
 run('npm',['--prefix','app','run','build','--',`--base=/${repo}/`]);
 const dist=join(root,'app/dist');
 writeFileSync(join(dist,'.nojekyll'),'');
 if(process.argv.includes('--build-only')) {console.log(`Build ready: ${dist}. Nothing pushed.`);process.exit(0);}
 temporary=mkdtempSync(join(tmpdir(),'sunpay-pages-'));
 run('git',['init','--initial-branch=gh-pages'],temporary);
 run('git',['remote','add','origin',remote],temporary);
 const existing=run('git',['ls-remote','--heads','origin','gh-pages'],temporary,true);
 if(existing) {
  run('git',['fetch','--depth=1','origin','gh-pages'],temporary);
  run('git',['reset','--hard','FETCH_HEAD'],temporary);
  run('git',['rm','-r','--ignore-unmatch','.'],temporary);
 }
 cpSync(dist,temporary,{recursive:true});
 run('git',['add','--all'],temporary);
 const changes=run('git',['status','--porcelain'],temporary,true);
 if(!changes) {console.log('The published build already matches this version.');}
 else {
  run('git',['-c','user.name=Sunpay deploy','-c','user.email=deploy@sunpay.invalid','commit','-m','Publish Sunpay CRM build'],temporary);
  run('git',['push','origin','HEAD:gh-pages'],temporary);
 }
 console.log(`\nBuild pushed. In GitHub Settings → Pages choose Deploy from a branch → gh-pages → / (root).\nSite URL once Pages is enabled: https://${owner}.github.io/${repo}/`);
} catch(error) {console.error(`\nDeployment stopped: ${error.message}`);process.exitCode=1;}
finally {if(temporary)rmSync(temporary,{recursive:true,force:true});}
