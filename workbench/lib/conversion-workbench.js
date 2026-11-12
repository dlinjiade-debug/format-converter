/* Shared desktop/web workbench. All document bytes remain on this device. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),MAX_FILE=512*1024*1024;
 const settings={quality:'auto',searchable:true};
 let inputGeneration=0,previewGeneration=0,preview=null,nativeSettings=null,referenceFile=null,currentInput=null;
 const browserDirectories={},previewUrls=[];
 const inspections=new WeakMap();
 const suffix=name=>name.split('.').pop().toLowerCase();
 const message=(parent,text,tag='p')=>{const node=document.createElement(tag);node.textContent=text;parent.appendChild(node);return node};
 const check=signal=>{if(signal?.aborted)throw new DOMException('操作已取消','AbortError')};
 function captureScale(width,height,options={}){
  const quality=options.quality||settings.quality,mobile=options.mobile??innerWidth<768;
  const budget=mobile?5000000:(navigator.deviceMemory&&navigator.deviceMemory<=4?8000000:16000000);
  const desired=quality==='small'?1:quality==='clear'?2.5:2;
  return Math.min(desired,Math.sqrt(budget/(width*height)),8192/width,8192/height);
 }
 async function inspectFile(file,{signal}={}){
  check(signal);
  if(!file.size)throw new Error('文件为空');if(file.size>MAX_FILE)throw new Error('文件超过 512 MB，请先拆分后处理');
  const type=suffix(file.name),warnings=[],fonts=new Set();
  const report={name:file.name,size:file.size,type,pageCount:null,pageCountEstimated:false,fonts:[],missingFonts:[],mediaCount:0,warnings};
  if(type==='pptx'||type==='docx'){
   await root.ensure('JSZip');const zip=await root.JSZip.loadAsync(file),names=Object.keys(zip.files);
   if(names.length>20000)throw new Error('压缩包条目过多，无法安全检查');
   const total=names.reduce((sum,name)=>sum+(zip.files[name]._data?.uncompressedSize||0),0);
   if(total>1536*1024*1024)throw new Error('文档解压体积过大，请拆分后处理');
   report.mediaCount=names.filter(n=>/\/(?:media|embeddings)\//.test(n)&&!zip.files[n].dir).length;
   let scanned=0,breaks=0;
   const xmlNames=names.filter(n=>/^(?:ppt|word|docProps)\//.test(n)&&/\.xml$/i.test(n));
   for(const name of xmlNames){
    check(signal);const size=zip.files[name]._data?.uncompressedSize||0;
    if(size>8*1024*1024||scanned+size>24*1024*1024){if(!warnings.includes('部分元数据过大，预检已跳过；请特别核对导出预览。'))warnings.push('部分元数据过大，预检已跳过；请特别核对导出预览。');continue}
    const xml=await zip.files[name].async('string');scanned+=xml.length;
    for(const match of xml.matchAll(/(?:typeface|w:ascii|w:hAnsi|w:eastAsia)="([^"&]+)"/g))if(match[1]&&!/^[+]/.test(match[1]))fonts.add(match[1]);
    if(name==='ppt/presentation.xml')report.pageCount=(xml.match(/<p:sldId\b/g)||[]).length;
    if(name==='word/document.xml')breaks=(xml.match(/<w:br\b[^>]*w:type="page"/g)||[]).length;
    if(type==='docx'&&name==='docProps/app.xml'){const pages=xml.match(/<Pages>(\d+)<\/Pages>/);if(pages)report.pageCount=Number(pages[1])}
    if(/<(?:p|a|p14):(?:timing|transition|scene3d|sp3d|oleObj|videoFile|audioFile|media)\b/.test(xml)&&!warnings.includes('包含动画、视频、3D 或嵌入对象，PDF 使用静态效果；请核对预览。'))warnings.push('包含动画、视频、3D 或嵌入对象，PDF 使用静态效果；请核对预览。');
    if(scanned%262144<xml.length)await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(type==='docx'){report.pageCount??=breaks+1;report.pageCountEstimated=true}
   if(names.some(n=>/\.(?:emf|wmf)$/i.test(n)))warnings.push('含 EMF/WMF 图形，部分矢量效果可能降级。');
  }else if(type==='pdf'){
   const pdf=await root.openPdf(file);
   try{report.pageCount=pdf.numPages;let text=false;for(let n=1;n<=Math.min(pdf.numPages,3);n++){check(signal);const tc=await(await pdf.getPage(n)).getTextContent();if(tc.items.some(x=>x.str?.trim()))text=true}if(!text)warnings.push('前几页没有可提取文字，可能是图片型 PDF；不内置 OCR。')}
   finally{await pdf.destroy()}
  }
  report.fonts=[...fonts].sort();report.missingFonts=report.fonts.filter(name=>!root.LocalFontSupport.available(name));
  if(report.missingFonts.length)warnings.push('检测到可能缺失的字体，可加载本地 TTF；字体替换可能改变数字位置和换行。');
  if(file.size>64*1024*1024)warnings.push('大文件会逐页处理，建议使用自动画质；取消后不会保存旧任务结果。');
  check(signal);return report;
 }
 async function preflight(file,{signal}={}){
  check(signal);let pending=inspections.get(file);
  if(!pending){pending=inspectFile(file).catch(error=>{inspections.delete(file);throw error});inspections.set(file,pending)}
  let cancel;
  try{
   const source=await (signal?Promise.race([pending,new Promise((_,reject)=>{cancel=()=>reject(new DOMException('操作已取消','AbortError'));signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel()})]):pending);
   check(signal);const report={...source,warnings:source.warnings.filter(w=>!w.startsWith('检测到可能缺失的字体')),missingFonts:source.fonts.filter(name=>!root.LocalFontSupport.available(name))};
   if(report.missingFonts.length)report.warnings.push('检测到可能缺失的字体，可加载本地 TTF；字体替换可能改变数字位置和换行。');
   return report;
  }finally{if(cancel)signal.removeEventListener('abort',cancel)}
 }
 async function checkInput(file){
  currentInput=file;
  const token=++inputGeneration,box=$('preflight');if(!box)return;
  box.replaceChildren();message(box,'正在检查文件…');box.hidden=false;
  try{
   const r=await preflight(file);if(token!==inputGeneration)return;box.replaceChildren();
   message(box,`${r.type.toUpperCase()} · ${(r.size/1048576).toFixed(1)} MB${r.pageCount!==null?' · '+(r.pageCountEstimated?'预计 ':'')+r.pageCount+' 页':''}${r.mediaCount?' · '+r.mediaCount+' 个媒体/嵌入对象':''}`,'strong');
   if(r.missingFonts.length)message(box,'可能缺失：'+r.missingFonts.slice(0,10).join('、')+(r.missingFonts.length>10?' 等':''));
   for(const warning of r.warnings)message(box,warning);
  }catch(error){if(token===inputGeneration){box.replaceChildren();message(box,error.message)}}
 }
 function disposePreview(){
  previewGeneration++;
  if(preview){preview.task?.cancel();preview.doc?.destroy().catch(()=>{});preview.reference?.destroy().catch(()=>{});for(const c of preview.host.querySelectorAll('canvas'))c.width=c.height=0;preview=null}
  for(const url of previewUrls.splice(0))URL.revokeObjectURL(url);
 }
 async function attachPreview(blob,name,host){
  disposePreview();const token=previewGeneration;
  if(suffix(name)==='pdf'||blob.type==='application/pdf'){
   const panel=document.createElement('section');panel.className='wb-preview';host.appendChild(panel);
   const controls=document.createElement('div');controls.className='wb-preview-controls';panel.appendChild(controls);
   const previous=message(controls,'上一页','button'),label=message(controls,'加载预览…','span'),next=message(controls,'下一页','button');
   previous.id='previewPrevious';next.id='previewNext';label.id='previewPage';
   const jump=document.createElement('input');jump.type='number';jump.min='1';jump.value='1';jump.setAttribute('aria-label','预览页码');controls.appendChild(jump);
   const status=message(panel,'正在读取导出文件…');status.id='previewStatus';
   const viewport=document.createElement('div');viewport.className='wb-page';panel.appendChild(viewport);
   const state={doc:null,reference:null,task:null,host:panel,page:1,renderId:0};preview=state;
   try{
    const doc=await root.openPdf(blob);if(token!==previewGeneration){await doc.destroy();return}
    state.doc=doc;jump.max=String(doc.numPages);
    async function render(number){
     number=Math.max(1,Math.min(doc.numPages,number));state.page=number;const id=++state.renderId;state.task?.cancel();
     label.textContent=`${number} / ${doc.numPages}`;jump.value=String(number);previous.disabled=number===1;next.disabled=number===doc.numPages;
     const page=await doc.getPage(number);if(token!==previewGeneration||id!==state.renderId)return;
     const original=page.getViewport({scale:1}),scale=Math.min(1.4,Math.max(240,Math.min(1000,viewport.clientWidth||640))/original.width),vp=page.getViewport({scale});
     const canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
     const old=viewport.querySelector('canvas');if(old)old.width=old.height=0;viewport.replaceChildren(canvas);
     const task=page.render({canvasContext:canvas.getContext('2d'),viewport:vp});state.task=task;
     try{await task.promise}catch(error){if(error.name==='RenderingCancelledException')return;throw error}
     if(token!==previewGeneration||id!==state.renderId)return;
     const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0;
     for(let p=0;p<pixels.length;p+=4)if(pixels[p]<245||pixels[p+1]<245||pixels[p+2]<245)ink++;
     const text=await page.getTextContent();if(token!==previewGeneration||id!==state.renderId)return;
     status.textContent=ink<canvas.width*canvas.height*.00015?'这一页疑似空白，请核对原稿。':text.items.some(x=>x.str?.trim())?'可搜索文字已检测到，请核对图形与数字位置。':'本页没有可搜索文字，请核对页面图像。';
    }
    const run=n=>render(n).catch(error=>{if(token===previewGeneration)status.textContent='预览失败：'+error.message});
    previous.addEventListener('click',()=>run(state.page-1));next.addEventListener('click',()=>run(state.page+1));jump.addEventListener('change',()=>run(Number(jump.value)||1));
    await render(1);
    const compare=message(panel,'与参考 PDF 对比','button');compare.className='rst';compare.addEventListener('click',()=>compareReference(state,blob,status,compare));
   }catch(error){if(token===previewGeneration)status.textContent='预览失败：'+error.message}
  }else if(/^image\//.test(blob.type)){
   const url=URL.createObjectURL(blob);previewUrls.push(url);const image=document.createElement('img');image.src=url;image.alt='转换结果预览';image.className='wb-image';host.appendChild(image);
  }else if(suffix(name)==='docx'){
   const button=message(host,'预览 Word','button');button.className='rst';
   button.addEventListener('click',async()=>{
    button.disabled=true;const frame=document.createElement('iframe');frame.className='wb-word';frame.title='Word 结果预览';frame.sandbox='allow-same-origin';host.appendChild(frame);
    try{await root.ensure('JSZip');await root.ensure('docxPreview');if(token!==previewGeneration)return;const target=frame.contentDocument;await root.docxPreview.renderAsync(await blob.arrayBuffer(),target.body,target.head,{useBase64URL:true,renderAltChunks:false});await root.LocalFontSupport.apply(target.body)}
    catch(error){button.textContent='预览失败：'+error.message}
   },{once:true});
  }
 }
 async function compareReference(state,blob,status,button){
  if(!referenceFile){status.textContent='请先在设置中选择从 Office/WPS 导出的参考 PDF。';return}
  button.disabled=true;let reference;
  try{
   await root.ensure('VisualMetrics');reference=await root.openPdf(referenceFile);state.reference=reference;
   const report={reference:referenceFile.name,pages:[],pageCountMatches:reference.numPages===state.doc.numPages};
   for(let n=1;n<=Math.min(reference.numPages,state.doc.numPages);n++){
    if(preview!==state)throw new DOMException('对比已取消','AbortError');status.textContent=`正在对比 ${n}/${state.doc.numPages} 页…`;
    const images=[];
    try{
     for(const doc of [state.doc,reference]){const page=await doc.getPage(n),vp=page.getViewport({scale:1}),c=document.createElement('canvas');c.width=640;c.height=Math.ceil(640*vp.height/vp.width);await page.render({canvasContext:c.getContext('2d'),viewport:page.getViewport({scale:640/vp.width})}).promise;images.push(c)}
     const sameSize=images[0].height===images[1].height;
     const metrics=sameSize?root.VisualMetrics.compareRGBA(...images.map(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data),640,images[0].height):{ssim:0,foregroundIoU:0,mae:1};
     report.pages.push({page:n,...metrics,passed:sameSize&&metrics.ssim>=.93&&metrics.foregroundIoU>=.8});
    }finally{images.forEach(c=>c.width=c.height=0)}
   }
   if(preview!==state)return;
   const passed=report.pages.filter(p=>p.passed).length;status.textContent=`逐页对比 ${passed}/${state.doc.numPages} 页达到阈值${report.pageCountMatches?'':'，页数不一致'}。指标供定位差异，仍需人工核对内容。`;
   const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));previewUrls.push(url);const a=message(state.host,'下载本次对比报告','a');a.href=url;a.download='conversion-comparison.json';a.className='rst';
  }catch(error){if(preview===state)status.textContent='参考对比失败：'+error.message}
  finally{if(reference)await reference.destroy().catch(()=>{});state.reference=null;button.disabled=false}
 }
 async function save(blob,name){
  if(root.desktopBridge){const result=await root.desktopBridge.saveResult({name,bytes:new Uint8Array(await blob.arrayBuffer())});return result.cancelled?'已取消保存':'已保存到：'+result.path}
  if(browserDirectories.output){const permission=await browserDirectories.output.requestPermission({mode:'readwrite'});if(permission!=='granted')throw new Error('未获得输出目录写入权限');let output=name;for(let i=1;i<10000;i++){try{await browserDirectories.output.getFileHandle(output);const dot=name.lastIndexOf('.');output=(dot<0?name:name.slice(0,dot))+' ('+i+')'+(dot<0?'':name.slice(dot))}catch(error){if(error.name==='NotFoundError')break;throw error}}const handle=await browserDirectories.output.getFileHandle(output,{create:true}),writer=await handle.createWritable();await writer.write(blob);await writer.close();return '已保存到所选输出目录：'+output}
  return null;
 }
 async function listDirectory(kind){
  const list=$('directoryFiles');list.replaceChildren();
  const files=root.desktopBridge?await root.desktopBridge.listFiles(kind):await(async()=>{const found=[];for await(const [name,handle] of browserDirectories[kind].entries()){if(handle.kind==='file'&&(kind!=='reference'||/\.pdf$/i.test(name)))found.push({name,handle});if(found.length>=500)break}return found})();
  for(const entry of files){const b=message(list,entry.name,'button');b.className='wb-file';b.addEventListener('click',async()=>{try{const file=root.desktopBridge?await(async()=>{const r=await root.desktopBridge.readFile(entry.id);return new File([r.bytes],r.name)})():await entry.handle.getFile();if(kind==='reference'){referenceFile=file;$('referenceName').textContent='参考：'+file.name}else root.handle(file)}catch(error){$('pathStatus').textContent=error.message}})}
  if(!files.length)message(list,'目录中没有可选择的文件。');
 }
 async function chooseDirectory(kind){
  try{
   if(root.desktopBridge){nativeSettings=await root.desktopBridge.chooseDirectory(kind);$('path-'+kind).textContent=nativeSettings.paths[kind]||'未设置'}
   else{if(!root.showDirectoryPicker){$('pathStatus').textContent='此浏览器不支持目录授权；可正常选择文件并下载结果。桌面软件可设置完整路径。';return}browserDirectories[kind]=await root.showDirectoryPicker({mode:kind==='output'?'readwrite':'read',id:'converter-'+kind});$('path-'+kind).textContent=browserDirectories[kind].name+'（浏览器授权目录）'}
   if(kind!=='output')await listDirectory(kind);
  }catch(error){if(error.name!=='AbortError')$('pathStatus').textContent=error.message}
 }
 function init(){
  const panel=document.createElement('details');panel.className='wb-settings';panel.id='workbenchSettings';
  panel.innerHTML='<summary>输出、字体与路径设置</summary><div class="wb-settings-body"><p id="appEdition"></p><label>输出画质 <select id="captureQuality"><option value="auto">自动（推荐）</option><option value="clear">清晰优先</option><option value="small">体积优先</option></select></label><label class="wb-check"><input type="checkbox" id="searchablePdf" checked> 为 PDF 添加可搜索文字层（不进行 OCR）</label><label>本地字体名称 <input id="localFontFamily" placeholder="例如：等线"></label><label>加载本地 TTF 字体 <input type="file" id="localFontFile" accept=".ttf"></label><p id="fontStatus">字体仅在本次会话使用；中文搜索需要包含对应字形的 TTF。</p><button id="clearLocalFonts" type="button">清除本次字体</button><div id="directorySettings"></div><p id="pathStatus"></p><div id="directoryFiles"></div><label>选择 Office/WPS 导出的参考 PDF <input type="file" id="referencePdf" accept=".pdf"></label><p id="referenceName">尚未选择参考 PDF</p></div>';
  $('go').before(panel);const pre=document.createElement('section');pre.id='preflight';pre.className='wb-preflight';pre.hidden=true;pre.setAttribute('role','status');$('fs').before(pre);
  const style=document.createElement('style');style.textContent='.wb-settings{margin:16px 0;color:var(--text2);font-size:13px;border:1px solid var(--border);border-radius:12px;padding:12px}.wb-settings summary{cursor:pointer;color:var(--text)}.wb-settings-body{display:grid;gap:12px;padding-top:12px}.wb-settings label{display:block}.wb-settings input:not([type=checkbox]),.wb-settings select{max-width:100%;margin:5px 0;padding:7px;background:#181520;color:var(--text);border:1px solid var(--border);border-radius:6px}.wb-check{display:flex!important;gap:8px}.wb-settings button,.wb-preview button{background:#211833;color:var(--text);padding:7px 11px;border:1px solid var(--border);border-radius:7px;cursor:pointer}.wb-settings button:disabled,.wb-preview button:disabled{opacity:.4}.wb-path{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}.wb-path span{overflow-wrap:anywhere;flex:1;min-width:100px}.wb-file{display:block;margin:5px 0;max-width:100%;overflow-wrap:anywhere;text-align:left}.wb-preflight{padding:12px;background:rgba(139,92,246,.06);border-radius:10px;margin:12px 0;font-size:12px;line-height:1.8;color:var(--text2)}.wb-preview{margin-top:20px;padding-top:14px;border-top:1px solid var(--border);max-width:100%}.wb-preview-controls{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:9px}.wb-preview-controls input{width:60px;padding:7px}.wb-preview p{font-size:12px;margin:12px 0;color:var(--text2)}.wb-page{background:#d1d5db;padding:8px;overflow:auto;max-height:75vh}.wb-page canvas{display:block;max-width:100%;height:auto;margin:auto}.wb-image{max-width:100%;max-height:70vh;margin-top:16px}.wb-word{width:100%;height:65vh;background:white;border:0;margin-top:12px}';document.head.appendChild(style);
  $('appEdition').textContent=root.desktopBridge?'Windows 桌面版 · 文件在本机处理':'公开网页版 · 文件在你的设备上处理，浏览器目录权限由你授权';
  if(!root.desktopBridge){const download=message($('appEdition'),'下载 Windows 便携软件','a');download.href='https://github.com/dlinjiade-debug/format-converter/releases/download/v1.1.0/FormatConverter-1.1.0-windows-x64.exe';download.style.cssText='display:block;color:var(--violet2);margin-top:8px';download.rel='noopener';}
  for(const [kind,label] of [['input','输入目录'],['output','输出目录'],['reference','参考 PDF 目录']]){const row=document.createElement('div');row.className='wb-path';const button=message(row,'设置'+label,'button');button.id='choose-'+kind;button.addEventListener('click',()=>chooseDirectory(kind));const path=message(row,'未设置','span');path.id='path-'+kind;if(kind!=='output'){const refresh=message(row,'列出文件','button');refresh.addEventListener('click',()=>listDirectory(kind).catch(e=>$('pathStatus').textContent=e.message))}$('directorySettings').appendChild(row)}
  if(root.desktopBridge)root.desktopBridge.getSettings().then(value=>{nativeSettings=value;for(const kind of ['input','output','reference'])$('path-'+kind).textContent=value.paths[kind]||'未设置'}).catch(e=>$('pathStatus').textContent=e.message);
  $('captureQuality').addEventListener('change',()=>settings.quality=$('captureQuality').value);$('searchablePdf').addEventListener('change',()=>settings.searchable=$('searchablePdf').checked);
  $('localFontFile').addEventListener('change',async()=>{try{const file=$('localFontFile').files[0];if(!file)return;const value=await root.LocalFontSupport.load(file,$('localFontFamily').value||undefined);$('fontStatus').textContent='已加载：'+value.family;if(currentInput)checkInput(currentInput)}catch(e){$('fontStatus').textContent=e.message}});
  $('clearLocalFonts').addEventListener('click',()=>{root.LocalFontSupport.clear();$('fontStatus').textContent='本次加载的字体已清除';$('localFontFile').value=''});
  $('referencePdf').addEventListener('change',()=>{referenceFile=$('referencePdf').files[0]||null;$('referenceName').textContent=referenceFile?'参考：'+referenceFile.name:'尚未选择参考 PDF'});
 }
 function lock(locked){const panel=$('workbenchSettings');if(panel)for(const el of panel.querySelectorAll('input,button,select'))el.disabled=locked}
 root.ConversionWorkbench={settings,captureScale,preflight,checkInput,disposePreview,attachPreview,save,lock,hasOutputDirectory:()=>!!browserDirectories.output,loadFont:(...args)=>root.LocalFontSupport.load(...args),clear(){inputGeneration++;currentInput=null;disposePreview();if($('preflight'))$('preflight').hidden=true},init};
 document.addEventListener('DOMContentLoaded',init,{once:true});
})(window);
