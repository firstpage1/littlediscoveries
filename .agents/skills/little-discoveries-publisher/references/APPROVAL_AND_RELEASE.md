# Approval and release protocol

## Approval gate (highest priority)

All **new events, new Editor's Choice choices and material event changes** require specific prior editorial approval. An agent recommendation, a past week's approval, a workbook row or a finished draft is **not** approval. An approval is scoped to identifiable event IDs and proposed facts. Do not infer approval from the existence of data in a repository.

Approval commands:
- **“Approve [IDs/names]”**: approve only the specified prepared candidate records for the named week/batch.
- **“Approve all”**: approve the specific batch that was just presented clearly in context, not unknown discoveries or earlier batches.
- **“These are my six Editor's Choice”**: set only those exact approved events and their order. “Recommend six” is not authorization to select them on the user's behalf.
- **“Publish now”**: advance only already-approved items, immediately, after verification of scope. No extra confirmation is necessary for an unambiguous approved batch.
- **“Approve all and publish now”**: authorizes approval and immediate publication of the clearly identified batch, including only user-approved Editor's Choice choices.
- **“Fix broken images”**: permission to audit/prepare changes; publishing changes requires approval unless they are completing an already-approved release or the user has explicitly authorized deploying those specific fixes.

Track candidate IDs, title, target week, source URL, verified facts and image details in a stable review/approval manifest or equivalent review-state record. The manifest should distinguish review decision, publication authorization, schedule, selected Editor's Choice, approval timestamp, changed fields and approval provenance. If there is no reliable record of approval, stop and ask only about the ambiguous items; do not publish them.

A material alteration to event identity, date, location, admission price, eligibility or choice of image after approval requires re-review if it changes what the user approved. Non-material typo/format fixes are safe within approved release scope.

## Preserve scheduled-publication requirement

The existing product specification requires candidates prepared Sunday, then release approved next-week events **Monday 01:00 in Australia/Sydney**; no Sunday preview leaks to the public. Immediate publication is an explicit user override, not the default. Validate local Sydney clock times and daylight saving, and inspect whether the trigger is timezone-aware in practice. Do not claim an accurate 01:00 run solely because a GitHub cron expression says so.

Preconditions before publishing:
1. Verify target repository, current source/default branch and actual GitHub Pages branch or deployment pipeline.
2. Check that all candidate IDs and content modifications are approved and that the chosen Editor's Choice IDs are approved too.
3. Verify proposed dates, start and end times, price, ages and primary-source links are still current; hold changed or cancelled items.
4. Verify full branded detail pages exist, with real imagery/attribution, and that no placeholder/weak content slips through.
5. Validate JSON schema and field names; preserve source-of-truth data. Confirm homepage, card, detail page, expiry, sitemap, metadata and Editor's Choice all derive from the same approved release.
6. Inspect git diff and ensure nothing unrelated is modified or removed. Avoid concurrent automation race conditions.
7. Stage/build and run automated tests. Publish to the verified actual production branch only after all gates pass.

## Existing repository facts (verify before each release)

Repository: `firstpage1/littlediscoveries`.
At the time of writing, the default/source branch was `claude/create-website-YTnOF`; pages are also stored in `gh-pages`. The old script `script.js` had a hard-coded `/nov-2026-approved.json?v=20261102-fix-2` fetch and a strict 40-item count. Recheck actual production deployment before changing any branch. Do **not** assume pushing the default branch publishes live pages.

The repository already has `.github/workflows/repair-images-fast.yml`, `source-images.yml`, `standardise-detail-pages.yml` and `verify-event-images.yml`, plus supporting scripts. Inspect them to avoid inadvertent broad rewrites, inter-workflow dependencies, stale hard-coded run IDs and conflicting pushes to gh-pages.

## Data lifecycle and release

Preferred statuses: `candidate`, `approved`, `rejected`, `published`, `expired`. Track `discoveredAt`, `lastVerifiedAt`, `publishAt`, `startDate`, `endDate`, `expiredAt`, approval and source.

A future improvement specified in the product plan is GitHub-stored content in `content/next`, `content/current`, `content/archive`, and `content/sources`. This is a **proposal**: do not assume these paths exist. Work with the current implementation until a migration is separately authorised and tested.

Publishing must be idempotent and avoid accidental duplication. Archive prior-week data; remove expired events from active filters and Editor's Choice; keep valuable expired detail URLs with ended labels and links to current events, not misleading future dates or booking calls. Generate/update navigation, related cards, sitemap and structured data as applicable. Never erase the site's historical records just to reduce the current list.

Where no complete six-item Editor's Choice selection has been approved, do not silently generate or activate six choices: ask for the missing editorial decision, or hold that portion of release with an accurate status.

## Failure, rollback, reporting

A commit, successful CI status or returned 200 from an unrelated source does not equal a successful public release. Run post-publish production checks. If a deployment fails, retry scoped, safe and idempotent steps; avoid endless retries and overwrite conflicts. Preserve old working release where possible. If the live site is broken after release, roll back only if the user has authorised operational rollback or rollback is required to restore a previously approved state without publishing new editorial content. Otherwise report the blocker with precise URLs and observed errors.

Report **candidate count / approved count / published count / held count**, the actual six Editor's Choice selections, production link, verified details, image checks, filter results and outstanding problems. Use “prepared”, “committed”, “deployed” and “verified live” accurately; never conflate them.
