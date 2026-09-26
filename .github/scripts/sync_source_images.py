#!/usr/bin/env python3
import json, os, re, sys, html as htmlmod
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

SITE_DIR = sys.argv[1] if len(sys.argv) > 1 else "."
ACTIVITIES = os.path.join(SITE_DIR, "activities.json")

SOURCE_NAMES = {
    "sydneyoperahouse.com": "Sydney Opera House",
    "waverley.nsw.gov.au": "Waverley Council",
    "randwick.nsw.gov.au": "Randwick City Council",
    "woollahra.nsw.gov.au": "Woollahra Municipal Council",
    "bondipavilion.com.au": "Bondi Pavilion",
    "darlingharbour.com": "Darling Harbour",
    "innerwest.nsw.gov.au": "Inner West Council",
    "whatson.cityofsydney.nsw.gov.au": "City of Sydney What's On",
    "events.mosman.nsw.gov.au": "Mosman Council",
    "northernbeaches.nsw.gov.au": "Northern Beaches Council",
    "sutherlandshire.nsw.gov.au": "Sutherland Shire Council",
    "atparramatta.com": "City of Parramatta",
    "ryde.nsw.gov.au": "City of Ryde",
    "hornsby.nsw.gov.au": "Hornsby Shire Council",
    "georgesriver.nsw.gov.au": "Georges River Council",
    "bayside.nsw.gov.au": "Bayside Council",
}

KNOWN_IMAGES = {
    "iwagumi-air-scape-sydney-opera-house-2026":
        "https://www.sydneyoperahouse.com/sites/default/files/styles/360x414/public/collaborodam_assets/wild-things-2026-iwagumi-air-scape-3-1%20%281%29.jpg?itok=_RiboxW4",
    "bondi-firelight-2026":
        "https://www.waverley.nsw.gov.au/__data/assets/image/0003/258456/JN-00265_Bondifirelight_web.jpg",
    "darling-square-moon-festival-2026":
        "https://www.darlingharbour.com/getmedia/034db33f-8b07-4301-a63e-4a948fcb8872/darling-square-moon-festival-2022.jpg?width=1920",
}

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.images = []
        self.in_main = False
        self.main_depth = 0
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "main":
            self.in_main = True
            self.main_depth += 1
        if tag == "meta":
            key = (d.get("property") or d.get("name") or d.get("itemprop") or "").lower()
            content = d.get("content")
            if key and content and key not in self.meta:
                self.meta[key] = content
        elif tag == "link":
            rel = (d.get("rel") or "").lower()
            if "image_src" in rel and d.get("href"):
                self.meta.setdefault("image_src", d["href"])
        elif tag == "img":
            src = d.get("src") or d.get("data-src") or d.get("data-lazy-src")
            srcset = d.get("srcset") or d.get("data-srcset")
            if not src and srcset:
                parts = [x.strip().split(" ")[0] for x in srcset.split(",") if x.strip()]
                if parts:
                    src = parts[-1]
            if src:
                self.images.append((src, d.get("alt",""), self.in_main))
    def handle_endtag(self, tag):
        if tag == "main" and self.in_main:
            self.main_depth -= 1
            if self.main_depth <= 0:
                self.in_main = False

def host_name(url):
    host = urlparse(url).netloc.lower().replace("www.","")
    for key, name in SOURCE_NAMES.items():
        if host == key or host.endswith("." + key):
            return name
    return host or "Organiser"

def is_stock(url):
    u=(url or "").lower()
    return any(x in u for x in ["pexels.com","unsplash.com","pixabay.com"])

