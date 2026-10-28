# Verification notes

## Local API and database checks

The local private-account upgrade passes 27 scenarios: the original 14 workflow scenarios now run with authenticated sessions, three hosting scenarios remain in place, and 10 new account/security scenarios test password hashing, session rotation/revocation/expiry, protected endpoints, cross-user isolation, independent counters/duplicates, unowned legacy data, origin enforcement, rate limits, Secure cookies, and private database configuration. Account evidence is in `evidence/accounts.json`.

`npm test` uses Node's test runner, Supertest, and isolated MongoDB 8.2.6. The 14 scenarios cover:

1. Generated ID, initial status/history, and seven-day follow-up.
2. Case-insensitive active duplicates and simultaneous duplicate submissions.
3. Increasing independent company counters and shared-prefix collisions.
4. Future/impossible dates, salary/type validation, and protected client fields.
5. Backend company/status queries, literal regex input, and zero-count statuses.
6. Overdue date calculation, month changes, and leap-day arithmetic.
7. Every permitted workflow branch and locked final states.
8. Skipped/repeated/reverse transitions and forged timestamps.
9. Deletion restrictions in Interview/Offer and permitted final/Applied deletion.
10. Editable fields versus immutable date/ID/history/status.
11. Duplicate prevention during edits and reapplication after finalization.
12. Overdue removal outside Applied and non-overdue behaviour on the follow-up date itself.
13. Concurrent status changes with a valid, complete history.
14. Malformed/missing IDs, malformed JSON, and exhausted three-digit counters.

The generated `evidence/api.json` records the successful named scenarios and timestamp. A failed run does not mark itself complete.

## Browser checks

`npm run build` then `npm run test:ui` serves the real production client through Express with an isolated test database. Fifteen browser scenarios verify registration, sign-in, logout, session refresh, two-account dashboard separation, known cross-user ID rejection, independent same-company applications, all original workflows, and responsive layouts. The suite captures ten screens (including desktop/mobile login and registration) and runs selected axe WCAG checks.

No uncaught browser errors were observed in the successful run. Automated accessibility checks do not replace keyboard/screen-reader evaluation across all browsers. The simulated error/retry test intercepts a local API response and does not claim a real service outage.

## Source Atlas evidence and pending private-account verification

The normal application requires an actual `mongodb+srv` URI. It has no in-memory or browser-storage fallback. Isolated tests do not prove Atlas connectivity.

The [original Atlas result](evidence/atlas.json) records the pre-login exam version and must not be treated as proof of the new private-account upgrade. That database account was intentionally public, so the account-enabled server rejects it and requires a new private user/database.

The updated `npm run verify:atlas` registers a temporary private account, tests its frontend workflow against the private Atlas database, then removes only that account's sessions, counters, and applications. It writes `evidence/private-atlas.json` only after success. This verification has not been run yet because private database settings have not been supplied. No live production account or record was modified during the local implementation.

Fresh evaluator machines still need network access permitted by the Atlas project. The standard app startup waits for Atlas connection and index preparation before accepting requests.

## Issues addressed while building

- Decorative artwork could intercept a navigation click; decorative elements now ignore pointer events.
- Low-contrast secondary copy/badges were darkened and rescanned on desktop/mobile screens.
- Search input follows only the applied company query, so an unrelated filter does not overwrite draft text.
- Optional native dependency entries are retained in the lockfile for Windows and Linux installs.

## Environment and scope

The original assessment remains a single-seeker tracker. Only the hosting copy is extended with private accounts. File uploads, email reminders, password reset, email verification, and external job scraping remain out of scope. There is no claim of a measured plagiarism percentage or production-load performance. This hosting repository uses ignored local environment files and provider-managed settings.

## Historical hosted deployment smoke check

Live application: https://nextstep-journal.onrender.com

Eight live checks passed for the pre-login deployment, recorded in [evidence/hosted.json](evidence/hosted.json). These are historical results. The account upgrade is published for review on `feature/private-journals`, with private Atlas configuration and deployment approval still pending. It is not live yet.
