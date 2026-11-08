const fs=require('fs');const path=require('path');const {chromium}=require('playwright');
const file='week-2026-11-09-approved.json';const rows=JSON.parse(fs.readFileSync(file,'utf8'));
const fix=new Set(['02','45','49','47','10','46']);
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const report=[];
 try{
  for(const e of rows){
   if(!fix.has(e.id.slice(-2))||e.imageUrl.startsWith('/'))continue;
   const original=e.imageUrl;
   const variants=[...new Set([original,decodeURI(original),decodeURIComponent(original),original.replace(/%40/g,'@').replace(/%3D/g,'=')])];
   let saved=false;
   for(const url of variants){
    try{
     const response=await page.request.get(url,{headers:{Referer:e.imageSource,'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36'},timeout:20000});
     const type=response.headers()['content-type']||'';
     const item={id:e.id,url,status:response.status(),type};
     if(response.ok()&&/^image\//.test(type)){
      const bytes=await response.body();const data='data:'+type.split(';')[0]+';base64,'+bytes.toString('base64');
      await page.setContent('<img id="verify-image" src="'+data+'">');
      await page.locator('#verify-image').evaluate(i=>i.decode());
      const dims=await page.locator('#verify-image').evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight}));
      Object.assign(item,dims);
      if(dims.width>=300&&dims.height>=200){
       const ext=type.includes('png')?'png':type.includes('webp')?'webp':type.includes('jpeg')?'jpg':null;
       if(ext){
        const local='/images/organiser/approved-20261109/'+e.id+'.'+ext;
        fs.mkdirSync(path.dirname('.'+local),{recursive:true});fs.writeFileSync('.'+local,bytes);
        const htmlFile=e.seoSlug+'/index.html';let html=fs.readFileSync(htmlFile,'utf8');
        // Keep the original image link and credit, replace only hero/social/structured-data delivery URLs.
        html=html.replace('src="'+original.replace(/&/g,'&amp;')+'"','src="'+local+'"');
        html=html.replace('property="og:image" content="'+original.replace(/&/g,'&amp;')+'"','property="og:image" content="https://www.littlediscoveries.com.au'+local+'"');
        html=html.replace('"image": ["'+original+'"]','"image": ["'+local+'"]');
        fs.writeFileSync(htmlFile,html);
        e.originalImageUrl=original;e.imageUrl=local;e.imageDelivery='Same approved organiser asset, locally served';saved=true;
        item.savedAs=local;
        console.log('APPROVED_ASSET '+JSON.stringify({id:e.id,path:local,originalImageUrl:original,base64:bytes.toString('base64')}));
       }
      }
     }
     report.push(item);if(saved)break;
    }catch(error){report.push({id:e.id,url,error:error.message});}
   }
  }
  fs.writeFileSync(file,JSON.stringify(rows,null,2)+'\n');
  fs.mkdirSync('qa-approved-week',{recursive:true});fs.writeFileSync('qa-approved-week/image-delivery.json',JSON.stringify(report,null,2));
  console.log('IMAGE_DELIVERY '+JSON.stringify(report));
 }finally{await browser.close();}
})();
