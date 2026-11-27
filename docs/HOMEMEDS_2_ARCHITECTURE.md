> **Status: Superseded draft.** This document reflects an earlier, narrower prototype design. The authoritative proposed product and architecture baseline is [HOMEMEDS_MASTER_BLUEPRINT.md](HOMEMEDS_MASTER_BLUEPRINT.md). Treat this file as historical reference during migration and implementation; where the documents conflict, the master blueprint takes precedence.

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


## Shared household inventory (core feature — expanded)

### Separation of prescription and physical stock
- **Medication plan**: member-specific prescribed medicine, dose amount/unit, form, schedule and instruction source.
- **Inventory item**: household-owned physical stock tracked independently, including medicine/active ingredient label, strength, dosage form, unit (tablet, capsule, mL, etc.), lot/expiry metadata (optional), and current balance derived from its ledger.
- **Allocation**: a member medication plan may reference an inventory item and an explicitly configured stock-unit quantity per administration. Allocation is not automatic and must be confirmed by the user based on the prescribed instructions and clinician/pharmacist guidance.
- Inventory belongs to the household, not to a particular member's profile. Household members can share stock when permitted by household role.

### Inventory data model
#### inventory_items
- id, household_id, display_name, ingredient_label (optional), strength, dosage_form, stock_unit, created_at, updated_at, archived_at
- Separate entries for different strengths/forms. Do not merge balances just because labels or ingredients resemble each other.

#### inventory_transactions
- id, inventory_item_id, household_id, transaction_type, quantity_delta, unit, recorded_at, recorded_by, related_dose_event_id (optional), notes
- Transaction types: initial, refill, consumption, adjustment, correction.
- Balance is calculated from the ledger. Transaction idempotency must be enforced for sync.

#### medication_inventory_allocations
- id, medicine_plan_id, inventory_item_id, stock_units_per_administration, confirmation_note, confirmed_at, confirmed_by, active
- A plan may be linked to a specific stock item only after explicit configuration. Allocation quantity is not inferred from strength text.
- Initial implementation may support one allocated inventory item per plan; future allocation across multiple items requires explicit splitting and validation.

### Dose-to-stock behavior
- Taking a scheduled dose creates a dose event and a corresponding inventory consumption ledger transaction for the configured allocation. Both must be committed atomically locally.
- Skipping or leaving a dose unconfirmed does not consume stock.
- Correcting a dose event must reverse/reconcile the prior consumption through ledger correction transactions, never delete ledger entries.
- PRN recording requires an explicit quantity and uses the same allocation/ledger path when configured.
- If a plan has no inventory allocation, dose recording remains possible but stock is not silently deducted.
- If the allocated stock is insufficient, show the balance and allow the dose record without a stock deduction only through an explicit, auditable choice; never block or advise clinical decisions.

### Safety and validation
- Do not automatically convert strengths, forms, release types, or concentrations into equivalent stock allocations.
- Label-based matching may assist selection but must never preselect or activate an allocation silently.
- Explicit user confirmation is required for the allocation and its units.
- The application is a tracking aid, not a prescribing or dose-calculation system.

### Migration from legacy medicine-level stock
- Keep legacy medicine-level balances and transaction history readable.
- Migration creates inventory items only from existing medicine records with tracked stock, using their existing strength/form labels as-is.
- Create an opening inventory transaction from each legacy balance; preserve original transactions as historical provenance or migrate them with original timestamps and references.
- Do not automatically link existing medicine schedules to migrated inventory. User must review and confirm allocation.
- Migration must be idempotent, versioned, and testable against interrupted upgrades.
\n\n## Prescription and treatment-course provenance (prototype phase)\n- Each medication-course entry links to a prescription provenance record: patient, medicine, prescriber, clinic/hospital, prescription date, course dates, notes, and optional attached photo/PDF.\n- Doctor profiles are reusable, matched by entered doctor name and clinic for this prototype.\n- Prescription records remain separate from dose-event history. Renewals should create new prescription/course records; changes should preserve provenance.\n- The prototype currently captures provenance per medication entry. A future visit-level prescription grouping can associate multiple medication courses with one consultation without duplicating doctor/visit details.\n- Attachments are stored locally in IndexedDB and are not synced or backed up yet.\n