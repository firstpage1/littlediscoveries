const previewPublicKey="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv8JP8GABTIr3CPaANkEH\nWH7b/R+rodV9mblVjSylEEPm35F6T9deKH9Z6w5S1pL1NCF0Atwl6icgmCqO4iGM\n65AAdqpzOQb0R5h4gkXoA6Wl+gYry23K3b1HKoyqX1oJubeVvm6bUcyUM/8O4lCZ\nUg2m18/wShJoaegQoyUYJtgKIF9Z+YRNEwO0rwwsPTvN33YumV0GjpBqSI/iVl8S\ni++k4YHiJpzMCZ1yIpHsIklJYNS45KBBduSbkeGv9379+X9xeKPBq6tfaprmNMWf\nJJeNb5EAcyNnMBCuEVCgucveCX9AY9wsXpIn8VcLfi330FIw8Mqk46uaaL1Y8zD+\nZwIDAQAB\n-----END PUBLIC KEY-----\n";
const {chromium}=require('playwright');const crypto=require('crypto');
const facts=[];const targets=[
 {id:'33-gallery',url:'https://www.woollahragallery.com.au/Whats-On/Events/Paper-Sculpture-Workshop-with-Samuel-Chan-Ages-7-12'},
 {id:'33-ticket',url:'https://www.eventbrite.com.au/e/drop-in-paper-sculpture-workshop-with-samuel-chan-tickets-2002486575252'},
 {id:'18-booking',url:'https://blacktown-events.bookable.net.au/#!/event-detail/ev_86a96eacba8b41a3b6ad41a8e1cca0b3'},
 {id:'42-primary',url:'https://ajul67335.wixsite.com/free-to-dance/classes-events'}
];
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage();for(const t of targets){let text;try{await page.goto(t.url,{waitUntil:'domcontentloaded',timeout:20000});if(t.id==='18-booking')await page.getByText(/swap your style/i).first().waitFor({timeout:12000});text=await page.locator('body').innerText();}catch(e){text='READ_ERROR '+e.message+'\n'+await page.locator('body').innerText().catch(()=>'');}
 const key=crypto.randomBytes(32),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(Buffer.from(text)),cipher.final()]);const wrapped=crypto.publicEncrypt({key:previewPublicKey,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},key);const record={...t,wrapped:wrapped.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')};facts.push(record);console.log('PRIVATE_FACT_TEXT '+JSON.stringify(record));}
 require('fs').writeFileSync('held-fact-detail.enc.json',JSON.stringify(facts));await browser.close();})();
