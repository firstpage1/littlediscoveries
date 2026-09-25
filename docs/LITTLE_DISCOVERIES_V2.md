# Little Discoveries v2

## Locked product decisions

Little Discoveries remains database-free. GitHub is the source of truth and the current static-site architecture is retained unless a later change has a clear benefit.

### Weekly operating model
- Discover and re-check Sydney activities every Sunday.
- Produce approximately 50 high-quality candidates for the coming Monday-Sunday.
- Free events are strongly preferred; recommend no more than 2 paid activities by default.
- User reviews candidates using Approve / Edit / Reject.
- User manually selects exactly 6 Editor's Choice activities.
- Approval on Sunday does not publish an activity.
- Approved next-week content becomes public at 01:00 Monday in Australia/Sydney.
- Previous-week content is removed from current discovery and handled as archive/expired content.

### Coverage engine
Coverage and editorial quality are separate systems.

Coverage exists so parents do not select an age group and broad area and receive an empty result.

Canonical broad areas use stable IDs internally and human labels in the UI.

- Eastern Suburbs
- Inner West
- City Center/CBD
- South Sydney
- Western Sydney
- Lower North Shore
- Upper North Shore
- Northern Beaches
- Online

Do not optimise for every suburb or micro-area. Eastern Suburbs, Inner West and City Center/CBD may receive additional depth.

Online is capped at 2 published recommendations per week and should include only unusually strong options.

Canonical age groups:
- Babies (0–1)
- Toddlers (2–3)
- Pre-schoolers (3–5)
- School Kids (5–13)
- Teens (13–16)
- Young Adults (16–18)
- Adults (18+)
- All Ages

Adults (18+) is primarily a suitability indicator; do not proactively search for adult-only activities. Young Adults (16–18) may be included when strong but do not require neighbourhood-by-neighbourhood coverage. All Ages is a suitability label and contributes to relevant child/teen coverage rather than creating a separate coverage quota.

A single activity may cover multiple age groups. Content files store stable IDs (`eastern-suburbs`, `preschool`) rather than presentation labels.

The coverage engine should:
1. Build an area x age matrix only for proactive coverage-target age bands (Babies through Teens).
2. Count current or approved activities in each cell.
3. Flag empty cells as red, thin cells as amber, healthy cells as green.
4. Boost high-quality candidates that fill coverage gaps.
5. Never recommend a poor-quality event solely to fill a gap.

### Editorial engine
The editorial engine ranks candidates for:
- child appeal
- uniqueness
- value
- source reliability
- recency
- geographic usefulness
- age usefulness

It may suggest strong candidates, but the 6 Editor's Choice activities remain a manual editorial decision.

### Event lifecycle
Statuses:
- candidate
- approved
- rejected
- published
- expired

Approving a Sunday candidate changes its status only. Public visibility also requires publishAt <= current time.

### Current-week vs archive
Expired activities:
- never appear in current weekly filters;
- may retain their stable individual URL for SEO where useful;
- clearly state that the event has ended;
- link to current alternatives by area, age and/or category;
- must not carry misleading future Event structured data.

Low-value one-off expired pages can later be removed or redirected.

### Evergreen future feature
A separate future content layer may cover playgrounds, permanent free attractions and similar evergreen places.

Museums remain part of weekly discovery when they run special children's activities.

## Current repo audit

The existing site is a pure static GitHub Pages site:
- index.html
- script.js
- styles.css
- activities.json
- one directory/index.html per activity
- CNAME for www.littlediscoveries.com.au

There is no database or application framework.

At audit time activities.json contained 116 records:
- 57 active
- 59 expired
- 110 free
- 6 paid

Existing data contains inconsistent taxonomy that v2 should normalise before coverage calculations. Examples include locality names stored as neighbourhood values and multiple variants of the same age band.

## v2 content storage

Recommended structure:

content/
  current/
    activities.json
  next/
    candidates.json
  archive/
    YYYY-MM-DD.json
  sources/
    trusted-sources.json

The current activities.json can remain in place until the new loader is ready.

## Admin workflow

Private admin UI should show:
- week being curated
- total / approved / rejected / remaining counts
- Editor's Choice count
- area x age coverage matrix
- approximately 50 candidate cards

Each candidate card should show:
- title
- source and source URL
- image/reference image
- area and locality
- age groups
- dates / days / time
- category
- free/paid
- recommendation rationale
- coverage gaps filled
- last verification time

Actions:
- Approve
- Edit
- Reject
- Toggle Editor's Choice for approved activities

## Publishing
A scheduled GitHub workflow should publish approved next-week records at Monday 01:00 Australia/Sydney, validate content before promotion, archive the previous week, and fail safely if validation fails.

## SEO
Current activity pages should use stable slugs, canonical URLs, accurate metadata and Event structured data when applicable.

Evergreen landing pages should be added for high-value queries such as:
- free kids activities Sydney
- Eastern Suburbs kids activities
- Inner West kids activities
- Sydney CBD kids activities
- kids activities by age

## Technical principles
- no database initially
- no secrets in browser code
- GitHub remains source of truth
- static generation where practical
- preserve Little Discoveries brand
- mobile-first
- schema-validate content
- optimise for simple weekly curation rather than maximum listing volume
