# Detail-page structure and visual standard

## Authoritative existing examples

Use these files on the **published gh-pages branch**, checked against the live website:
- `lego-challenge-oct-2026/index.html` — existing reference layout used by the repository's standardise-detail-pages script.
- `little-chef-darling-quarter-2026/index.html` — another complete example of the same layout.

Prefer keeping compliant pages unchanged. The objective is consistency, **not** a new design. Existing brand: Nunito, warm ivory #FFF9F5 background, dark #1C1C2E copy, Little Discoveries pink #f94d85, soft pastel tags, friendly rounded cards and real logo/mascot images. Preserve brand assets, footer, analytics when already in the reference, accessible focus styles and mobile responsiveness. Do not substitute unrelated blue/teal minimal templates, default system fonts or generic single-column event stubs.

## Required page anatomy, top to bottom

1. **Navigation** with real Little Discoveries logo linking to `/`, and obvious “All activities” link to `/#activities`.
2. **Breadcrumb**: Little Discoveries › Activities › Event title.
3. **Hero two-column layout** on desktop, stacked on mobile:
   - Clear category/precise age/area/cost tags, approved Editor's Choice treatment where applicable, an expired status label when applicable.
   - Specific H1 title and engaging, concise, distinctive introduction explaining why it is interesting.
   - Large, crisp, relevant **real organiser event image** (4:3-style hero) with alt text, verified URL and attribution/link to the actual source. Do not hide a broken image as if image verification succeeded.
4. **Five-item facts strip**: date (human readable, 2026 year where necessary), time, location, age, cost; fully researched. Add a clear booking note/condition within body and call-to-action.
5. **Main content and aside**:
   - “About this activity”: original, substantive and fact-checked description of what families actually do.
   - “Why it's worth going”: useful highlights tied to the specific event, preferably three or more; do not manufacture benefits.
   - “Good to know”: booking/limited capacity, cost exceptions, ages, supervision, weather and practical restrictions if supported.
   - “Planning your visit”: researched venue, arrival/transport/access where available, what to bring if useful, exact sessions and booking conditions.
   - “At a glance” sidebar with the existing Little Discoveries mascot, event-specific quick details and useful age/area/price summary.
6. **Ready to book?**: prominent real organiser/event/registration button, not a generic homepage or broken URL. Never represent an external link as a confirmed seat.
7. **You may also like**: ideally three verified, *current or future* events related by area, age or category. Never recommend already ended events as current; when no quality match exists, link to current homepage listings.
8. **Footer** using existing brand styles and homepage link.

Existing target CSS structure includes `.nav`, `.hero`, `.grid`, `.copy .tags`, `.visual .pic`, `.image-credit`, `.container.facts`, `.content .cols`, `.article .box`, `.aside`, `.bookbox`, `.related .cards`, `.footer`. The repository's `.github/scripts/standardize_details.py` may be useful as a starting point but **inspect it before use**; it can preserve generic content and must not be trusted to create proper editorial copy or accurate event imagery.

## Image selection and repair

1. Search original primary event listing and organiser-owned assets for the **exact event and edition**. Preserve credits and check permission/reuse constraints.
2. Verify the direct image asset loads, is an image, has useful resolution, is relevant to the described event, and does not redirect to an error/stock placeholder.
3. If exact original cannot be sourced, prefer clearly relevant image of the same organiser/programme with accurate “related image” labelling. Only use a suitable illustrative substitute when genuinely necessary, visible as such to the editor, and allowed by the approved selection. Never silently claim a substitute is the actual event photo.
4. Do not copy third-party licensed images without an appropriate right to use. Where local hosting is permitted, locally host approved images with useful filenames and attribution to reduce hotlink failures.
5. Verify final **thumbnail, hero, social preview**, and any optional gallery are aligned; test mobile cropping and real image rendering. For bulk repairs, work in batches of five and keep already-correct pictures.
6. If no acceptable image can be verified, hold the candidate for editorial resolution; do not mark it production-ready.

## Required content and metadata consistency

A single canonical approved record must drive homepage card, full page, six Editor's Choice flags and order, sitemap, expiry, structured data and metadata. Do not allow the title, date, cost or status to diverge across surfaces.

- Stable, readable SEO slug, page title and distinctive meta description; correct canonical URL.
- Open Graph/social title, description and actual verified image; no unrelated generic stock OG image for a featured event.
- Accurate `Event` JSON-LD (event date/time, local timezone, venue, organiser, genuinely free price only if verified, status); avoid misleading offers/availability.
- Correct breadcrumb and links back to homepage.
- Appropriate responsive, keyboard-accessible headings and buttons; avoid horizontal scrolling.
- Preserve source image credit, true organiser URL and relevant booking link.

## Expired page behaviour

Remove ended events from homepage discovery and live filters, remove expired Editor's Choice flags, and stop recommending them as current. For worthwhile SEO pages, retain the URL with an obvious **This event has ended** state and prominent links to **current** relevant events. Remove or update misleading future-event structured data, booking prompts and stale related cards. Low-value expired content may be retired only within approved scope.

## Anti-patterns explicitly disallowed

- A three-paragraph detail page that differs from the LEGO Challenge template.
- Placeholder text such as “Visit the organiser's page to confirm times, age suitability and booking.”
- Stock hero images silently substituted for original organiser photography.
- An image that fails and disappears without a visible fallback/status.
- Details or Editor's Choice that are inconsistent with the current weekly release.
- Rebuilding every historical detail page as part of one new-event publication.
