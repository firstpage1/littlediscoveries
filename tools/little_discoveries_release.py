#!/usr/bin/env python3
"""Approval-gated Little Discoveries staging publisher. Never deploys by itself."""
import argparse
import copy
import json
import pathlib
import re
import sys
from datetime import date
from html import escape
from urllib.parse import urlparse

REQUIRED = ("id", "title", "startDate", "endDate", "time", "venue", "sourceUrl", "cost", "ageSource", "imageUrl")
BAD = re.compile(r"(see organiser|confirm|check booking|tbc|time not established|requires .*confirmation|pending)", re.I)

def check_event(event, week_start, week_end):
    errors = []
    for field in REQUIRED:
        if not isinstance(event.get(field), str) or not event[field].strip():
            errors.append(f"{field}: missing")
    if errors:
        return errors
    if event.get("imageStatus") != "verified_original":
        errors.append("imageStatus: original image has not passed verification")
    if not event.get("imageAttribution"):
        errors.append("imageAttribution: missing")
    if not event.get("imageCheckedAt"):
        errors.append("imageCheckedAt: missing")
    if not event.get("sourceVerifiedAt"):
        errors.append("sourceVerifiedAt: missing")
    if BAD.search(" ".join(str(event.get(x, "")) for x in ("time", "cost", "ageSource"))):
        errors.append("uncertain critical facts")
    cost = event["cost"].strip().lower()
    if not cost.startswith("free"):
        errors.append("free-only policy: cost not confirmed free")
    for field in ("startDate", "endDate"):
        try:
            d = date.fromisoformat(event[field])
            if not (week_start <= d <= week_end):
                errors.append(f"{field}: not within target week")
        except (ValueError, TypeError):
            errors.append(f"{field}: malformed date")
    if event.get("startDate", "") > event.get("endDate", ""):
        errors.append("startDate > endDate")
    for field in ("sourceUrl", "imageUrl"):
        url = urlparse(event[field])
        if url.scheme != "https" or not url.netloc:
            errors.append(f"{field}: expected https URL")
    if not event.get("imageReuseAllowed"):
        errors.append("imageReuseAllowed: absent/false")
    if not event.get("proposedAgeGroups"):
        errors.append("age mapping not verified")
    if event.get("publicStatus") == "published":
        errors.append("test input marked already published")
    return errors

def validate(data, approval):
    errors = []
    if data.get("weekStart") != approval.get("weekStart") or data.get("weekEnd") != approval.get("weekEnd"):
        errors.append("approval week does not match candidate week")
    try:
        start = date.fromisoformat(data["weekStart"])
        end = date.fromisoformat(data["weekEnd"])
        if (end-start).days != 6 or start.weekday() != 0:
            errors.append("week must be Monday through Sunday")
    except (ValueError, KeyError):
        return ["malformed target week"], []
    candidates = data.get("candidates", [])
    ids = [e.get("id") for e in candidates]
    if len(set(ids)) != len(ids):
        errors.append("duplicate candidate IDs")
    by_id = {e.get("id"): e for e in candidates}
    approved = approval.get("approvedEventIds", [])
    featured = approval.get("approvedEditorsChoiceIds", [])
    if not isinstance(approved, list) or not isinstance(featured, list):
        return ["approval IDs must be arrays"], []
    if len(approved) != len(set(approved)):
        errors.append("duplicate approvals")
    if not approved:
        errors.append("no explicitly approved events")
    if approval.get("status") != "approved_by_editor" or not approval.get("editorApprovalReference"):
        errors.append("editor approval evidence missing")
    if set(approved) - set(ids):
        errors.append("approval references unknown IDs")
    if len(featured) != 6 or len(set(featured)) != 6:
        errors.append("exactly six distinct Editor's Choice selections required")
    if not set(featured).issubset(set(approved)):
        errors.append("Editor's Choice must be subset of approved events")
    clean = []
    for id in approved:
        event = by_id.get(id)
        if not event:
            continue
        problems = check_event(event, start, end)
        if problems:
            errors += [f"{id}: {p}" for p in problems]
        else:
            clean.append(event)
    return errors, clean

def render(event):
    title = escape(event["title"])
    desc = escape(event.get("description") or event.get("editorialHighlights") or "")
    image = escape(event["imageUrl"], quote=True)
    source = escape(event["sourceUrl"], quote=True)
    facts = " · ".join(escape(str(event[k])) for k in ("startDate", "time", "venue", "ageSource", "cost"))
    return f"""<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | Little Discoveries TEST</title></head><body><header><a href="/">Little Discoveries</a></header><main><strong>DRAFT ISOLATED STAGING. NOT LIVE.</strong><h1>{title}</h1><img src="{image}" alt="{title}"><p>{escape(event['imageAttribution'])}</p><p>{desc}</p><p>{facts}</p><p><a href="{source}">Original event listing</a></p></main></body></html>"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidates", required=True)
    ap.add_argument("--approval", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    data = json.loads(pathlib.Path(args.candidates).read_text())
    approval = json.loads(pathlib.Path(args.approval).read_text())
    errors, clean = validate(data, approval)
    dest = pathlib.Path(args.output)
    dest.mkdir(parents=True, exist_ok=True)
    report = {"pass": not errors, "productionChanged": False, "deploymentPerformed": False, "candidates": len(data.get("candidates", [])), "approved": len(approval.get("approvedEventIds", [])), "ready": len(clean), "errors": errors, "mode": "isolated_staging_only"}
    (dest/"validation-report.json").write_text(json.dumps(report, indent=2))
    if errors:
        print(json.dumps(report, indent=2))
        return 2
    for event in clean:
        item = dest/"events"/event["id"]
        item.mkdir(parents=True, exist_ok=True)
        (item/"index.html").write_text(render(event))
    (dest/"release-manifest.json").write_text(json.dumps({"events":[e["id"] for e in clean], "editorsChoice":approval["approvedEditorsChoiceIds"],"stagingOnly":True},indent=2))
    print(json.dumps(report, indent=2))
    return 0

if __name__ == "__main__":
    sys.exit(main())
