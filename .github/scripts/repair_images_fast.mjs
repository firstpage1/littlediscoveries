import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const site = process.argv[2] || "site";
const mode = process.argv[3] || "priority";
const jsonFile = path.join(site, "activities.json");
const activities = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
const imageDir = path.join(site, "images", "organiser");
fs.mkdirSync(imageDir, {recursive:true});
const stock = v => /pexels\.com|unsplash\.com|pixabay\.com/i.test(v||"");
const unverified = a => stock(a.imageUrl) || !a.imageUrl ||
  /illustrativ|substitut|stock image|not this event|not the event|not this session|not necessarily|not this match|earlier .*event|earlier .*festival/i.test(a.imageCredit||"");
const ordered = activities.filter(a => a.seoSlug && /^[a-z0-9-]+$/.test(a.seoSlug) && (a.source || a.website) && unverified(a))
  .filter(a => mode === "priority" ? Boolean(a.editorialPriority) : !a.editorialPriority);
ordered.sort((a,b) => Number(b.seoSlug === "moore-park-south-family-fun-day-oct-2026") -
  Number(a.seoSlug === "moore-park-south-family-fun-day-oct-2026") || (a.editorialPriority||99)-(b.editorialPriority||99));

console.log("MODE",mode,"TO REVIEW",ordered.length);
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({ignoreHTTPSErrors:true,
  userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  viewport:{width:1440,height:960}});
