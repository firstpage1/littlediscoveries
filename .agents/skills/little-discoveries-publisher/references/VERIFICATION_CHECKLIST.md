# Verification checklist and production acceptance

Run this checklist against the **actual public site** `https://www.littlediscoveries.com.au/` after any approved release. A static file, GitHub commit or working staging preview is not proof of production success.

## Editorial, factual and coverage gates (before publication)

- [ ] Every candidate's exact original primary event page is identified and the linked event occurs in the release week.
- [ ] No duplicated or cancelled event; dated sessions and recurrence correctly distinguished.
- [ ] Dates, time, location, price, booking and age specifics verified; no “See organiser”, “Check booking details” or other placeholder values in production.
- [ ] Free-only default enforced; any paid exception explicitly approved.
- [ ] Each record has distinctive editorial copy and useful highlights; no repeated generic prose.
- [ ] Area × age coverage examined, with Eastern Suburbs priority, balanced Sydney coverage and at most two exceptional online events.
- [ ] Approval manifest covers each release event and **all** selected Editor's Choice titles; no unapproved item sneaks through.
- [ ] Original or correctly labelled, permitted alternative images verified as real usable assets.
- [ ] Detail pages conform to the existing LEGO Challenge/Little Chef visual template and link correctly to source and homepage.

## Code/data QA before release

- [ ] Use a canonical approved event record across homepage listing, full detail page, Editor's Choice, expiry and SEO.
- [ ] Validate JSON syntax/schema, required field formats, actual week boundaries and Sydney timezone.
- [ ] No hard-coded old week's filename, exact record count or fixed 2026 dates can break new releases.
- [ ] A current-day event is visible until its event end time when known, not removed prematurely based on a naive day comparison.
- [ ] No expired event is shown as current and no “All Ages” blanket mapping fakes actual suitability.
- [ ] No unrelated source, styles, homepage components, historical pages, logo, mascot, form or analytics modified.
- [ ] Images have attribution, meaningful alt text, adequate size, appropriate rights and valid paths.
- [ ] Detail pages have correct title, description, canonical, Event JSON-LD, OG image and current related events.
- [ ] Relevant automated tests/build complete successfully; inspect diff before deploy.

## Actual production checks (must be performed after deployment)

1. **Homepage and current release:** load the public homepage with cache bypass where possible; confirm the correct Sydney week, correct count and all approved event cards. Test a user-visible browser, not only a JSON URL.
2. **Six Editor's Choice:** ensure the precise user-approved six are present in correct rank, with no leftover expired picks. Verify title, correct photo, card and live detail URL.
3. **Details:** click every newly published event card and open its actual production URL; confirm full layout, all facts, source/book button, breadcrumb, footer, “You may also like” and back-to-list. Do not settle for checking 1–2 sample pages.
4. **Images:** verify each new card thumbnail and detail hero loads, displays correct event imagery and sensible crop on desktop/mobile; check attribution and broken-image fallback. Verify social image if practical.
5. **Filters:** test age, geographic region and every weekday/date control, combinations of multiple selected days and clear/reset. Confirm newly added events display under the right choices and don't disappear because of mismatched area/age strings. Test no-results state accurately.
6. **Expiry:** ensure ended activities are absent from active results, stale Editor's Choice is gone, and retained expired pages show clear “ended” messaging and useful links to current events.
7. **SEO/accessibility:** review page metadata, sitemap, robots, JSON-LD, canonical URLs, accessible image descriptions, keyboard link focus, mobile overflow and legible text.
8. **Published/source branch alignment:** compare production HTML/content version with the approved release; account for CDN/browser caching; do not claim verified live if changes exist only in git.

## Reporting and failure protocol

Separate **observed success** from **not tested** and **failed**. Never substitute assumed deployment success for test evidence. Return:
- Target week and release identifier; approval basis.
- Number discovered, approved, rejected/held, actually verified live.
- Exactly which six Editor's Choice events were approved/live (or explicit blocked status).
- Production URLs or representative links; any failed URLs.
- Thumbnail/hero and filters pass/fail with details.
- Expiry check, related links, and whether older week has cleared.
- Errors, bounded retries and pending manual decisions.

A run is **NOT COMPLETE** until all mandatory live checks pass. If tools cannot browse or access the live site, say “committed/deployed but not live-verified”, explain what verification is missing, and do not call it complete.
