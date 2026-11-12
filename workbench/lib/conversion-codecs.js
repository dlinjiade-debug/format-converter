/* First-party offline codecs. This file is both a classic script and a Worker. */
(function(root){
  'use strict';
  const inWorker=typeof document==='undefined';
  const workerUrl=inWorker?null:document.currentScript.src;
  const abort=()=>new DOMException('转换已取消','AbortError');
  const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
  async function bmp({width,height,pixels},check=()=>{}){
    const stride=(width*3+3)&~3;
    const bytes=new Uint8Array(54+stride*height),view=new DataView(bytes.buffer);
    bytes.set([66,77]);view.setUint32(2,bytes.length,true);view.setUint32(10,54,true);
    view.setUint32(14,40,true);view.setInt32(18,width,true);view.setInt32(22,height,true);
    view.setUint16(26,1,true);view.setUint16(28,24,true);view.setUint32(34,stride*height,true);
    for(let y=0;y<height;y++){
      if(y%256===0){check();await pause()}
      for(let x=0;x<width;x++){
        const src=(y*width+x)*4,dst=54+(height-1-y)*stride+x*3;
        bytes[dst]=pixels[src+2];bytes[dst+1]=pixels[src+1];bytes[dst+2]=pixels[src];
      }
    }
    return {bytes,type:'image/bmp'};
  }
  async function ico({width,height,png}){
    const bytes=new Uint8Array(22+png.length),view=new DataView(bytes.buffer);
    view.setUint16(2,1,true);view.setUint16(4,1,true);bytes[6]=width===256?0:width;bytes[7]=height===256?0:height;
    view.setUint16(10,1,true);view.setUint16(12,32,true);view.setUint32(14,png.length,true);view.setUint32(18,22,true);
    bytes.set(png,22);return {bytes,type:'image/x-icon'};
  }
  async function mp3({channels,sampleRate},check=()=>{}){
    if(inWorker&&!root.lamejs)importScripts('lame.min.js');
    if(!root.lamejs)throw new Error('MP3 编码器未加载');
    const encoder=new root.lamejs.Mp3Encoder(channels.length,sampleRate,128),chunks=[];
    const pcm=sample=>{const v=Math.max(-1,Math.min(1,sample));return v<0?v*32768:v*32767};
    for(let offset=0;offset<channels[0].length;offset+=1152){
      if(offset%(1152*128)===0){check();await pause()}
      const length=Math.min(1152,channels[0].length-offset);
      const left=new Int16Array(length),right=channels.length>1?new Int16Array(length):null;
      for(let j=0;j<length;j++){left[j]=pcm(channels[0][offset+j]);if(right)right[j]=pcm(channels[1][offset+j])}
      const data=right?encoder.encodeBuffer(left,right):encoder.encodeBuffer(left);
      if(data.length)chunks.push(new Uint8Array(data));
    }
    const tail=encoder.flush();if(tail.length)chunks.push(new Uint8Array(tail));
    const bytes=new Uint8Array(chunks.reduce((sum,x)=>sum+x.length,0));let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    return {bytes,type:'audio/mpeg'};
  }
  const codecs={bmp,ico,mp3};
  if(inWorker){
    root.onmessage=async({data})=>{try{const result=await codecs[data.kind](data.payload);root.postMessage({result},[result.bytes.buffer])}catch(error){root.postMessage({error:error.message})}};
  }else{
    root.ConversionCodecs={async run(kind,payload,signal){
      const check=()=>{if(signal?.aborted)throw abort()};check();
      if(location.protocol!=='file:'&&typeof Worker!=='undefined'){
        return new Promise((resolve,reject)=>{
          const worker=new Worker(workerUrl);
          const cancel=()=>{cleanup();reject(abort())};
          const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',cancel)};
          signal?.addEventListener('abort',cancel,{once:true});
          worker.onmessage=({data})=>{cleanup();data.error?reject(new Error(data.error)):resolve(new Blob([data.result.bytes],{type:data.result.type}))};
          worker.onerror=()=>{cleanup();reject(new Error('本地编码线程加载失败，请重试'))};
          worker.postMessage({kind,payload});
        });
      }
      const result=await codecs[kind](payload,check);check();return new Blob([result.bytes],{type:result.type});
    }};
  }
})(globalThis);