def fetch_source_image(source_url, title, slug):
    if slug in KNOWN_IMAGES:
        return KNOWN_IMAGES[slug]
    try:
        req = Request(source_url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; LittleDiscoveries/1.0; +https://www.littlediscoveries.com.au/)",
            "Accept": "text/html,application/xhtml+xml"
        })
        with urlopen(req, timeout=20) as r:
            raw = r.read(3_000_000)
            charset = r.headers.get_content_charset() or "utf-8"
            page = raw.decode(charset, errors="replace")
    except Exception as e:
        print(f"WARN fetch failed {slug}: {e}")
        return ""

    p = PageParser()
    try:
        p.feed(page)
    except Exception:
        pass

    for key in ["og:image:secure_url","og:image","twitter:image","twitter:image:src","image_src"]:
        val=p.meta.get(key)
        if val:
            url=urljoin(source_url, htmlmod.unescape(val))
            if url.startswith("http") and not any(x in url.lower() for x in ["logo","favicon","icon.svg","logo.svg"]):
                return url

    # JSON-LD / embedded image URLs.
    patterns = [
        r'"image"\s*:\s*"([^"]+)"',
        r'"imageUrl"\s*:\s*"([^"]+)"',
        r'"thumbnailUrl"\s*:\s*"([^"]+)"',
    ]
    for pat in patterns:
        for m in re.finditer(pat, page, flags=re.I):
            url=urljoin(source_url, htmlmod.unescape(m.group(1).replace("\\/","/")))
            if url.startswith("http") and re.search(r'\.(?:jpe?g|png|webp)(?:\?|$)', url, re.I) and not any(x in url.lower() for x in ["logo","favicon","icon"]):
                return url

    title_words={w.lower() for w in re.findall(r'[A-Za-z0-9]+', title) if len(w)>3}
    candidates=[]
    for src, alt, in_main in p.images:
        url=urljoin(source_url, htmlmod.unescape(src))
        low=url.lower()
        if not url.startswith("http") or any(x in low for x in ["logo","favicon","icon","sprite","avatar","social","header-logo","footer"]):
            continue
        if low.endswith(".svg"):
            continue
        score=10 if in_main else 0
        text=(url+" "+alt).lower()
        score += sum(2 for w in title_words if w in text)
        if re.search(r'\.(?:jpe?g|png|webp)(?:\?|$)', low):
            score += 3
        candidates.append((score,url))
    if candidates:
        candidates.sort(reverse=True)
        return candidates[0][1]
    return ""

def esc(s):
    return htmlmod.escape(str(s or ""), quote=True)

def date_display(a):
    import datetime
    def one(s):
        d=datetime.date.fromisoformat(s)
        return d.strftime("%A, %-d %B %Y")
    if a.get("startDate")==a.get("endDate"):
        return one(a["startDate"])
    return f'{one(a["startDate"])} – {one(a["endDate"])}'

def related(a, activities):
    pool=[x for x in activities if x.get("seoSlug")!=a.get("seoSlug")]
    ranked=sorted(pool,key=lambda x:(x.get("neighborhood")!=a.get("neighborhood"),x.get("category")!=a.get("category"),not x.get("editorsChoice",False)))
    return ranked[:3]

