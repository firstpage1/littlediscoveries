#!/usr/bin/env python3
"""Standardise every published activity detail page to the LEGO Challenge design.

Runs against an existing checked-out gh-pages tree. Never overwrites images with
stock photos or invents event-specific prose. Pages that already match the
reference design are kept exactly as published.
"""
from bs4 import BeautifulSoup, NavigableString
from pathlib import Path
from copy import deepcopy
from datetime import datetime
from html import escape
import json, re, sys

site = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
reference = site / "lego-challenge-oct-2026" / "index.html"
assert reference.exists(), "Missing reference LEGO Challenge page"
base_html = reference.read_text(encoding="utf-8")
assert "class=\"container facts\"" in base_html and "Planning your visit" in base_html
data = json.loads((site / "activities.json").read_text(encoding="utf-8"))
by_slug = {a.get("seoSlug"): a for a in data if a.get("seoSlug")}
root = "https://www.littlediscoveries.com.au"
changed, already, errors = [], [], []

def pick(node, selector):
    return node.select_one(selector) if node else None

def txt(node, default=""):
    return node.get_text(" ", strip=True) if node else default

def copy_inner(dest, src):
    dest.clear()
    if src:
        for child in list(src.contents):
            dest.append(deepcopy(child))

def set_text(page, selector, value):
    node = page.select_one(selector)
    if not node:
        raise ValueError("Reference page missing " + selector)
    node.clear()
    node.append(str(value or ""))

def add_paragraph(page, parent, body):
    p = page.new_tag("p")
    p.string = body
    parent.append(p)
    return p

def info_values(old):
    d = {}
    for f in old.select(".facts .fact"):
        k = txt(pick(f, ".lab")).lower()
        value = txt(pick(f, ".val"))
        for needle, field in [("date","date"),("time","time"),("location","location"),
                              ("age","age"),("cost","cost")]:
            if needle in k and value: d[field] = value
    for card in old.select(".info-card"):
        k = txt(pick(card, ".info-card__label")).lower()
        value = txt(pick(card, ".info-card__value"))
        for needle, field in [("date","date"),("time","time"),("location","location"),
                              ("age","age"),("cost","cost"),("neighbourhood","area")]:
            if needle in k and value and field not in d: d[field] = value
    return d

def event_date(a, old_facts):
    if old_facts.get("date"): return old_facts["date"]
    begin, end = a.get("startDate") or "", a.get("endDate") or ""
    def display(iso):
        try: return datetime.strptime(iso, "%Y-%m-%d").strftime("%A %-d %B %Y")
        except (ValueError, TypeError): return ""
    left, right = display(begin), display(end)
    if left and right and begin != end: return left + " – " + right
    return left or right or "Check organiser"

def page_expiry(a, facts):
    end = a.get("endDate") or a.get("startDate") or ""
    if end and re.fullmatch(r"\d{4}-\d{2}-\d{2}",end): return end
    natural = facts.get("date","")
    candidates = re.findall(r"\b\d{1,2}\s+[A-Za-z]+\s+20\d{2}\b",natural)
    if candidates:
        try: return datetime.strptime(candidates[-1],"%d %B %Y").strftime("%Y-%m-%d")
        except ValueError: pass
    return "9999-12-31"

def text_or_empty(node):
    return txt(node) if node else ""

def tag_text(old, klass, index, fallback):
    existing = pick(old, ".tags .tag."+klass)
    if existing: return txt(existing)
    if klass == "none":
        tags=old.select(".tags .tag")
        return txt(tags[index]) if index < len(tags) else fallback
    return txt(pick(old, ".activity-meta .tag--"+klass)) or fallback

def replace_meta(page, old, slug, title, description, image):
    head = page.head
    set_text(page, "title", txt(pick(old, "head title"), title+" | Little Discoveries"))
    desc = pick(head,'meta[name="description"]')
    if desc: desc["content"] = (pick(old,'meta[name="description"]') or {}).get("content") or description
    canonical=pick(head,'link[rel="canonical"]')
    if canonical: canonical["href"] = root+"/"+slug+"/"
    # Retain existing social tags and structured data, when present.
    for orig in old.head.find_all(["meta","script","link"],recursive=False):
        if orig.name == "meta":
            key = orig.get("property") or orig.get("name")
            if not key or key in ("description","viewport","robots"): continue
            if not (key.startswith("og:") or key.startswith("twitter:") or key.startswith("geo.") or key=="ICBM"): continue
            prev=head.find("meta",attrs={"property":key}) or head.find("meta",attrs={"name":key})
            if prev: prev.replace_with(deepcopy(orig))
            else: head.append(deepcopy(orig))
        elif orig.name=="script" and orig.get("type")=="application/ld+json":
            head.append(deepcopy(orig))
    og=pick(head,'meta[property="og:image"]')
    if og and image:
        og["content"] = root+image if image.startswith("/") else image
    ogurl=pick(head,'meta[property="og:url"]')
    if ogurl: ogurl["content"]=root+"/"+slug+"/"

