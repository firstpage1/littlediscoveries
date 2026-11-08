#!/usr/bin/env python3
"""Read-only image discovery and verification for editorial review.
This produces evidence, NOT licences, approval or a verified_original flag.
"""
import argparse
import datetime
import html
import json
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.og = []
        self.title = ""
        self.in_title = False
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=="meta" and (attrs.get("property","").lower() in ("og:image","og:image:url","twitter:image") or attrs.get("name","").lower()=="twitter:image"):
            if attrs.get("content"):
                self.og.append(attrs["content"])
        if tag=="title":
            self.in_title=True
    def handle_endtag(self, tag):
        if tag=="title":self.in_title=False
    def handle_data(self, data):
        if self.in_title:self.title+=data

HEADERS={"User-Agent":"LittleDiscoveriesEditorialReview/1.0 (source image verification; contact site administrator)"}
MAX_BYTES=2_000_000

def fetch(url,max_bytes=MAX_BYTES):
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=10) as res:
        data=res.read(max_bytes+1)
        if len(data)>max_bytes:
            raise ValueError("response exceeds byte limit")
        return res.status, res.headers.get("Content-Type",""),data,res.geturl()

def inspect_one(e):
    result={"id":e["id"],"title":e["title"],"sourceUrl":e.get("sourceUrl"),"status":"not_verified","imageCandidates":[],"sourceTitle":None,"reasons":[],"rights":"requires human permission/rights assessment"}
    source=e.get("sourceUrl")
    if not source or urllib.parse.urlparse(source).scheme!="https":
        result["reasons"].append("missing or non-HTTPS source");return result
    try:
        status,typ,body,final=fetch(source)
        if "html" not in typ.lower():
            result["reasons"].append("source not HTML: "+typ);return result
        parser=MetaParser();parser.feed(body.decode("utf-8","replace"))
        result["sourceTitle"]=html.unescape(parser.title.strip())[:240]
        result["sourceFinalUrl"]=final
        if not parser.og:result["reasons"].append("no social-preview image meta found")
        seen=set()
        for raw in parser.og[:4]:
            image=urllib.parse.urljoin(final,html.unescape(raw))
            if image in seen:continue
            seen.add(image)
            note={"url":image,"status":"unverified","source":"organiser_html_meta","contentType":None}
            try:
                image_status,image_type,image_data,image_final=fetch(image,max_bytes=1_500_000)
                note.update(status="reachable_image" if image_type.lower().startswith("image/") else "not_image",contentType=image_type,bytesFetched=len(image_data),resolvedUrl=image_final)
            except Exception as exc:
                note.update(status="fetch_failed",error=str(exc)[:200])
            result["imageCandidates"].append(note)
        result["status"]="editorial_review_required" if any(x["status"]=="reachable_image" for x in result["imageCandidates"]) else "no_verified_image"
        result["reasons"].append("OG image is only a visual candidate; verify exact event/edition, reuse permission and card/hero rendering before approval.")
    except Exception as exc:
        result["status"]="source_fetch_failed"
        result["reasons"].append(str(exc)[:220])
    return result

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--candidates",required=True)
    ap.add_argument("--output",required=True)
    ap.add_argument("--limit",type=int,default=50)
    args=ap.parse_args()
    data=json.loads(pathlib.Path(args.candidates).read_text())
    results=[inspect_one(e) for e in data["candidates"][:args.limit]]
    out={"weekStart":data["weekStart"],"weekEnd":data["weekEnd"],"checkedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"purpose":"research-only; images not editorially approved","results":results,"summary":{}}
    for r in results:out["summary"][r["status"]]=out["summary"].get(r["status"],0)+1
    dest=pathlib.Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(out,indent=2,ensure_ascii=False))
    print(json.dumps(out["summary"],indent=2))
    return 0

if __name__=="__main__":raise SystemExit(main())
