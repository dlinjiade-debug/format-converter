import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import { repoPath } from './paths.mjs';
const JSZip = createRequire(import.meta.url)(repoPath('lib','jszip.min.js'));
export const fixtureDir = join(tmpdir(),'format-converter-fixtures-v2');
const P='http://schemas.openxmlformats.org/presentationml/2006/main',A='http://schemas.openxmlformats.org/drawingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0)}return(c^0xffffffff)>>>0}
function chunk(type,data){const t=Buffer.from(type),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);t.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([t,data])),b.length-4);return b}
function png(rgb){const h=Buffer.alloc(13);h.writeUInt32BE(4);h.writeUInt32BE(4,4);h[8]=8;h[9]=6;const p=Buffer.alloc(68);for(let y=0;y<4;y++)for(let x=0;x<4;x++)p.set([...rgb,255],y*17+1+x*4);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(p)),chunk('IEND',Buffer.alloc(0))])}
const rels=body=>`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`;
const rel=(id,type,target)=>`<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`;
const slide=body=>`<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${body}</p:spTree></p:cSld></p:sld>`;
const xf=(x,y,w,h)=>`<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>`;
function textShape(text,gradient){const fill=gradient?'<a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="FFD966"/></a:gs><a:gs pos="100000"><a:srgbClr val="9C0006"/></a:gs></a:gsLst><a:lin ang="0" scaled="1"/></a:gradFill>':'<a:solidFill><a:srgbClr val="172554"/></a:solidFill>';return `<p:sp><p:nvSpPr><p:cNvPr id="2" name="title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${xf(800000,800000,8000000,1100000)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr sz="3200">${fill}</a:rPr><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`}
export async function buildFixture({pages=1,ratio='16x9',kind='text'}={}){
 const cx=ratio==='4x3'?9144000:12192000,cy=6858000,zip=new JSZip();let ids='',pr=rel('master','slideMaster','slideMasters/slideMaster1.xml'),types='';
 zip.file('_rels/.rels',rels(rel('pres','officeDocument','ppt/presentation.xml')));
 for(let i=1;i<=pages;i++){
  ids+=`<p:sldId id="${255+i}" r:id="s${i}"/>`;pr+=rel('s'+i,'slide',`slides/slide${i}.xml`);types+=`<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
  let shapes=kind==='image'?'':textShape(`StressTest Line ${i} 2019`,kind==='visual'),sr=rel('layout','slideLayout','../slideLayouts/slideLayout1.xml');
  if(kind==='image'||kind==='mixed'){
   zip.file(`ppt/media/image${i}.png`,png([[230,60,90],[50,180,110],[60,110,220]][(i-1)%3]));sr+=rel('image','image',`../media/image${i}.png`);
   shapes+=`<p:pic><p:nvPicPr><p:cNvPr id="3" name="picture"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="image"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xf(0,kind==='mixed'?3000000:0,kind==='mixed'?Math.round(cx/3):cx,kind==='mixed'?Math.round(cy/3):cy)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
  }
  if(kind==='visual')shapes+=`<p:sp><p:nvSpPr><p:cNvPr id="4" name="green ellipse"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xf(1905000,2857500,2857500,1905000)}<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="22C55E"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
  zip.file(`ppt/slides/slide${i}.xml`,slide(shapes));zip.file(`ppt/slides/_rels/slide${i}.xml.rels`,rels(sr));
 }
 zip.file('ppt/presentation.xml',`<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="master"/></p:sldMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="${cx}" cy="${cy}"/></p:presentation>`);zip.file('ppt/_rels/presentation.xml.rels',rels(pr));
 zip.file('ppt/slideMasters/slideMaster1.xml',slide(''));zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels',rels(rel('theme','theme','../theme/theme1.xml')));
 zip.file('ppt/slideLayouts/slideLayout1.xml',slide(''));zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels',rels(rel('master','slideMaster','../slideMasters/slideMaster1.xml')));zip.file('ppt/theme/theme1.xml',`<a:theme xmlns:a="${A}" name="Test"/>`);
 zip.file('[Content_Types].xml',`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${types}</Types>`);
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
export async function ensureFixtures(){mkdirSync(fixtureDir,{recursive:true});for(const [name,pages,ratio,kind] of [['stress-text-25-16x9.pptx',25,'16x9','text'],['stress-image-25-4x3.pptx',25,'4x3','image'],['stress-mixed-40-16x9.pptx',40,'16x9','mixed']]){const path=join(fixtureDir,name);if(!existsSync(path))writeFileSync(path,await buildFixture({pages,ratio,kind}))}return fixtureDir}