const extensions={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
const special={
  "moore-park-south-family-fun-day-oct-2026":[
    "https://events.humanitix.com/moore-park-south-family-fun-day",
    "https://www.greatersydneyparklands.nsw.gov.au/whats-on/moore-park-south-family-fun-day",
    "https://whatson.cityofsydney.nsw.gov.au/events/moore-park-south-family-fun-day"
  ]
};
const words=(s)=>[...new Set(((s||"").toLowerCase().match(/[a-z0-9]+/g)||[]))]
  .filter(w=>w.length>3 && !["family","free","event","school","october","2026","sydney","kids","their","with","open"].includes(w));
async function extract(page, activity, url) {
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:14500});
  await page.waitForTimeout(550);
  return page.evaluate((titleWords)=>{
    const mainText=(document.querySelector("h1")?.textContent||document.title||"").toLowerCase();
    const mentions=titleWords.filter(w=>mainText.includes(w)).length;
    // Reject an unrelated homepage and generic site-level artwork.
    if (titleWords.length && mentions < Math.min(2,titleWords.length)) return [];
    const a=[]; const seen=new Set();
    const add=(v,score,kind,alt="")=>{
      if(!v)return;
      let url;try{url=new URL(v,location.href).href;}catch{return;}
      if (!/^https?:/.test(url) || /logo|favicon|sprite|avatar|\.svg(?:\?|$)|site-icon|brandmark|default-hero|placeholder/i.test(url+" "+alt)) return;
      if(seen.has(url))return; seen.add(url); a.push({url,score,kind});
    };
    for(const [selector,score] of [
      ['meta[property="og:image:secure_url"]',120],
      ['meta[property="og:image"]',115],
      ['meta[name="twitter:image"]',108],
      ['meta[name="twitter:image:src"]',107]
    ]){let node=document.querySelector(selector); if(node?.content)add(node.content,score,"meta");}
    // Many event websites use a CSS hero instead of an img element.
    for(const e of [...document.querySelectorAll("img")]){
      const rect=e.getBoundingClientRect(), w=e.naturalWidth||rect.width, h=e.naturalHeight||rect.height;
      if(w<270||h<160)continue;
      const around=(e.parentElement?.parentElement?.textContent||"").slice(0,350);
      const overlap=titleWords.filter(k=>((e.alt||"")+" "+(e.currentSrc||"")+" "+around).toLowerCase().includes(k)).length;
      const score=55+Math.min(27,rect.width*rect.height/10000)+(e.closest("main,article")?18:0)+(overlap*7);
      add(e.currentSrc||e.src||e.dataset.src,score,"img",e.alt||"");
    }
    for(const e of [...document.querySelectorAll("main,article,[class*=hero],[class*=banner],[class*=event-image]")]){
      const rect=e.getBoundingClientRect();if(rect.width<300||rect.height<170)continue;
      const m=getComputedStyle(e).backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if(m)add(m[1],90,"background");
    }
    return a.sort((x,y)=>y.score-x.score).slice(0,5);
  },words(activity.title));
}
let idx=0,updated=0,failed=0;
async function worker() {
 const page=await context.newPage();
 while(idx<ordered.length){
  const a=ordered[idx++];
  const possible=special[a.seoSlug]||[a.source||a.website];
  let winner=null;
  for(const source of possible){
   try{
    const choices=await extract(page,a,source);
    for(const item of choices){
     try{
      const res=await context.request.get(item.url,{timeout:6500,headers:{referer:source}});
      if(!res.ok())continue;
      const mime=(res.headers()["content-type"]||"").split(";")[0].trim().toLowerCase();
      const ext=extensions[mime];
      if(!ext)continue;
      const bytes=await res.body();
      if(bytes.length<4500||bytes.length>6000000)continue;
      winner={ext,bytes,source,item}; break;
     }catch(_err){}
    }
    if(winner)break;
   }catch(e){console.log("SOURCE UNAVAILABLE",a.seoSlug,source,String(e).slice(0,120));}
  }
  if(!winner){failed++;console.log("NOT VERIFIED",a.seoSlug);continue;}
  const detail=path.join(site,a.seoSlug,"index.html");
  if(!fs.existsSync(detail)){failed++;console.log("NO DETAIL",a.seoSlug);continue;}
  let html=fs.readFileSync(detail,"utf8");
  const newURL="/images/organiser/"+a.seoSlug+"."+winner.ext;
  let matched=false;
  if(/<div class="pic"[^>]*>[\s\S]*?<img[^>]*src="[^"]+"/.test(html)){
   html=html.replace(/(<div class="pic"[^>]*>[\s\S]*?<img[^>]*src=")[^"]+(")/,
     (_all,start,end)=>{matched=true;return start+newURL+end;});
  }else if(/<div class="activity-hero"[^>]*>[\s\S]*?<img[^>]*src="[^"]+"/.test(html)){
   html=html.replace(/(<div class="activity-hero"[^>]*>[\s\S]*?<img[^>]*src=")[^"]+(")/,
     (_all,start,end)=>{matched=true;return start+newURL+end;});
  }
  if(!matched){failed++;console.log("NO HERO IMG",a.seoSlug);continue;}
  html=html.replace(/(<div class="image-credit">)[\s\S]*?(?=<a\s)/,
    "$1Event image supplied by the organiser. ");
  html=html.replace(/(<meta\s+property="og:image"\s+content=")[^"]+(")/,
     (_all,start,end)=>start+"https://www.littlediscoveries.com.au"+newURL+end);
  fs.writeFileSync(path.join(imageDir,a.seoSlug+"."+winner.ext),winner.bytes);
  fs.writeFileSync(detail,html,"utf8");
  a.imageUrl=newURL;
  a.imageVerifiedFromSource=true;
  a.imageSourceUrl=winner.source;
  a.imageCredit="Image sourced from the event organiser";
  updated++;
  console.log("UPDATED",a.seoSlug,winner.item.kind,winner.item.url,"=>",newURL,winner.bytes.length);
 }
 await page.close();
}
await Promise.all(Array.from({length:6},()=>worker()));
await browser.close();
if(updated){
 fs.writeFileSync(jsonFile,JSON.stringify(activities,null,2)+"\n");
 let html=fs.readFileSync(path.join(site,"index.html"),"utf8");
 let js=fs.readFileSync(path.join(site,"script.js"),"utf8");
 const version="organiser-images-20261016-"+mode;
 html=html.replace(/script\.js\?v=[^"]+/, "script.js?v="+version);
 js=js.replace(/activities\.json\?v=[^']+/, "activities.json?v="+version);
 fs.writeFileSync(path.join(site,"index.html"),html);
 fs.writeFileSync(path.join(site,"script.js"),js);
}
console.log("SUMMARY",JSON.stringify({mode,checked:ordered.length,updated,unverified:failed}));
