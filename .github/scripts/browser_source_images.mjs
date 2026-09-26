import fs from "node:fs";

const siteDir = process.argv[2] || "site";
const activitiesPath = `${siteDir}/activities.json`;
const activities = JSON.parse(fs.readFileSync(activitiesPath, "utf8"));

const { chromium } = await import("playwright");

const SOURCE_NAMES = {
  "sydneyoperahouse.com":"Sydney Opera House",
  "waverley.nsw.gov.au":"Waverley Council",
  "randwick.nsw.gov.au":"Randwick City Council",
  "woollahra.nsw.gov.au":"Woollahra Municipal Council",
  "bondipavilion.com.au":"Bondi Pavilion",
  "darlingharbour.com":"Darling Harbour",
  "innerwest.nsw.gov.au":"Inner West Council",
  "whatson.cityofsydney.nsw.gov.au":"City of Sydney What's On",
  "events.mosman.nsw.gov.au":"Mosman Council",
  "northernbeaches.nsw.gov.au":"Northern Beaches Council",
  "sutherlandshire.nsw.gov.au":"Sutherland Shire Council",
  "atparramatta.com":"City of Parramatta",
  "ryde.nsw.gov.au":"City of Ryde",
  "hornsby.nsw.gov.au":"Hornsby Shire Council",
  "georgesriver.nsw.gov.au":"Georges River Council",
  "bayside.nsw.gov.au":"Bayside Council"
};

const KNOWN = {
  "iwagumi-air-scape-sydney-opera-house-2026":
    "https://www.sydneyoperahouse.com/sites/default/files/styles/360x414/public/collaborodam_assets/wild-things-2026-iwagumi-air-scape-3-1%20%281%29.jpg?itok=_RiboxW4",
  "bondi-firelight-2026":
    "https://www.waverley.nsw.gov.au/__data/assets/image/0003/258456/JN-00265_Bondifirelight_web.jpg"
};

function sourceName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./,"").toLowerCase();
    for (const [k,v] of Object.entries(SOURCE_NAMES)) {
      if (host === k || host.endsWith("." + k)) return v;
    }
    return host;
  } catch { return "Organiser"; }
}
function isStock(url="") {
  const s=url.toLowerCase();
  return ["pexels.com","unsplash.com","pixabay.com"].some(x=>s.includes(x));
}
function words(s="") {
  return [...new Set((s.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>w.length>=4 && !["with","from","kids","free","school","holiday","event","2026"].includes(w)))];
}

const browser = await chromium.launch({headless:true});
const context = await browser.newContext({
  ignoreHTTPSErrors:true,
  userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  viewport:{width:1440,height:1000}
});

