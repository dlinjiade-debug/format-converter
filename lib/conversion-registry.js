/* First-party engine registry: UI capabilities and dispatch share one source. */
(function(root){
 const entries=[],routes={};
 const names={docx:'Word 文档',pdf:'PDF',html:'HTML 网页',txt:'纯文本',png:'PNG 图片',jpg:'JPG',webp:'WebP',bmp:'BMP',ico:'ICO',xlsx:'Excel',csv:'CSV',md:'Markdown',gif:'GIF 动图',mp4:'MP4(H.264)',webm:'WebM',mp3:'MP3',wav:'WAV',ogg:'OGG'};
 const call=(name,...args)=>{if(typeof root[name]!=='function')throw new Error(name+' 转换引擎不可用');return root[name](...args)};
 function add(sources,targets,convert){for(const source of sources.split(' '))for(const target of targets.split(' ')){const entry={source,target,convert:(file,options)=>convert(file,target,options)};entries.push(entry);const multi=['pdf','pptx'].includes(source)&&['png','jpg'].includes(target);(routes[source]??=[]).push({f:target,n:(names[target]||target.toUpperCase())+(multi?'（多页 ZIP）':'')})}}
 add('pdf','docx html txt png jpg',(f,t,o)=>{
  if(t==='docx')return call(o.pdfMode==='layout'?'pdf2docxLayout':'pdf2docx',f);
  if(t==='html')return call(o.pdfMode==='layout'?'pdf2htmlLayout':'pdf2html',f);
  return t==='txt'?call('pdf2txt',f):call('pdf2img',f,t);
 });
 add('docx doc','pdf html txt',(f,t,o)=>{if(f.name.toLowerCase().endsWith('.doc'))throw new Error('旧版 .doc 请先用 Word/WPS 另存为 .docx 后转换。');return t==='pdf'?call('word2pdfResult',f,o.wordMode!=='text'):call('word2'+t,f)});
 add('pptx','pdf png',(f,t,o)=>t==='pdf'?call('ppt2pdfResult',f,{allowFallback:o.allowFallback}):call('ppt2png',f));
 add('md','html pdf docx',(f,t)=>call('md2'+t,f));
 add('html','pdf txt md docx',(f,t)=>call(t==='pdf'?'html2pdf_':'html2'+t,f));
 add('htm','pdf txt',(f,t)=>call(t==='pdf'?'html2pdf_':'html2txt',f));
 add('txt','pdf docx',(f,t)=>call('txt2'+t,f));
 for(const source of ['png','jpg','jpeg','webp','bmp','gif']){
  const targets={png:'jpg webp bmp ico pdf',jpg:'png webp bmp ico pdf',jpeg:'png webp bmp ico pdf',webp:'png jpg bmp pdf',bmp:'png jpg webp pdf',gif:'png jpg webp pdf'}[source];
  add(source,targets,(f,t)=>t==='pdf'?call('img2pdf',f):call('img2img',f,t));
 }
 add('svg','png jpg pdf',(f,t)=>call('svg2img',f,t));
 add('heic heif','jpg png webp',(f,t)=>call('heic2img',f,t==='jpg'?'jpeg':t));
 add('xlsx','csv html',(f,t)=>call('xls2'+t,f));add('xls','csv xlsx',(f,t)=>t==='csv'?call('xls2csv',f):call('xls2xls',f,'xlsx'));
 add('csv','xlsx txt html',(f,t)=>call(t==='xlsx'?'csv2xls':'csv2'+t,f));
 add('mp4','gif webm',(f,t)=>call(t==='gif'?'vid2gif':'vid2webm',f));
 add('webm','gif mp4',(f,t)=>call(t==='gif'?'vid2gif':'vid2mp4',f));
 add('mov avi mkv wmv flv','mp4 gif webm',(f,t)=>call({mp4:'vid2mp4',gif:'vid2gif',webm:'vid2webm'}[t],f));
 add('mp3','wav ogg',(f,t)=>call('audConvert',f,t));add('wav','mp3 ogg',(f,t)=>call('audConvert',f,t));add('ogg aac flac','mp3 wav',(f,t)=>call('audConvert',f,t));
 root.ConversionRegistry={entries,routes,async convert(file,target,options={}){
  if(options.signal?.aborted)throw new DOMException('转换已取消','AbortError');
  const source=file.name.split('.').pop().toLowerCase(),entry=entries.find(x=>x.source===source&&x.target===target);
  if(!entry)throw new Error('不支持此转换：'+source+' → '+target);
  const result=await entry.convert(file,options),blob=result?.blob||result;
  if(options.signal?.aborted)throw new DOMException('转换已取消','AbortError');
  if(!(blob instanceof Blob)||!blob.size)throw new Error('转换引擎没有生成有效文件');
  return {blob,warnings:result?.warnings||root.lastConversionWarnings||[],extension:blob._ext||target};
 }};
})(window);
