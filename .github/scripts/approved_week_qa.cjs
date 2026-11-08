const {chromium}=require('playwright');
const fs=require('fs');
const assert=require('assert/strict');
const rows=JSON.parse(fs.readFileSync('week-2026-11-09-approved.json','utf8'));
const live=process.env.QA_LIVE==='true';
const base=live?'https://www.littlediscoveries.com.au':'http://127.0.0.1:8765';
const output='qa-approved-week';fs.mkdirSync(output,{recursive:true});
const expected=["LD-20261109-43", "LD-20261109-01", "LD-20261109-02", "LD-20261109-03", "LD-20261109-04", "LD-20261109-05", "LD-20261109-45", "LD-20261109-49", "LD-20261109-47", "LD-20261109-31", "LD-20261109-14", "LD-20261109-15", "LD-20261109-10", "LD-20261109-46", "LD-20261109-21", "LD-20261109-06", "LD-20261109-33", "LD-20261109-44", "LD-20261109-08", "LD-20261109-09", "LD-20261109-12", "LD-20261109-39", "LD-20261109-48", "LD-20261109-35", "LD-20261109-41", "LD-20261109-07", "LD-20261109-13", "LD-20261109-18", "LD-20261109-11", "LD-20261109-19", "LD-20261109-20", "LD-20261109-22", "LD-20261109-30", "LD-20261109-32", "LD-20261109-23", "LD-20261109-24", "LD-20261109-25", "LD-20261109-26", "LD-20261109-27", "LD-20261109-28", "LD-20261109-29"];
const expectedChoice=['43','01','02','03','04','05'].map(x=>'LD-20261109-'+x);
const report={base,live,started:new Date().toISOString(),checks:[],details:[],images:[],errors:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,fn)=>{try{fn();report.checks.push({name,pass:true});}catch(e){report.errors.push(name+': '+e.message);}};
const area=v=>/north shore/i.test(v)?'North Shore':v;
async function expandAll(page){
 for(let n=0;n<10;n++){if(!await page.locator("#show-more").isVisible())return;await page.locator("#show-more").click();}
 throw new Error("Show More did not expose the complete approved release");
}
async function assertTitles(page,expectedRows,label){
 await expandAll(page);
 const got=await page.locator('.activity-card__title').allTextContents();
 check(label,()=>assert.deepEqual([...got].sort(),expectedRows.map(x=>x.title).sort()));
}
async function imageCheck(locator,label){
 try{
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate(i=>new Promise(resolve=>{if(i.complete)resolve();else {i.addEventListener('load',resolve,{once:true});i.addEventListener('error',resolve,{once:true});setTimeout(resolve,15000);}}));
  const v=await locator.evaluate(i=>({url:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight,visible:!i.hidden}));
  report.images.push({label,...v});
  if(!v.width||!v.height||!v.visible)report.errors.push(label+': organiser image did not render');
 }catch(e){report.errors.push(label+': '+e.message);}
}
(async()=>{
 let browser;
 try{
  check('only approved 41 IDs',()=>assert.deepEqual(rows.map(x=>x.id),expected));
  check('exact approved six Editor’s Choice IDs',()=>assert.deepEqual(rows.filter(x=>x.editorsChoice).sort((a,b)=>a.ecOrder-b.ecOrder).map(x=>x.id),expectedChoice));
  browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM,args:['--no-sandbox']}: {})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  if(live){
   let matched=false;
   for(let n=0;n<24;n++){
    const r=await page.request.get(base+'/week-2026-11-09-approved.json?verify='+Date.now());
    if(r.ok()){try{const j=await r.json();matched=JSON.stringify(j)===JSON.stringify(rows);}catch{}}
    if(matched)break;
    await pause(10000);
   }
   if(!matched)throw new Error('Production did not serve the approved release within four minutes');
  }
  const home=await page.goto(base+'/?verify=20261109-approved-41',{waitUntil:'domcontentloaded'});
  await page.locator('.activity-card').first().waitFor();await expandAll(page);
  check('homepage HTTP 200',()=>assert.equal(home.status(),200));
  await assertTitles(page,rows,'homepage approved cards');
  const choices=await page.locator('.activity-card--editors-choice .activity-card__title').allTextContents();
  check('approved six Editor’s Choice order',()=>assert.deepEqual(choices,rows.filter(x=>x.editorsChoice).map(x=>x.title)));
  for(const row of rows){
   const card=page.locator('.activity-card').filter({has:page.locator('.activity-card__title').getByText(row.title,{exact:true})});
   await imageCheck(card.locator('.activity-card__thumb img'),row.id+' thumbnail');
  }
  await page.screenshot({path:output+'/homepage-desktop.png',fullPage:true});
  for(const filter of ['age','neighborhood','day']){
   const buttons=await page.locator(`[data-filter="${filter}"] .chip`).evaluateAll(bs=>bs.map(b=>b.dataset.value).filter(Boolean));
   for(const value of buttons){
    await page.locator('#clear-filters').click();
    await page.locator(`[data-filter="${filter}"] [data-value="${value}"]`).click();
    const want=rows.filter(r=>filter==='age'?(r.age.includes(value)||r.age.includes('All Ages')):filter==='neighborhood'?area(r.neighborhood)===value:r.day.includes(value));
    await assertTitles(page,want,filter+' filter '+value);
   }
  }
  await page.locator('#clear-filters').click();
  await page.locator('[data-filter="day"] [data-value="Thursday"]').click();
  await page.locator('[data-filter="day"] [data-value="Friday"]').click();
  await assertTitles(page,rows.filter(r=>r.day.some(d=>['Thursday','Friday'].includes(d))),'multi-day Thursday + Friday');
  await page.locator('#clear-filters').click();
  await page.locator('[data-filter="age"] [data-value="Teens (13–16)"]').click();
  await page.locator('[data-filter="neighborhood"] [data-value="CBD"]').click();
  await assertTitles(page,rows.filter(r=>(r.age.includes('Teens (13–16)')||r.age.includes('All Ages'))&&r.neighborhood==='CBD'),'combined teen and CBD');
  await page.locator('#clear-filters').click();
  await assertTitles(page,rows,'clear filters');
  for(const row of rows){
   const card=page.locator('.activity-card').filter({has:page.locator('.activity-card__title').getByText(row.title,{exact:true})});
   await card.locator('.activity-card__cta').click();
   await page.waitForURL(base+'/'+row.seoSlug+'/');
   const detailResponse=await page.request.get(page.url());check(row.id+' detail HTTP 200',()=>assert.equal(detailResponse.status(),200));
   const title=await page.locator('h1').innerText();
   const facts=await page.locator('.facts').innerText();
   const structured=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
   check(row.id+' detail title',()=>assert.equal(title,row.title));
   check(row.id+' precise age',()=>assert.ok(facts.includes(row.ageGuidance)));
   check(row.id+' metadata',()=>{assert.equal(structured.startDate,row.startAt);assert.equal(structured.endDate,row.endAt);assert.equal(structured.offers.price,'0');assert.equal(structured.image[0],row.imageUrl);});
   const badge=await page.locator('.pic .ec').count();check(row.id+' Editor’s Choice detail treatment',()=>assert.equal(badge,row.editorsChoice?1:0));
   const og=await page.locator('meta[property="og:image"]').getAttribute('content');check(row.id+' social image',()=>assert.equal(new URL(og,base).href,new URL(row.imageUrl,'https://www.littlediscoveries.com.au').href));
   const factCount=await page.locator('.fact').count();check(row.id+' five facts',()=>assert.equal(factCount,5));
   const headings=await page.locator('.article h2').allTextContents();
   check(row.id+' practical article sections',()=>assert.deepEqual(headings,['About this activity','Good to know','Planning your visit']));
   await imageCheck(page.locator('.pic>img'),row.id+' hero');
   const robots=await page.locator('meta[name="robots"]').getAttribute('content');check(row.id+' public indexing',()=>assert.equal(robots,'index,follow'));
   const draftBanners=await page.locator('.draftbar').count();check(row.id+' published detail',()=>assert.equal(draftBanners,0));
   const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');check(row.id+' canonical',()=>assert.equal(canonical,'https://www.littlediscoveries.com.au/'+row.seoSlug+'/'));
   for(const link of await page.locator('.related .card').evaluateAll(es=>es.map(e=>e.getAttribute('href')))){const response=await page.request.get(new URL(link,base).href);check(row.id+' related '+link,()=>assert.equal(response.status(),200));}
   const booking=await page.locator('#booking .btn').getAttribute('href');
   check(row.id+' booking URL',()=>assert.equal(booking,row.website));
   const credits=await page.locator('.image-credit').innerText();check(row.id+' image attribution',()=>assert.ok(credits.includes(row.imageCredit)));
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    check(row.id+' viewport '+width,()=>assert.equal(overflow,false));
    await page.screenshot({path:`${output}/${row.id}-${width}.png`,fullPage:true});
   }
   report.details.push({id:row.id,url:page.url(),title,booking,verified:true});
   await page.setViewportSize({width:1440,height:1000});
   await page.goto(base+'/?verify=20261109-approved-41',{waitUntil:'domcontentloaded'});
   await page.locator('.activity-card').first().waitFor();await expandAll(page);
  }
  // Exercise end-time expiry in a separate browser context without changing production content.
  const expired=await browser.newContext();
  await expired.addInitScript(()=>{const OriginalDate=Date;const fixed=OriginalDate.parse('2026-11-23T00:00:00+11:00');class TestDate extends OriginalDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}}window.Date=TestDate;});
  const ep=await expired.newPage();await ep.goto(base+'/?expiry-check=20261109',{waitUntil:'domcontentloaded'});await ep.locator('#no-results:not(.hidden)').waitFor();
  check('ended release absent from active results',()=>assert.ok(true));
  const endedRow=rows.find(r=>r.id.endsWith('-48'));await ep.goto(base+'/'+endedRow.seoSlug+'/',{waitUntil:'domcontentloaded'});const endedVisible=await ep.locator('#activity-status').isVisible();const bookingVisible=await ep.locator('#booking').isVisible();check('ended detail status and booking',()=>{assert.equal(endedVisible,true);assert.equal(bookingVisible,false);});
  await expired.close();
 }catch(e){report.errors.push(e.stack||String(e));}
 finally{
  if(browser)await browser.close();
  report.completed=new Date().toISOString();report.passed=report.errors.length===0;
  fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({base,passed:report.passed,detailCount:report.details.length,imageCount:report.images.length,errors:report.errors}));
  process.exitCode=report.passed?0:1;
 }
})();
