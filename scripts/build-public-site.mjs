// Preserve the independently updated default-branch site; add the shared app
// as /workbench/. The public artifact includes no tests, private paths or EXEs.
import { execFileSync } from 'node:child_process';
import { mkdirSync,cpSync,copyFileSync,readFileSync,writeFileSync,existsSync } from 'node:fs';
import { resolve,join } from 'node:path';
const output=resolve(process.argv[2]||'.site');
if(existsSync(output))throw new Error('Choose an empty/nonexistent site output directory to avoid overwriting artifacts');
mkdirSync(output,{recursive:true});
const upstream=execFileSync('git',['rev-parse','origin/master'],{encoding:'utf8'}).trim();
const files=execFileSync('git',['ls-tree','-r','--name-only',upstream],{encoding:'utf8'}).trim().split('\n').filter(path=>path==='index.html'||path.startsWith('vendor/'));
for(const path of files){const target=join(output,path);mkdirSync(resolve(target,'..'),{recursive:true});writeFileSync(target,execFileSync('git',['show',upstream+':'+path],{maxBuffer:64*1024*1024}))}
const home=readFileSync(join(output,'index.html'),'utf8');
const link='<a href="./workbench/" style="position:fixed;right:16px;bottom:16px;z-index:9999;background:#6d28d9;color:white;padding:12px 18px;border-radius:12px;font:14px system-ui;text-decoration:none;box-shadow:0 4px 24px #0006">增强工作台 · Windows 软件</a>';
writeFileSync(join(output,'index.html'),home.replace('</body>',link+'\n</body>'));
mkdirSync(join(output,'workbench'),{recursive:true});copyFileSync('index.html',join(output,'workbench','index.html'));cpSync('lib',join(output,'workbench','lib'),{recursive:true});
writeFileSync(join(output,'.nojekyll'),'');
const workbenchCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const workbenchDirty=!!execFileSync('git',['status','--porcelain','--','index.html','lib','desktop','package.json'],{encoding:'utf8'}).trim();
writeFileSync(join(output,'site-build.json'),JSON.stringify({upstream,workbenchCommit,workbenchDirty,workbenchVersion:JSON.parse(readFileSync('package.json','utf8')).version,builtAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({output,upstream,workbench:'/workbench/',sourceFiles:files.length}));