DETAIL_CSS=r"""
*{box-sizing:border-box}body{margin:0;font-family:Nunito,system-ui,sans-serif;background:#FFF9F5;color:#1C1C2E;line-height:1.65;overflow-x:hidden}a{text-decoration:none;color:inherit}.container{max-width:1180px;margin:auto;padding:0 24px}.nav{background:#fff;border-bottom:1px solid #EDE8E3;position:sticky;top:0;z-index:10}.navin{height:68px;display:flex;align-items:center;justify-content:space-between}.logo{height:56px}.nav a:last-child{font-weight:800;color:#4A4A6A}.hero{padding:32px 0 56px;background:linear-gradient(135deg,#FFF3EB,#FFF9F5 52%,#F0F8FF)}.crumb{font-size:12px;color:#8888AA;font-weight:800;margin-bottom:22px}.grid{display:grid;grid-template-columns:1fr .9fr;gap:50px;align-items:center}.tags{display:flex;gap:7px;flex-wrap:wrap}.tag{font-size:11px;font-weight:900;padding:5px 10px;border-radius:999px;background:#fff;border:1px solid #EDE8E3}.pink{background:#FFF0F5;color:#c0195e}.blue{background:#E8F4FD;color:#1A6DA4}.green{background:#E8FBF2;color:#0F8A52}h1{font-size:clamp(36px,5vw,58px);line-height:1.05;letter-spacing:-.035em;margin:16px 0}.intro{font-size:17px;color:#4A4A6A}.pic{aspect-ratio:4/3;border-radius:26px;overflow:hidden;box-shadow:0 18px 55px rgba(28,28,46,.14);position:relative;background:linear-gradient(135deg,#fff0f5,#f0f8ff);display:flex;align-items:center;justify-content:center}.pic>img{width:100%;height:100%;object-fit:cover}.pic .fallback{width:150px;height:auto;object-fit:contain}.ec{position:absolute;top:16px;left:16px;background:linear-gradient(135deg,#f94d85,#ff8c42);color:white;font-size:11px;font-weight:900;padding:7px 11px;border-radius:999px}.image-credit{font-size:11px;color:#8888AA;text-align:right;margin-top:8px}.image-credit a{font-weight:800;text-decoration:underline}.facts{margin-top:-28px;position:relative;z-index:2;background:#fff;border:1px solid #EDE8E3;border-radius:20px;box-shadow:0 8px 28px rgba(28,28,46,.1);display:grid;grid-template-columns:1.1fr .9fr 1.4fr .9fr .7fr;overflow:hidden}.fact{padding:18px;border-right:1px solid #EDE8E3}.fact:last-child{border-right:0}.lab{font-size:10px;font-weight:900;color:#8888AA;text-transform:uppercase;letter-spacing:.08em}.val{font-size:14px;font-weight:800;margin-top:4px}.content{padding:60px 0}.cols{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:48px}.article h2{font-size:25px;margin:0 0 14px}.article p{color:#4A4A6A}.box{background:#fff;border:1px solid #EDE8E3;border-radius:20px;padding:24px;margin:26px 0}.box h3{margin-top:0}.box ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}.box li{padding-left:25px;position:relative;color:#4A4A6A}.box li:before{content:"★";position:absolute;left:0;color:#f94d85}.aside{position:sticky;top:92px;height:max-content;background:#fff;border:1px solid #EDE8E3;border-radius:20px;padding:22px}.aside .email-image{width:108px;height:auto;margin:0 auto 8px}.aside p{color:#8888AA}.small{font-size:13px;color:#4A4A6A;border-top:1px solid #EDE8E3;margin-top:15px;padding-top:15px}.book{padding:0 0 60px}.bookbox{background:#fff;border:1px solid #EDE8E3;border-radius:22px;padding:26px 28px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center}.bookbox h3{margin:0 0 5px}.bookbox p{margin:0;color:#8888AA}.btn{display:inline-flex;background:#f94d85;color:white;padding:13px 22px;border-radius:999px;font-weight:900}.related{background:#fff;border-top:1px solid #EDE8E3;padding:58px 0}.related h2{font-size:30px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{background:#FFF9F5;border:1px solid #EDE8E3;border-radius:17px;padding:18px}.card b{display:block;margin-bottom:6px}.card span{font-size:12px;color:#f94d85;font-weight:900}.footer{background:#14141F;color:rgba(255,255,255,.55);padding:48px 0 32px}.footer__inner{display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center}.footer__brand{display:flex;flex-direction:column;align-items:center;gap:6px}.footer__brand p{font-size:.85rem;margin:0}.footer__links{display:flex;gap:24px;flex-wrap:wrap;justify-content:center;font-size:.85rem;font-weight:700}.footer__links a:hover{color:#ff6b35}.footer__copy{font-size:.78rem;margin:0}
@media(max-width:850px){.grid,.cols{grid-template-columns:1fr}.aside{position:static}.facts{grid-template-columns:1fr 1fr}.cards{grid-template-columns:1fr 1fr}}
@media(max-width:620px){.container{padding:0 16px}.navin{height:62px}.logo{height:46px}.grid{gap:24px}.copy{order:2}.visual{order:1}.pic{border-radius:18px;aspect-ratio:16/11}h1{font-size:36px}.facts{grid-template-columns:1fr}.fact{border-right:0;border-bottom:1px solid #EDE8E3}.content{padding:40px 0}.bookbox{grid-template-columns:1fr}.btn{width:100%;justify-content:center}.cards{grid-template-columns:1fr}}
"""