def transform(file):
    slug = file.parent.name
    a = by_slug.get(slug,{})
    old = BeautifulSoup(file.read_text(encoding="utf-8"), "html.parser")
    # The complete reference layout already has the required structure.
    if (pick(old, ".visual .pic") and pick(old, ".container.facts")
        and pick(old, ".article .box") and pick(old, ".article")
        and pick(old, ".bookbox") and pick(old, ".related .cards")
        and "Planning your visit" in txt(pick(old,".article"))):
        return "already"
    page = BeautifulSoup(base_html, "html.parser")
    facts = info_values(old)
    title = txt(pick(old,"h1"),a.get("title") or slug.replace("-"," ").title())
    desc = txt(pick(old, ".intro")) or txt(pick(old, ".activity-short-desc")) or a.get("description") or \
           (pick(old,'meta[name="description"]') or {}).get("content") or ""
    source_a = pick(old, ".bookbox a[href]") or pick(old, ".activity-cta a[href]") or \
               pick(old, ".image-credit a[href]")
    source = (source_a or {}).get("href") or a.get("source") or a.get("website") or ""
    if source and not re.match(r"^https?://", source): source=""
    image_node = pick(old, ".visual .pic img:not(.fallback)") or pick(old, ".pic img") or \
                 pick(old, ".activity-hero img")
    image = (image_node or {}).get("src") or a.get("imageUrl") or ""
    # If the verified image workflow has refreshed activities.json, prefer its verified source.
    if a.get("imageVerifiedFromSource") and a.get("imageUrl"):
        image = a["imageUrl"]
    region = (a.get("neighborhood") or facts.get("area") or
              tag_text(old, "area", 2, "Sydney"))
    category = (a.get("category") or tag_text(old, "category", 0, "Family activities"))
    age = facts.get("age") or ", ".join(a.get("age") or []) or tag_text(old,"age",1,"All ages")
    age = re.sub(r"^[^\w]+","",age)
    cost = facts.get("cost") or a.get("cost") or tag_text(old,"cost",3,"Check organiser")
    cost = re.sub(r"^[^\w$]+","",cost)
    venue = facts.get("location") or a.get("venue") or a.get("address") or "See official listing"
    time = facts.get("time") or a.get("time") or "Check organiser"
    date = event_date(a,facts)

    replace_meta(page,old,slug,title,desc,image)
    set_text(page, ".crumb", "Little Discoveries › Activities › "+title)
    crumb = pick(page,".crumb")
    crumb.clear()
    link=page.new_tag("a",href="/");link.string="Little Discoveries";crumb.append(link)
    crumb.append(NavigableString(" › Activities › "+title))
    set_text(page,"h1",title)
    set_text(page,".intro",desc)
    tags = page.select(".copy .tags .tag")
    assert len(tags) >= 5
    for i,value in [(1,category),(2,age),(3,region),(4,cost)]:
        tags[i].string=value
    visible_status=tags[0]
    visible_status["hidden"]=""
    visual=pick(page, ".visual .pic")
    image_tag = visual.find("img")
    if image:
        image_tag["src"]=image
        image_tag["alt"]=title
    else:
        image_tag["src"]="/images/email-image.png"
        image_tag["alt"]="Little Discoveries"
    credit=pick(page,".image-credit")
    credit.clear()
    existing_credit=txt(pick(old,".image-credit"))
    text_credit=existing_credit.split("Event source")[0].strip().rstrip(".") if existing_credit else ""
    if a.get("imageVerifiedFromSource"):
        text_credit="Original organiser image"
    elif not text_credit and image:
        text_credit="Image for illustration"
    credit.append(NavigableString((text_credit+". ") if text_credit else ""))
    if source:
        anchor=page.new_tag("a",href=source,target="_blank",rel="noopener noreferrer")
        anchor.string="Event source ↗"
        credit.append(anchor)

    val_nodes = page.select(".facts .val")
    assert len(val_nodes)==5
    for n,value in zip(val_nodes,[date,time,venue,age,cost]):
        n.string=value

    article = pick(page,".article")
    article.clear()
    previous = pick(old,".article")
    legacy_long = pick(old,".long-desc")
    if previous:
        copy_inner(article, previous)
    else:
        heading=page.new_tag("h2");heading.string="About this activity";article.append(heading)
        if legacy_long:
            long_copy=deepcopy(legacy_long)
            h2=long_copy.find("h2")
            if h2 and "about" in txt(h2).lower(): h2.decompose()
            # Preserve descriptive copy. Move the first original highlights list
            # into the standard "Why it's worth going" box below.
            highlights=long_copy.find("ul")
            bullets=[txt(li) for li in highlights.find_all("li",recursive=False)] if highlights else []
            if highlights: highlights.decompose()
            for child in list(long_copy.contents):
                article.append(deepcopy(child))
            if not article.find("p"):
                add_paragraph(page,article,desc)
            box=page.new_tag("div",attrs={"class":"box"})
            h3=page.new_tag("h3");h3.string="Why it’s worth going";box.append(h3)
            ul=page.new_tag("ul")
            for bullet in bullets[:12] or [desc]:
                li=page.new_tag("li");li.string=bullet;ul.append(li)
            box.append(ul);article.append(box)
        else:
            add_paragraph(page,article,desc)
    if not article.find("h2",string=lambda s: s and "About this activity" in s):
        heading=page.new_tag("h2");heading.string="About this activity"
        article.insert(0,heading)
    if not article.select_one(".box"):
        box=page.new_tag("div",attrs={"class":"box"})
        h3=page.new_tag("h3");h3.string="Why it’s worth going";box.append(h3)
        ul=page.new_tag("ul")
        li=page.new_tag("li");li.string=desc or "Find current details on the organiser’s page"
        ul.append(li);box.append(ul);article.append(box)
    if "Good to know" not in txt(article):
        h=page.new_tag("h2");h.string="Good to know";article.append(h)
        add_paragraph(page,article,"Check booking requirements, accessibility and any changes on the organiser's official listing before setting out.")
    if "Planning your visit" not in txt(article):
        h=page.new_tag("h2");h.string="Planning your visit";article.append(h)
        add_paragraph(page,article,"Check the organiser's official listing for the latest opening times, transport, accessibility and any booking requirements.")

    aside=pick(page,".aside .small")
    aside.clear()
    b=page.new_tag("b");b.string=region;aside.append(b)
    aside.append(page.new_tag("br"));aside.append(NavigableString(venue))
    aside.append(page.new_tag("br"));aside.append(page.new_tag("br"))
    b=page.new_tag("b");b.string=cost;aside.append(b)
    aside.append(page.new_tag("br"));aside.append(NavigableString(time))
    aside.append(page.new_tag("br"));aside.append(page.new_tag("br"))
    b=page.new_tag("b");b.string="Suitable for";aside.append(b)
    aside.append(page.new_tag("br"));aside.append(NavigableString(age))

    old_book = pick(old, ".bookbox") or pick(old, ".activity-cta")
    if old_book:
        old_h=pick(old_book, "h3");old_p=pick(old_book,"p")
        if old_h: set_text(page, ".bookbox h3",txt(old_h))
        if old_p: set_text(page, ".bookbox p",txt(old_p))
    button=pick(page,".bookbox a")
    if source: button["href"]=source
    else:
        button["href"]="/#activities"
        button.string="Explore activities →"
    if source_a and txt(source_a): button.string=txt(source_a)
    elif source: button.string="View official listing →"

    related=pick(page,".related .cards")
    related.clear()
    original_related=old.select(".related .cards a.card[href]")
    picks=[]
    for link in original_related:
        href=link.get("href","")
        target=href.strip("/").split("/")[0]
        if target != slug and (site/target/"index.html").exists():
            picks.append((target,txt(pick(link,"b")) or target.replace("-"," ").title(),
                          txt(pick(link,"span"))))
    if not picks:
        pool=[other for other in data if other.get("seoSlug") and other["seoSlug"]!=slug
              and (site/other["seoSlug"]/"index.html").exists()]
        pool.sort(key=lambda item:(item.get("neighborhood")!=region,
                                   item.get("category")!=category,
                                   item.get("endDate","9999") < "2026-10-15",
                                   item.get("title","")))
        picks=[(other["seoSlug"],other.get("title",""),(other.get("neighborhood") or "Sydney")+" · View activity →")
               for other in pool[:3]]
    for target,name,caption in picks[:3]:
        card=page.new_tag("a",attrs={"class":"card","href":"/"+target+"/"})
        item=by_slug.get(target,{})
        if item.get("endDate"): card["data-end"]=item["endDate"]
        b=page.new_tag("b");b.string=name;card.append(b)
        span=page.new_tag("span");span.string=caption or "View activity →";card.append(span)
        related.append(card)
    fallback=pick(page,"#related-fallback")
    if not picks: fallback.attrs.pop("hidden",None)

    # In the reference design the footer, mobile layout, fonts, navigation and
    # related-activity styling are copied unchanged from LEGO Challenge.
    expiry = page_expiry(a,facts)
    for script in page.find_all("script"):
        if not script.get("src") and 'const now=' in (script.string or ""):
            body=script.string or ""
            body=body.replace('now>"2026-10-15"', 'now>'+json.dumps(expiry))
            script.string=body
    # Only print changes when structural checks succeed.
    assert pick(page, ".visual .pic img")
    assert len(page.select(".facts .fact"))==5
    for needed in ("About this activity","Why it’s worth going","Good to know","Planning your visit"):
        assert needed in txt(article), (slug,needed)
    assert pick(page,".bookbox a") and pick(page,".related .cards")
    new_html=str(page)
    file.write_text(new_html,encoding="utf-8")
    return "changed"

for file in sorted(site.glob("*/index.html")):
    if file.parent.name=="v2-preview": continue
    try:
        result=transform(file)
        (already if result=="already" else changed).append(file.parent.name)
    except Exception as exc:
        errors.append({"slug":file.parent.name,"error":str(exc)})
        print("ERROR",file.parent.name,exc)
print(json.dumps({"total":len(changed)+len(already)+len(errors),
                  "unchangedMatchingReference":len(already),
                  "convertedToReferenceLayout":len(changed),
                  "errors":errors,
                  "convertedExamples":changed[:15]},indent=2,ensure_ascii=False))
if errors: sys.exit(1)
