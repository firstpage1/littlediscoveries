const {chromium}=require('playwright');
const assert=require('assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true});const page=await browser.newPage();
try{
 const sources=[
  'https://www.woollahragallery.com.au/Whats-On/Events/Paper-Sculpture-Workshop-with-Samuel-Chan-Ages-7-12',
  'https://www.eventbrite.com.au/e/drop-in-paper-sculpture-workshop-with-samuel-chan-tickets-2002486575252'
 ];let verified=false;const evidence=[];
 for(const url of sources){
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   const body=await page.locator('body').innerText();
   const events=await page.locator('script[type="application/ld+json"]').allTextContents();
   const combined=body+'\n'+events.join('\n');
   const date=/14 November 2026|Nov 14|2026-11-14|November 14/.test(combined);
   const free=/\bFree\b|\$0(?:\.00)?|"price"\s*:\s*"?0(?:\.0+)?"?/.test(combined);
   const event=/Samuel Chan/.test(combined)&&/Drop.in Paper Sculpture|traditional sampan|hand.dyed paper/i.test(combined);
   evidence.push({url,status:response.status(),date,free,event});
   if(date&&free&&event)verified=true;
  }catch(error){evidence.push({url,error:error.message});}
 }
 console.log('APPROVED_SOURCE_RECHECK '+JSON.stringify(evidence));
 assert(verified,'Current Samuel Chan organiser/authorised ticket page did not confirm the approved free 14 November event');
}finally{await browser.close();}
})();