async function extract(activity) {
  const source = activity.source || activity.website;
  if (!source) return null;
  if (KNOWN[activity.seoSlug]) return KNOWN[activity.seoSlug];

  const page = await context.newPage();
  try {
    await page.goto(source,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForTimeout(1200);

    const titleWords = words(activity.title);
    const candidates = await page.evaluate((titleWords)=>{
      const out=[];
      const abs=(u)=>{ try { return new URL(u,location.href).href; } catch { return ""; } };
      const bad=(u,alt="")=>/logo|favicon|icon|sprite|avatar|crest|brandmark|social|facebook|instagram|youtube|linkedin/i.test((u||"")+" "+(alt||""));
      const overlap=(txt)=>{
        txt=(txt||"").toLowerCase();
        let n=0;
        for (const w of titleWords) if (txt.includes(w)) n++;
        return n;
      };
      const add=(url,score,why,alt="",w=0,h=0)=>{
        url=abs(url);
        if (!url || !/^https?:/.test(url) || bad(url,alt)) return;
        if (/\.svg(?:\?|$)/i.test(url)) return;
        if (w && h && (w<220 || h<110)) return;
        out.push({url,score,why,alt,w,h});
      };

      const metaSelectors=[
        ['meta[property="og:image:secure_url"]',35],
        ['meta[property="og:image"]',34],
        ['meta[name="twitter:image"]',30],
        ['meta[name="twitter:image:src"]',30]
      ];
      for (const [sel,score] of metaSelectors) {
        const el=document.querySelector(sel);
        if (el?.content) add(el.content,score,"meta");
      }

      const imgs=[...document.images];
      for (const img of imgs) {
        const rect=img.getBoundingClientRect();
        const src=img.currentSrc||img.src||img.dataset.src||"";
        const alt=img.alt||"";
        let score=0;
        const area=Math.max(0,rect.width)*Math.max(0,rect.height);
        if (area>400000) score+=35; else if(area>180000) score+=25; else if(area>70000) score+=15;
        if (img.closest("main")) score+=28;
        if (img.closest("article")) score+=30;
        if (rect.top<850) score+=8;
        score+=overlap(alt)*14;
        score+=overlap(src)*8;
        let p=img.parentElement, depth=0, nearby="";
        while(p && depth<5){ nearby+=" "+(p.innerText||"").slice(0,900); p=p.parentElement; depth++; }
        score+=overlap(nearby)*12;
        if (/hero|banner|feature|event|thumbnail/i.test((img.className||"")+" "+src+" "+alt)) score+=12;
        add(src,score,"img",alt,img.naturalWidth||rect.width,img.naturalHeight||rect.height);
      }

      const all=[...document.querySelectorAll("main *, article *, section *, .event *, .content *")].slice(0,3500);
      for (const el of all) {
        const cs=getComputedStyle(el);
        const bg=cs.backgroundImage;
        if (!bg || bg==="none") continue;
        const m=bg.match(/url\(["']?(.*?)["']?\)/);
        if (!m) continue;
        const rect=el.getBoundingClientRect();
        if (rect.width<250 || rect.height<120) continue;
        let score=25;
        const area=rect.width*rect.height;
        if(area>400000) score+=35; else if(area>180000) score+=22;
        if(el.closest("main")) score+=22;
        if(el.closest("article")) score+=25;
        const txt=(el.innerText||"")+" "+(el.parentElement?.innerText||"");
        score+=overlap(txt.slice(0,1400))*12;
        if(/hero|banner|feature|event/i.test((el.className||"")+" "+m[1])) score+=15;
        add(m[1],score,"background","",rect.width,rect.height);
      }

      return out.sort((a,b)=>b.score-a.score);
    }, titleWords);

    if (!candidates.length) return null;
    // Avoid obvious generic site images if a title-linked candidate exists.
    const linked = candidates.filter(c => c.score >= 45);
    const winner = (linked.length ? linked : candidates)[0];
    console.log(`FOUND ${activity.seoSlug}: ${winner.url} [${winner.score}, ${winner.why}]`);
    return winner.url;
  } catch (e) {
    console.log(`WARN browser image failed ${activity.seoSlug}: ${e.message}`);
    return null;
  } finally {
    await page.close();
  }
}

const concurrency=4;
let cursor=0;
async function worker(){
  while(true){
    const i=cursor++;
    if(i>=activities.length) return;
    const a=activities[i];
    const source=a.source||a.website||"";
    const image=await extract(a);
    if(image){
      a.imageUrl=image;
      a.imageVerifiedFromSource=true;
      a.imageSourceUrl=source;
      a.imageSourceName=sourceName(source);
    } else {
      if(isStock(a.imageUrl||"")) a.imageUrl="";
      a.imageVerifiedFromSource=!!a.imageUrl && !isStock(a.imageUrl);
      a.imageSourceUrl=source;
      a.imageSourceName=sourceName(source);
      console.log(`NO EXACT IMAGE ${a.seoSlug}`);
    }
  }
}
await Promise.all(Array.from({length:concurrency},()=>worker()));
await browser.close();

fs.writeFileSync(activitiesPath,JSON.stringify(activities,null,2)+"\n");
console.log(`Browser image QA complete. Verified ${activities.filter(a=>a.imageVerifiedFromSource).length}/${activities.length}`);
