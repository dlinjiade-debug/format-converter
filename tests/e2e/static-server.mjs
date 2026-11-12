import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { repoRoot } from './paths.mjs';
export async function staticServer(){
 const server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=resolve(repoRoot,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(repoRoot+sep)){res.writeHead(403).end();return}
   const data=await readFile(file);
   res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.wasm':'application/wasm'})[extname(file)]||'application/octet-stream');
   res.end(data);
  }catch(e){res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};
}