def render_detail(a, activities):
    rel=related(a,activities)
    src_name=a.get("imageSourceName") or host_name(a.get("source",""))
    image=a.get("imageUrl") or ""
    if image:
        hero=f'<img src="{esc(image)}" alt="{esc(a.get("title"))}" loading="eager">'
        credit=f'<div class="image-credit">Image source: <a href="{esc(a.get("imageSourceUrl") or a.get("source"))}" target="_blank" rel="noopener noreferrer">{esc(src_name)}</a></div>'
    else:
        hero='<img class="fallback" src="/images/email-image.png" alt="Little Discoveries">'
        credit=f'<div class="image-credit">No event image supplied by <a href="{esc(a.get("source"))}" target="_blank" rel="noopener noreferrer">{esc(src_name)}</a></div>'
    ec='<span class="ec">✨ Editor’s Choice</span>' if a.get("editorsChoice") else ""
    why=a.get("whyGo") or [
        "It was selected by Little Discoveries as a strong family option for this week.",
        "The activity offers a clear reason to get out of the house and try something different.",
        "The organiser provides current event details on the official listing."
    ]
    relhtml="".join(f'<a class="card" href="/{esc(x.get("seoSlug"))}/"><b>{esc(x.get("title"))}</b><span>{esc(x.get("neighborhood"))} · View activity →</span></a>' for x in rel)
    return f'''<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(a.get("title"))} | Little Discoveries</title><meta name="description" content="{esc(a.get("description"))}"><meta name="robots" content="index,follow"><link rel="canonical" href="https://www.littlediscoveries.com.au/{esc(a.get("seoSlug"))}/"><link rel="icon" href="/images/favicon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>{DETAIL_CSS}</style></head><body>
<header class="nav"><div class="container navin"><a href="/"><img class="logo" src="/images/logo.png" alt="Little Discoveries"></a><a href="/#activities">← All activities</a></div></header>
<section class="hero"><div class="container"><div class="crumb"><a href="/">Little Discoveries</a> › Activities › {esc(a.get("title"))}</div><div class="grid"><div class="copy"><div class="tags"><span class="tag">{esc(a.get("category"))}</span><span class="tag pink">{esc(", ".join(a.get("age") or ["All Ages"]))}</span><span class="tag blue">{esc(a.get("neighborhood"))}</span><span class="tag green">{esc(a.get("cost"))}</span></div><h1>{esc(a.get("title"))}</h1><p class="intro">{esc(a.get("description"))}</p></div><div class="visual"><div class="pic">{hero}{ec}</div>{credit}</div></div></div></section>
<div class="container facts"><div class="fact"><div class="lab">📅 Date</div><div class="val">{esc(date_display(a))}</div></div><div class="fact"><div class="lab">🕐 Time</div><div class="val">{esc(a.get("time"))}</div></div><div class="fact"><div class="lab">📍 Location</div><div class="val">{esc(a.get("venue") or a.get("address"))}</div></div><div class="fact"><div class="lab">🧒 Ages</div><div class="val">{esc(", ".join(a.get("age") or ["All Ages"]))}</div></div><div class="fact"><div class="lab">💰 Cost</div><div class="val">{esc(a.get("cost"))}</div></div></div>
<main class="content"><div class="container cols"><article class="article"><h2>About this activity</h2><p>{esc(a.get("description"))}</p><div class="box"><h3>Why it’s worth going</h3><ul>{"".join(f"<li>{esc(x)}</li>" for x in why[:5])}</ul></div><h2>Good to know</h2><p>Event details can change. Check the organiser’s page before leaving home, particularly for booking requirements, capacity and last-minute updates.</p></article><aside class="aside"><img class="email-image" src="/images/email-image.png" alt="Little Discoveries dinosaur"><h3>At a glance</h3><p>Everything you need before deciding whether this works for your family.</p><div class="small"><b>{esc(a.get("neighborhood"))}</b><br>{esc(a.get("venue"))}<br><br><b>{esc(a.get("cost"))}</b><br>{esc(a.get("time"))}</div></aside></div></main>
<section class="book"><div class="container"><div class="bookbox"><div><h3>Ready to book?</h3><p>You've got the key details above. Use the organiser's page only when you're ready to reserve your place or double-check the latest information.</p></div><a class="btn" href="{esc(a.get("source"))}" target="_blank" rel="noopener noreferrer">View official listing →</a></div></div></section>
<section class="related"><div class="container"><h2>You might also like</h2><div class="cards">{relhtml}</div></div></section>
<footer class="footer"><div class="container footer__inner"><div class="footer__brand"><p>Turning weekends in Sydney into adventures!</p></div><div class="footer__links"><a href="/#founder">About</a><a href="mailto:hello@patriciahaueiss.com">Contact</a></div><p class="footer__copy">© 2026 Little Discoveries. Made with ❤️ in Sydney.</p></div></footer>
</body></html>'''

