import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const site = process.argv[2] || "site";
const jsonPath = path.join(site, "activities.json");
const activities = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const outDir = path.join(site, "images", "organiser");
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  viewport: { width: 1400, height: 900 }
});

const stock = u => /pexels\.com|unsplash\.com|pixabay\.com/i.test(u || "");
const incorrect = a => stock(a.imageUrl) || /illustrative|substitut|stock|not (this|the) (event|session)|another .*library/i.test(a.imageCredit || "");
const keywords = s => [...new Set((s || "").toLowerCase().match(/[a-z0-9]+/g) || [])].filter(x => x.length > 3 && !["2026", "family", "free", "event", "sydney", "school", "kids", "the", "day", "with"].includes(x));
const safeSlug = s => /^[a-z0-9-]+$/.test(s || "");
const fileType = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};

async function findImage(a, page) {
  const source = a.source || a.website || "";
  await page.goto(source, { waitUntil: "domcontentloaded", timeout: 16000 });
  await page.waitForTimeout(1000);
  const words = keywords(a.title);
  const options = await page.evaluate(words => {
    const candidates = [];
    const overlap = s => words.reduce((n, w) => n + Number((s || "").toLowerCase().includes(w)), 0);
    const add = (url, points, label) => {
      if (!url) return;
      try { url = new URL(url, document.baseURI).href; } catch { return; }
      if (!/^https?:\/\//.test(url)) return;
      if (/logo|favicon|avatar|sprite|brandmark|site-logo|icons?\/|social|site-map|\.svg(\?|$)/i.test(url + " " + label)) return;
      if (/placeholder|default-image|no-image|generic-image/i.test(url)) return;
      candidates.push({url, points, label});
    };
    const title = document.querySelector("h1")?.textContent || document.title || "";
    const titleMatch = overlap(title);
    if (words.length && titleMatch === 0 && overlap(document.body?.innerText?.slice(0, 12000)) === 0) return [];
    for (const [sel, score] of [
      ['meta[property="og:image:secure_url"]', 92],
      ['meta[property="og:image"]', 90],
      ['meta[name="twitter:image"]', 82],
      ['meta[name="twitter:image:src"]', 82],
    ]) {const m = document.querySelector(sel); if (m?.content) add(m.content, score, "metadata");}
    for (const el of document.querySelectorAll("img")) {
      const rect = el.getBoundingClientRect();
      const url = el.currentSrc || el.src || el.dataset.src || "";
      const near = (el.closest("article")?.textContent || el.parentElement?.parentElement?.textContent || "").slice(0, 1500);
      const w = el.naturalWidth || rect.width, h = el.naturalHeight || rect.height;
      if (w < 280 || h < 150) continue;
      let score = Math.min(55, rect.width * rect.height / 12000);
      if (el.closest("main, article")) score += 22;
      if (rect.top > -100 && rect.top < 1000) score += 13;
      if (/event|banner|hero|cover|thumbnail/i.test(String(el.className)+" "+url)) score += 14;
      score += overlap(el.alt + " " + url) * 16 + overlap(near) * 6;
      add(url, score, el.alt || "image");
    }
    for (const el of document.querySelectorAll("header, main, article, section, [class*=hero], [class*=banner]")) {
      if (el.matches("header") && !el.closest("article,main")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 330 || rect.height < 170) continue;
      const m = getComputedStyle(el).backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if (!m) continue;
      add(m[1], 65 + overlap(el.textContent?.slice(0, 1200)) * 10, "background");
    }
    const seen = new Set();
    return candidates.sort((x,y)=>y.points-x.points).filter(x=>{if(seen.has(x.url))return false; seen.add(x.url);return true}).slice(0,12);
  }, words);
  for (const item of options) {
    try {
      const res = await context.request.get(item.url, { timeout: 12000, headers: { referer: source } });
      if (!res.ok()) continue;
      const ctype = (res.headers()["content-type"] || "").split(";")[0].trim().toLowerCase();
      const ext = fileType[ctype];
      if (!ext) continue;
      const data = await res.body();
      if (data.length < 5000 || data.length > 6_000_000) continue;
      return { data, ext, source };
    } catch(e) { console.log("Image candidate failed",a.seoSlug,item.url,String(e).slice(0,100)); }
  }
  return null;
}

let cursor = 0, updated = 0, failures = 0, skipped = 0;
const jobs = [...activities].filter(a => safeSlug(a.seoSlug) && (a.source || a.website) && (incorrect(a) || !a.imageUrl || !a.imageVerifiedFromSource));
jobs.sort((a,b) => (b.seoSlug === "moore-park-south-family-fun-day-oct-2026") - (a.seoSlug === "moore-park-south-family-fun-day-oct-2026"));
console.log("Checking",jobs.length,"event listings with missing or unverified images");
async function worker() {
  const page = await context.newPage();
  while (cursor < jobs.length) {
    const a = jobs[cursor++];
    try {
      const result = await findImage(a, page);
      if (!result) { failures++; console.log("UNVERIFIED",a.seoSlug); continue; }
      const fileName = a.seoSlug+"."+result.ext;
      const local = "/images/organiser/"+fileName;
      fs.writeFileSync(path.join(outDir,fileName),result.data);
      const detailPath = path.join(site,a.seoSlug,"index.html");
      if (!fs.existsSync(detailPath)) {
        fs.unlinkSync(path.join(outDir,fileName));
        console.log("MISSING DETAIL",a.seoSlug);
        failures++; continue;
      }
      let html=fs.readFileSync(detailPath,"utf8");
      const picMatch = /(<div class="pic"[^>]*>[\s\S]*?<img\s[^>]*src=")([^"]+)(")/;
      if (!picMatch.test(html)) {
        fs.unlinkSync(path.join(outDir,fileName));
        console.log("NO HERO",a.seoSlug);
        failures++; continue;
      }
      html=html.replace(picMatch,(_m,start,_old,end)=>start+local+end);
      html=html.replace(/(<div class="image-credit">)[\s\S]*?(?=<a\s)/,
        "$1Original image from the event organiser. ");
      fs.writeFileSync(detailPath,html,"utf8");
      a.imageUrl=local;
      a.imageVerifiedFromSource=true;
      a.imageSourceUrl=result.source;
      a.imageCredit="Original event organiser image";
      updated++;
      console.log("UPDATED",a.seoSlug,local,result.data.length);
    } catch(e) {failures++;console.log("ERROR",a.seoSlug,String(e).slice(0,200));}
  }
  await page.close();
}
await Promise.all(Array.from({length:5},()=>worker()));
await browser.close();
if (updated) {
  fs.writeFileSync(jsonPath,JSON.stringify(activities,null,2)+"\n");
  // Force the browser to request refreshed image URLs and avoid stale JSON caches.
  const jsPath=path.join(site,"script.js"), htmlPath=path.join(site,"index.html");
  let js=fs.readFileSync(jsPath,"utf8");
  js=js.replace(/activities\.json\?v=[^']+/, "activities.json?v=official-images-oct15");
  fs.writeFileSync(jsPath,js);
  let html=fs.readFileSync(htmlPath,"utf8");
  html=html.replace(/script\.js\?v=[^"]+/, "script.js?v=official-images-oct15");
  fs.writeFileSync(htmlPath,html);
}
console.log(JSON.stringify({updated,failures,skipped,total:activities.length},null,2));
if (failures) console.log("Images without verified organiser artwork have been preserved for editorial review.");
