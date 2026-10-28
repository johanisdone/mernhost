# Design decisions

## Product and screens

NextStep gives each signed-in account a separate application journal. The overview is a wide workspace with an editorial heading, six account-scoped status totals, a backend-filtered application list, and an overdue cue. Application details show the original applied date, backend-provided next statuses, and a timestamped timeline. Separate create/edit screens keep invalid mutation paths out of normal interaction. Small screens replace table rows with stacked cards.

## Calendar dates

Applied Date and Follow-up Date are stored as ISO `YYYY-MM-DD` calendar strings to avoid timezone shifts. The application uses the `Asia/Kolkata` calendar by default. The server provides its current calendar date to the frontend; both reject future Applied Dates. Follow-up is seven calendar days later. `isOverdue` is computed on every response: status is Applied and today's date is later than the follow-up date. The follow-up date itself is not yet overdue.

## Identifiers

Company names are trimmed and repeated spaces collapsed. A lowercase company key identifies the counter; a separate lowercase role key supports duplicate detection. ID prefixes take the first three alphabetic letters in the company name, in uppercase. Names must contain at least three alphabetic letters so the required three-letter prefix is well-defined.

MongoDB atomically increments an owner-and-company counter. Application IDs have a unique owner+ID index. When two companies in the same user's journal share a prefix, allocation retries the requesting company's sequence to avoid returning identical IDs for that owner. Different owners can independently receive `JA-INF-001`. Sequences increase but may contain gaps after conflicting/failed insertions; they are not promised to be contiguous. Values beyond 999 return a clear conflict, keeping the specified three-digit format. Editing a company never changes the previously issued ID. API routes use MongoDB `_id` with an ownership condition.

## Duplicates and concurrency

A compound unique index on owner + company key + role key applies only to documents with `isActive: true`. Applied, Interview, and Offer are active; Rejected, Accepted, and Declined are final. Only the server controls the owner and active flag. The index protects concurrent creation/editing in addition to a useful pre-check. Edits and status transitions include the owner and a document version in conditional updates; stale updates return 409 rather than losing history or overwriting a concurrent change. Deletes similarly include owner, version, and permitted status.

## Account privacy

Registration hashes passwords with bcrypt (cost 12). The browser receives a cryptographically random 32-byte opaque token in an HttpOnly cookie; MongoDB stores only its SHA-256 digest and expiry. Each request checks both session expiry and account existence. Logout removes the current session, so replaying that cookie no longer authenticates. Browser mutations enforce the configured origin; login/signup attempts are rate limited.

Every private lookup, list, count, overdue count, status change, edit, and delete is scoped server-side to the authenticated account. Public body/query parameters cannot select another owner. New private collections avoid the original shared collection's indexes and prevent implicit claiming of legacy records. Startup requires a separate private database/user and rejects the published exam configuration. No shared data is assigned or deleted during this change.

## Request contract

Every API response is `{ success, message, data }`. Expected errors use 400 (validation/invalid transition), 404 (missing record), or 409 (active duplicate, sequence exhaustion, or concurrent change). Create returns 201; read/update/delete returns 200. Unexpected failures use a safe 500 response. Clients cannot set IDs, history, follow-up dates, active flags, or initial status. Applied Date and Application ID cannot be edited.

## Evidence and version history

Milestone commits record actual work as it is completed; commit times are not altered. Local isolated-database checks are labelled separately from MongoDB Atlas verification. Real screenshots are captured from the completed client. No similarity percentage is invented, and superficial renaming is not used to disguise copied material.