with open(ACTIVITIES, encoding="utf-8") as f:
    activities=json.load(f)

# Remove the previously misdated City of Sydney listing.
activities=[a for a in activities if a.get("seoSlug")!="once-upon-a-time-en-espanol-2026"]

# Add/correct Bondi Firelight for this week.
bondi = {
    "id": 37,
    "title": "Bondi Firelight – Free Family Bonfire Night",
    "website": "https://www.waverley.nsw.gov.au/recreation/events/events/bondi_firelight",
    "source": "https://www.waverley.nsw.gov.au/recreation/events/events/bondi_firelight",
    "description": "A free evening gathering on South Bondi Beach with a crackling fire, seaside music and a fire-dancing performance.",
    "longDescription": "A free evening gathering on South Bondi Beach with a crackling fire, seaside music and a fire-dancing performance.",
    "address": "South Bondi Beach, Bondi NSW",
    "venue": "South Bondi Beach",
    "age": ["All Ages"],
    "neighborhood": "Eastern Suburbs",
    "day": ["Thursday"],
    "cost": "Free",
    "costLabel": "free; no registration required",
    "startDate": "2026-10-01",
    "endDate": "2026-10-01",
    "time": "6:00pm–8:30pm",
    "isOnline": False,
    "seoIndex": True,
    "seoSlug": "bondi-firelight-2026",
    "seoTitle": "Bondi Firelight – Free Family Bonfire Night | Little Discoveries",
    "seoDescription": "Free Bondi Firelight at South Bondi Beach on Thursday 1 October 2026, with bonfire, seaside music and fire dancing.",
    "isFeatured": True,
    "tags": ["bonfire","fire dancers","music","beach"],
    "category": "Festivals",
    "expired": False,
    "whyGo": [
        "A bonfire on Bondi Beach is a genuinely memorable setting for a family night out.",
        "The event combines relaxed seaside music with a fire-dancing performance.",
        "It works for adults as well as children, making it a true whole-family event.",
        "No registration is needed and entry is free."
    ],
    "editorsChoice": True,
    "ecOrder": 2
}
existing=next((a for a in activities if a.get("seoSlug")=="bondi-firelight-2026"),None)
if existing:
    existing.update(bondi)
else:
    activities.append(bondi)

