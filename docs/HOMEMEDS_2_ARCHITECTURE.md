# Home-Meds 2.0 — Architecture Blueprint

## Goals
- A simple family medication companion, not a medical-record system.
- Local-first operation: core functions work offline.
- Household sharing across devices, with near-real-time updates when connected.
- Auditable dose acknowledgements and stock movements.
- Privacy-first household access and least-privilege roles.
- Build and test the new version on a separate branch; retain the current app as fallback.

## Recommended stack
- Android client: Capacitor (retain the existing wrapper and CI initially).
- UI: modular web UI; separate screens, components, state and services rather than one monolithic page.
- Local data: IndexedDB for the first implementation, behind a repository abstraction so a future SQLite migration is possible.
- Cloud: Supabase Auth, PostgreSQL, Realtime and server-side functions.
- Sync: queued local mutations with idempotent IDs, retry and reconciliation.
- Notifications: Capacitor Local Notifications for local reminders; cloud-triggered delivery for caregiver/household nudges.

## Core entities
### households
- id (UUID), name, created_by, created_at

### household_memberships
- id, household_id, user_id, role (admin/caregiver/member), status, invited_by, created_at
- RLS limits access to household membership and permitted member profiles.

### family_profiles
- id, household_id, display_name, optional avatar, timezone, created_at, archived_at
- Profiles are not necessarily login accounts.

### medicines
- id, household_id, family_profile_id, name, strength, form, instructions, purpose, doctor, storage, notes, photo metadata, active/archive status, created_at, updated_at, created_by

### schedules
- id, medicine_id, schedule_type (scheduled/PRN), timezone, start_date, end_date, dose_amount, dose_unit, optional schedule rules
- For scheduled medication, represent multiple daily times as separate schedule entries/rules; avoid a hard three-slot limit.
- PRN medications are not assigned fixed daily dose times.

### dose_events
- id, household_id, medicine_id, family_profile_id, schedule_id (nullable), scheduled_for (nullable for PRN), recorded_at, status (taken/skipped/unconfirmed/corrected), recorded_by_user_id, device_id, correction_of_event_id, notes, created_at
- Events are append-oriented. Corrections create a linked event rather than silently erasing history.
- Unique/idempotency keys prevent duplicate acknowledgement events for the same scheduled occurrence.

### stock_transactions
- id, medicine_id, household_id, transaction_type (initial/refill/dispense/adjustment/correction), quantity_delta, unit, recorded_at, recorded_by, related_dose_event_id (optional), notes
- Stock balance is derived from transactions. Do not rely on direct quantity overwrite.

### notification_preferences
- household/member scope, reminder settings, snooze policy, quiet hours, escalation preferences.

### devices
- id, household_id, user_id, device label, last_seen, revoked_at, sync token metadata (never expose secrets in client-visible logs).

### sync metadata
- local queue items: mutation_id, entity, entity_id, operation, payload, created_at, retry_count, state.
- Sync cursors/version metadata are per client and server-controlled where practical.

## Dose state semantics
- Taken: explicitly acknowledged.
- Skipped: explicitly recorded as skipped.
- Unconfirmed: the app has not received acknowledgement; never assume the medicine was not taken.
- Corrected: a prior record was amended through a linked correction.
- Missed/unconfirmed is a tracking label derived from time and policy, not a medical recommendation.

## Sync principles
1. Write locally first and show the change immediately.
2. Queue the mutation with a stable ID.
3. Sync in batches when connectivity is available.
4. Server validates membership, permissions and entity constraints.
5. Acknowledge accepted mutations and update the local cursor.
6. Reconcile remote changes without replacing newer local data blindly.
7. Use idempotency and transaction semantics to avoid duplicate dose or stock effects.
8. Show an unobtrusive sync state: Synced, Syncing, Offline or Attention needed.

## Notification design
- Local reminder notifications remain available offline.
- Acknowledgements sync to all household devices.
- Family nudges require server-side policy and delivery; never depend on another device's local scheduler.
- Quiet hours and per-member preferences apply.
- Snooze creates a follow-up notification, not a dose event.
- Do not give automated missed-dose medication advice.

## Security
- Supabase RLS is mandatory for household data.
- Roles are enforced on the server, not merely hidden in the UI.
- Invitation tokens should expire and be single-use where practical.
- Device revocation and membership removal must stop future cloud access.
- PIN is an app-lock convenience, not encryption.
- Avoid storing unnecessary medical or identity details.

## Implementation stages
1. UI shell and navigation with test data.
2. Local schema, repositories and CRUD.
3. Schedule generation, dose events and audit/correction logic.
4. Transaction-based stock tracking.
5. Auth, household creation, invitation and membership.
6. Sync queue, conflict rules and realtime updates.
7. Notifications and caregiver nudges.
8. Backup, privacy/security controls, accessibility and reliability testing.
9. Release APK and validation.

## Testing gates
- Multiple devices and household roles.
- Offline edits and reconnect reconciliation.
- Duplicate event delivery and retry.
- Timezone/DST and schedule boundary cases.
- Dose correction and stock transaction accuracy.
- Member removal and device revocation.
- Backup/restore and fresh install.
- Android notification permission and exact alarm behavior.
