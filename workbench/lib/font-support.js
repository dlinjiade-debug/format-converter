/* Local fonts and searchable text layers; no network or OCR. */
(function(root){
 'use strict';
 const fonts=new Map(),registered=new WeakMap();
 const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s)};
 function available(name){
  name=String(name||'').replace(/["']/g,'').trim();
  if(!name||/^(?:serif|sans-serif|monospace|system-ui|inherit)$/i.test(name)||fonts.has(name.toLowerCase()))return true;
  const ctx=document.createElement('canvas').getContext('2d'),sample='mmmmWWWW0123456789汉字';
  return ['monospace','serif','sans-serif'].some(fallback=>{ctx.font='48px '+fallback;const width=ctx.measureText(sample).width;ctx.font='48px '+JSON.stringify(name)+','+fallback;return Math.abs(ctx.measureText(sample).width-width)>.1});
 }
 async function load(file,family){
  if(!/\.ttf$/i.test(file.name)||file.size>32*1024*1024)throw new Error('请选择不超过 32 MB 的 TTF 字体');
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
  if(bytes.length<12||view.getUint32(0)!==0x00010000)throw new Error('需要 TrueType 轮廓的 TTF 字体，暂不支持 OTF/字体集合');
  family=String(family||file.name.replace(/\.ttf$/i,'')).trim().slice(0,80);
  if(!family||/[\r\n{}<>]/.test(family))throw new Error('字体名称无效');
  const face=new FontFace(family,bytes);await face.load();
  const old=fonts.get(family.toLowerCase());if(old){document.fonts.delete(old.face);URL.revokeObjectURL(old.url)}
  const url=URL.createObjectURL(new Blob([bytes],{type:'font/ttf'}));document.fonts.add(face);
  const font={family,bytes,face,url,base64:null};fonts.set(family.toLowerCase(),font);return {family,size:bytes.length};
 }
 function css(){return [...fonts.values()].map(f=>'@font-face{font-family:'+JSON.stringify(f.family)+';src:url('+JSON.stringify(f.url)+') format("truetype");font-weight:100 900;font-style:normal}').join('\n')}
 async function apply(element,warnings=[]){
  const fallback=[...fonts.values()].at(-1);if(!fallback)return;
  const doc=element.ownerDocument;
  if(doc!==document&&!doc.querySelector('style[data-local-fonts]')){const style=doc.createElement('style');style.dataset.localFonts='true';style.textContent=css();doc.head.appendChild(style)}
  let changed=false;const view=doc.defaultView;
  for(const el of [element,...element.querySelectorAll('*')]){
   if(!el.childNodes.length||![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
   const primary=view.getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g,'').trim();
   if(!available(primary)){el.style.fontFamily=JSON.stringify(fallback.family)+',sans-serif';changed=true}
  }
  if(changed&&!warnings.includes('缺失字体已使用本地加载字体替换，请在预览中核对换行与数字位置。'))warnings.push('缺失字体已使用本地加载字体替换，请在预览中核对换行与数字位置。');
  if(doc.fonts)await doc.fonts.ready;
 }
 function collect(element){
  const rect=element.getBoundingClientRect(),view=element.ownerDocument.defaultView,result=[];
  const walker=element.ownerDocument.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node,characters=0;
  while((node=walker.nextNode())){
   if(!node.textContent.trim()||/^(STYLE|SCRIPT|NOSCRIPT)$/.test(node.parentElement?.tagName))continue;
   const style=view.getComputedStyle(node.parentElement);if(style.display==='none'||style.visibility==='hidden')continue;
   const range=element.ownerDocument.createRange();let run=null;
   for(let offset=0;offset<node.length&&characters++<30000;){
    const char=String.fromCodePoint(node.textContent.codePointAt(offset)),length=char.length;
    range.setStart(node,offset);range.setEnd(node,offset+length);offset+=length;
    const box=range.getBoundingClientRect();if(!box.width||!box.height)continue;
    const x=box.left-rect.left,y=box.top-rect.top;
    if(run&&Math.abs(run.y-y)<2&&Math.abs(run.x+run.width-x)<6){run.text+=char;run.width=x+box.width-run.x}
    else{run={text:char,x,y,width:box.width,height:box.height,fontSize:parseFloat(style.fontSize)||12};result.push(run)}
   }
  }
  return result;
 }
 function embed(pdf){
  const custom=[...fonts.values()].at(-1);
  let family='helvetica',metadata;
  if(custom){
   let map=registered.get(pdf);if(!map){map=new Map();registered.set(pdf,map)}
   family=map.get(custom);
   if(!family){family=custom.family;const file='LocalFont'+map.size+'.ttf';custom.base64??=base64(custom.bytes);pdf.addFileToVFS(file,custom.base64);pdf.addFont(file,family,'normal');map.set(custom,family)}
  }
  pdf.setFont(family,'normal');metadata=pdf.getFont().metadata;
  return {family,custom:!!custom,supports:text=>[...text].every(c=>/[\r\n\t ]/.test(c)||(custom?c.codePointAt(0)<=65535&&typeof metadata.characterToGlyph==='function'&&metadata.characterToGlyph(c.codePointAt(0)):/^[\x20-\xff]$/.test(c)))};
 }
 function addText(pdf,runs,{scale=.75,fontScale=.75,top=0,height=Infinity,warnings=[]}={}){
  if(root.ConversionWorkbench?.settings.searchable===false)return;
  const {family,custom}=embed(pdf);
  let missing=false;
  for(const run of runs){
   if(run.y<top-1||run.y>=top+height||!run.text.trim())continue;
   let font=family,text=run.text;
   pdf.setFont(font,'normal');const metadata=pdf.getFont().metadata;
   if(custom&&typeof metadata.characterToGlyph==='function'){
    const unsupported=[...text].some(c=>!/[\r\n\t ]/.test(c)&&!metadata.characterToGlyph(c.codePointAt(0)));
    if(unsupported&&/^[\x20-\xff\r\n\t]*$/.test(text)){font='helvetica';pdf.setFont(font,'normal')}
    else if(unsupported){missing=true;text=[...text].filter(c=>/\s/.test(c)||metadata.characterToGlyph(c.codePointAt(0))).join('')}
   }else if(/[^\x20-\xff\r\n\t]/.test(text)){missing=true;text=text.replace(/[^\x20-\xff\r\n\t]/g,'')}
   if(text.trim())pdf.setFontSize(Math.max(3,run.fontSize*fontScale)).text(text,Math.max(0,run.x*scale),Math.max(0,(run.y-top)*scale),{baseline:'top',renderingMode:'invisible'});
  }
  if(missing){const message='部分中文或特殊字符缺少可嵌入字体：页面外观保留，但这些字符暂不可搜索。可在设置中加载包含相应字形的本地 TTF 字体后重试。';if(!warnings.includes(message))warnings.push(message)}
 }
 root.LocalFontSupport={load,available,apply,css,collect,addText,embed,list:()=>[...fonts.values()].map(f=>({family:f.family,size:f.bytes.length})),clear(){for(const f of fonts.values()){document.fonts.delete(f.face);URL.revokeObjectURL(f.url)}fonts.clear()}};
})(window);