# Keep exactly six Editor's Choice slots.
ec_slugs = {
    "iwagumi-air-scape-sydney-opera-house-2026": 1,
    "bondi-firelight-2026": 2,
    "big-ideas-factory-tumbalong-park-2026": 3,
    "family-fun-days-oxford-street-mall-2026": 4,
    "little-chef-darling-quarter-2026": 5,
    "skate-jam-miranda-2026": 6,
}
for a in activities:
    a["editorsChoice"] = a.get("seoSlug") in ec_slugs
    a["isFeatured"] = a["editorsChoice"]
    a["ecOrder"] = ec_slugs.get(a.get("seoSlug"))
    # Correct Family Fun Days to both Oxford Street dates in this week.
    if a.get("seoSlug")=="family-fun-days-oxford-street-mall-2026":
        a["day"]=["Monday","Tuesday"]
        a["endDate"]="2026-09-29"

# Original-source image sync. Browser-verified images take precedence.
for a in activities:
    source=a.get("source") or a.get("website") or ""
    if a.get("imageVerifiedFromSource") and a.get("imageUrl"):
        img=a.get("imageUrl")
    else:
        img=fetch_source_image(source,a.get("title",""),a.get("seoSlug","")) if source else ""
    if img:
        a["imageUrl"]=img
        a["imageVerifiedFromSource"]=True
    elif is_stock(a.get("imageUrl","")):
        a["imageUrl"]=""
        a["imageVerifiedFromSource"]=False
    a["imageSourceUrl"]=source
    a["imageSourceName"]=host_name(source)

# Reassign ids sequentially after cleanup.
for i,a in enumerate(activities,1):
    a["id"]=i

with open(ACTIVITIES,"w",encoding="utf-8") as f:
    json.dump(activities,f,ensure_ascii=False,indent=2)
    f.write("\n")

# Regenerate all activity detail pages.
for a in activities:
    slug=a.get("seoSlug")
    if not slug:
        continue
    folder=os.path.join(SITE_DIR,slug)
    os.makedirs(folder,exist_ok=True)
    with open(os.path.join(folder,"index.html"),"w",encoding="utf-8") as f:
        f.write(render_detail(a,activities))

# Update cache-busting, Editor's Choice structured data and sitemap.
index_path=os.path.join(SITE_DIR,"index.html")
with open(index_path,encoding="utf-8") as f:
    index=f.read()
choices=sorted([a for a in activities if a.get("editorsChoice")],key=lambda a:a.get("ecOrder") or 999)
item_list={"@context":"https://schema.org","@type":"ItemList","name":"Editor's Choice – week of 28 September 2026","numberOfItems":len(choices),"itemListElement":[{"@type":"ListItem","position":i+1,"name":a["title"],"url":f'https://www.littlediscoveries.com.au/{a["seoSlug"]}/'} for i,a in enumerate(choices)]}
index=re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>',f'<script type="application/ld+json">{json.dumps(item_list,ensure_ascii=False)}</script>',index,count=1)
index=re.sub(r'script\.js\?v=[^"]+', 'script.js?v=20260928c', index)
with open(index_path,"w",encoding="utf-8") as f:f.write(index)

script_path=os.path.join(SITE_DIR,"script.js")
with open(script_path,encoding="utf-8") as f:s=f.read()
s=re.sub(r"fetch\('activities\.json\?v=[^']*'\)","fetch('activities.json?v=20260928c')",s)
with open(script_path,"w",encoding="utf-8") as f:f.write(s)

sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
sitemap+='  <url><loc>https://www.littlediscoveries.com.au/</loc><lastmod>2026-09-28</lastmod></url>\n'
for a in activities:
    sitemap+=f'  <url><loc>https://www.littlediscoveries.com.au/{a["seoSlug"]}/</loc><lastmod>2026-09-28</lastmod></url>\n'
sitemap+='</urlset>\n'
with open(os.path.join(SITE_DIR,"sitemap.xml"),"w",encoding="utf-8") as f:f.write(sitemap)

print(f"Synced {len(activities)} activities")
print("Original-source images:",sum(bool(a.get("imageUrl")) for a in activities))
