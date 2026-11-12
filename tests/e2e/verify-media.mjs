import assert from 'node:assert/strict';
import { launchBrowser } from './helpers.mjs';
import { staticServer } from './static-server.mjs';
const server=await staticServer(),browser=await launchBrowser();
try{
 const page=await browser.newPage();let workers=0;const external=[];
 page.on('worker',()=>workers++);page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(server.url))external.push(r.url())});
 await page.goto(server.url);
 const result=await page.evaluate(async()=>{
  const sampleRate=44100,pcm=new Float32Array(4410);for(let i=0;i<pcm.length;i++)pcm[i]=.2*Math.sin(i*2*Math.PI*440/sampleRate);
  const input=new File([audioBufToWav({numberOfChannels:1,sampleRate,length:pcm.length,getChannelData:()=>pcm})],'source.wav');
  const mp3=await convertFile(input,'mp3'),ogg=await convertFile(input,'ogg');
  const signature=async b=>Array.from(new Uint8Array(await b.arrayBuffer()).slice(0,8));
  const ff=await getFFmpeg();await ff.exec(['-f','lavfi','-i','color=c=blue:s=96x64:r=5','-t','0.4','-c:v','libx264','sample.mp4']);
  const source=await ff.readFile('sample.mp4');const video=new File([source],'clip.mp4');await ff.deleteFile('sample.mp4');
  const gif=await convertFile(video,'gif'),webm=await convertFile(new File([source],'clip.wmv'),'webm');
  return {mp3:await signature(mp3.blob),ogg:await signature(ogg.blob),gif:await signature(gif.blob),webm:await signature(webm.blob),files:(await ff.listDir('/')).filter(n=>/^input-|^output-/.test(n.name))};
 });
 assert.equal(result.mp3[0],255);assert.deepEqual(result.ogg.slice(0,4),[79,103,103,83]);assert.deepEqual(result.gif.slice(0,3),[71,73,70]);assert.deepEqual(result.webm.slice(0,4),[26,69,223,163]);assert.deepEqual(result.files,[]);assert.ok(workers>0);assert.deepEqual(external,[]);console.log({result,workers});
}finally{await browser.close();await server.close()}
