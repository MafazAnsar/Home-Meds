# Home-Meds 2.0 — Master Product & Technical Blueprint

**Status:** Proposed baseline for review and phased implementation  
**Repository branch:** `homemeds-2.0-architecture`  
**Scope:** Architecture and product blueprint only; no application code changes in this document's commit.

---

## 1. Product vision

Home-Meds is a secure, shared, offline-resilient family healthcare and medication-management platform. Its purpose is to maintain a coherent healthcare history for each family member and help caregivers manage medication plans, actual administration, household supplies, appointments, vaccinations, observations and documents.

It is a tracking, organization and coordination tool—not a diagnostic, prescribing or dose-calculation system.

### Product principles
1. **Patient-centric:** A family member's healthcare history is organized around a stable profile.
2. **Household-aware:** Shared care and supplies are managed by household with explicit permissions.
3. **Clinically traceable:** Prescription intent, treatment plans and actual events remain distinct.
4. **Inventory-integrated:** Physical stock is tracked independently and reconciled with actual usage.
5. **Offline-resilient:** Core workflows remain usable without connectivity.
6. **Cloud-backed:** The cloud is the authoritative shared state; local data is a cache and pending-operation store.
7. **Auditable:** Corrections and financial/stock effects are traceable; important history is not silently overwritten.
8. **Privacy and security first:** Authorization is enforced server-side and tenant boundaries are explicit.
9. **Incremental delivery:** Changes are phased, with migrations and regression gates.
10. **No silent clinical inference:** Units, strength, formulation, dose or stock allocations are never inferred in ways that could affect clinical or stock decisions.

## 2. Product scope

### Core modules
- Household, account, membership and caregiver permissions
- Family profiles
- Doctors, clinics and healthcare encounters
- Prescription capture and provenance
- Structured medicine catalogue
- Treatment courses and medication schedules
- Actual dose/admin events and corrections
- Household purchasing and inventory
- Batch/lot, expiry and stock reconciliation
- Injection and therapeutic course tracking
- Vaccination history and dose-series records
- Appointments and follow-ups
- Health observations and measurements
- Healthcare documents and attachments
- Unified healthcare timeline
- Notifications and reminder preferences
- Offline operation and sync
- Backup, recovery and data export
- Audit, privacy and security controls

### Explicit non-goals
- Diagnosing conditions
- Prescribing or recommending treatment
- Automated dose calculations or equivalence decisions
- Automatically changing prescribed schedules
- Clinical decision support without a separately reviewed and approved scope
- Treating inferred missed doses as clinical advice

## 3. Domain model and separation of concepts

The system must not collapse these separate concepts:

- **Medicine catalogue entry:** A normalized reference describing a medicine/ingredient, presentation, strength and formulation, where reliably available.
- **Prescription:** A clinician-originated instruction set associated with an encounter.
- **Prescription line:** A medicine-specific instruction within a prescription.
- **Treatment course/plan:** The patient's tracked implementation of a prescribed or otherwise documented plan over a period.
- **Schedule:** Timing rules for planned administrations, including PRN rules where appropriate.
- **Dose/admin event:** A record of what was actually acknowledged, skipped, recorded or corrected.
- **Inventory item:** Household-owned stock identity and unit of measurement.
- **Stock batch:** A purchased/received batch with quantity, purchase cost, supplier and expiry/lot data as available.
- **Stock movement:** Append-oriented record of receipt, consumption, adjustment, wastage, transfer or correction.
- **Allocation:** Explicit user-confirmed mapping from a plan to stock, including quantity in stock units per administration.

This separation is mandatory for data integrity and auditability.

## 4. Target architecture

### Logical components
1. **Client/UI:** Modular responsive interface, initially retaining the Capacitor Android wrapper.
2. **Application/domain layer:** Validated business operations and domain rules independent of presentation.
3. **Local data layer:** Persistent cache and local workflow data for offline use.
4. **Operation queue/sync engine:** Durable, idempotent mutations, retry, reconciliation and conflict handling.
5. **Identity/access layer:** Authentication, household membership, authorization and device/session management.
6. **Backend/API layer:** Validates requests, permissions, domain invariants and transaction boundaries.
7. **Relational database:** Authoritative shared state and referential integrity.
8. **Private document storage:** Securely stored prescriptions, reports and attachments.
9. **Notification services:** Local reminders and server-coordinated household notifications.
10. **Observability and maintenance:** Error reporting, operational logs, migration monitoring and service health.

### Technology evaluation
Supabase/PostgreSQL, Supabase Auth, server-side functions, private storage and realtime facilities are candidate technologies—not yet irrevocably selected.

Before adoption, evaluate:
- Tenant isolation and security controls
- Offline-first support and conflict handling
- Transactional consistency
- Android and Capacitor integration
- Data migration and portability
- Cost and resource limits
- Backup, restore and disaster recovery
- Maintainability and testing
- Service availability and dependency risks

Realtime is a delivery mechanism, not the synchronization design itself. The system must work when realtime connections are unavailable.

### Architectural rule
The cloud is authoritative for accepted shared records. Local clients maintain a durable cache and queue. A queued local change must be visibly distinguished from server-confirmed state where necessary.

## 5. Proposed relational domain model

The detailed schema will evolve during implementation, but the following entities and relationships form the target baseline.

### Identity and tenancy
- **users:** Authentication identity.
- **households:** Shared care and inventory boundary.
- **household_memberships:** User-to-household membership, role, status and invitation provenance.
- **family_profiles:** Person receiving care; may exist without a login.
- **devices/sessions:** Registered device and revocation state, with minimal necessary metadata.

A user may participate in multiple households. Profiles and household-owned data must be scoped explicitly. Cross-household sharing, if later required, must be a deliberate authorization feature—not an accidental consequence of record links.

### Healthcare and provenance
- **doctors/providers**
- **clinics/organizations**
- **encounters/visits:** Patient, provider, clinic, encounter date and provenance.
- **prescriptions:** Encounter-linked prescription document or record.
- **prescription_lines:** Multiple medication instructions within a prescription.
- **treatment_courses:** Tracked course linked to a prescription line or documented source.
- **schedules:** Timing rules for courses.
- **dose_events:** Actual administration/acknowledgement history.
- **vaccination_records:** Vaccine, administered dose, date, provider and provenance.
- **injection_courses/admin_events:** Track injectable treatment courses and actual administration events without conflating these with ordinary oral medication.
- **health_observations:** Typed measurements/observations, units, timestamp and source.
- **appointments/follow_ups:** Upcoming and completed care coordination.
- **documents:** Metadata, patient/encounter links, private-storage location and access rules.

### Catalogue
- **medicine_catalogue:** Structured medicine/reference information.
- Catalogue attributes may include display names, ingredient(s), strength, formulation, dosage form and reference metadata.
- Catalogue data must retain source/provenance and must not imply equivalence between similar entries.
- Household custom entries may be supported separately from globally curated catalogue entries.

### Inventory and purchasing
- **inventory_items:** Household-owned stock identity, units and descriptive details.
- **stock_batches:** Batch/lot, received quantity, remaining quantity derived through ledger, expiry, cost and supplier where available.
- **purchases/receipts:** Purchase transaction, date, vendor and line items.
- **stock_movements:** Append-oriented ledger of receipt, consumption, wastage, transfer, adjustment and correction.
- **medication_inventory_allocations:** Explicit plan-to-stock mapping and stock-unit quantity per administration.
- **suppliers:** Optional reusable supplier records.
- **inventory_alerts/preferences:** Configurable expiry/low-stock notification rules.

Balances must be derivable and reconciled against the ledger. The system should avoid direct balance overwrites.

## 6. Healthcare timeline

The timeline should be a derived view, not a separate manually maintained history.

Potential timeline entries include:
- Encounters and consultations
- Prescription records
- Course starts, changes and completion
- Dose/admin events, with appropriate visibility
- Injections and injection-course events
- Vaccinations
- Health observations
- Appointments and follow-ups
- Documents and reports

Timeline entries must reference their underlying source records, preserve timestamps and provenance, support filtering and avoid duplicating the same event through multiple linked entities.

## 7. Medication and dose-event rules

- A prescription may contain multiple lines.
- A course must preserve its source and patient association.
- Schedule rules must support multiple times, date ranges, recurrence and PRN tracking without hard-coded daily slots.
- Timezone handling must be explicit.
- Scheduled, PRN, skipped, unconfirmed and corrected records have distinct semantics.
- Unconfirmed is not proof that a medicine was not taken.
- Corrections should create linked audit events or correction records, not silently erase the original event.
- Idempotency must prevent duplicate dose events during retry/sync.
- Snoozing a reminder is a notification action, not a dose event.
- Clinical instructions must be preserved without automated interpretation or recommendation.

## 8. Inventory architecture

### Stock model
Inventory is owned at household scope, not automatically by individual family profiles. Different strengths and dosage forms are distinct stock items.

Batch-level inventory is preferred where batch/expiry data is available. Each receipt can create one or more stock batches. Usage and wastage should be attributable to batch where feasible, while selection must not silently make clinical substitutions.

### Ledger
Stock movements are append-oriented. Movement types should include:
- Opening balance
- Purchase/receipt
- Consumption
- Wastage/expiry
- Adjustment
- Transfer, if supported
- Reversal/correction

Movement records must include household, item, batch when applicable, quantity, unit, timestamp, actor, reason/provenance and idempotency reference.

### Dose-to-stock consistency
When a dose event is explicitly recorded and a valid allocation exists, the associated stock consumption and dose event should be committed as one local transaction and one server-side transactional operation when synchronized.

- Skipped/unconfirmed events do not consume stock.
- No allocation means no automatic stock deduction.
- Allocation requires explicit confirmation and unit validation.
- Insufficient stock must not block a dose record; any inventory exception workflow must be explicit and auditable and must not advise clinical action.
- Corrections reconcile previous consumption through compensating ledger entries.
- PRN consumption requires explicit quantity where applicable.
- No strength/formulation conversion or inferred allocation is permitted.

### Reconciliation and reporting
Provide views for current balances, batch expiry, consumption, purchase history, stock adjustments, wastage and discrepancies. Reconciliation should identify differences rather than silently rewrite them.

## 9. Offline operation and synchronization

### Local mutation lifecycle
1. Validate operation locally.
2. Persist the mutation and local state in a durable transaction.
3. Assign a stable operation/idempotency ID.
4. Present the update locally, with its sync state.
5. Sync when connectivity is available.
6. Server validates tenant, membership, permission, data constraints and operation idempotency.
7. Server commits accepted operation atomically.
8. Client receives acknowledgement and authoritative version.
9. Client reconciles accepted and remote changes without discarding unrelated local edits.

### Queue requirements
Queue entries should contain identifiers, entity references, operation type, minimal payload, creation time, retry metadata, status and dependency references. Avoid storing secrets in queue/log payloads.

### Conflict policy
Conflict rules must be defined per entity/operation. Do not use blanket last-write-wins for clinically meaningful history or ledger records.

- Append-only events: preserve both valid events; deduplicate by idempotency keys.
- Corrections: reference the event being corrected and preserve history.
- Profile/configuration fields: conflict resolution may use version comparison and a user-visible resolution where appropriate.
- Ledger movements: append-only and transactionally validated.
- Membership/access: server-authoritative; local offline state cannot grant access.
- Deletion: use authorized tombstones or archival semantics with controlled propagation.

### Sync visibility
Expose simple states: Synced, Syncing, Offline and Attention needed. Errors must be actionable without exposing sensitive data.

## 10. Security, privacy and access control

### Tenant isolation
Household ownership must be validated server-side on every operation. Tenant IDs supplied by clients are not trusted without authorization checks.

### Authorization
Roles and permissions must be defined centrally and enforced on backend operations. UI hiding is not authorization. Define access for:
- Household administrators
- Caregivers
- Members
- Invited/pending users
- Family profiles without accounts

Permission design must support minimum necessary access and prevent cross-household record leakage.

### Required controls
- Secure authentication and account recovery
- Server-side authorization
- Database-level tenant policies where supported
- Private document storage and expiring access where appropriate
- Invitation expiry/revocation
- Membership removal and device/session revocation
- Secure transport and protected credentials
- No secrets in client code, logs or telemetry
- Data minimization and retention controls
- Audit history for material access and mutations as appropriate
- Backup, restore and recovery testing
- Security review of injection, unsafe HTML rendering and input validation
- Export and account/household deletion workflows designed carefully around shared records

An app PIN is not a substitute for authentication, encryption or authorization.

## 11. Documents and attachments

Documents may be linked to a profile, encounter, prescription, vaccination or other relevant event. Store metadata separately from private file storage.

Requirements:
- Upload and retry support
- File validation and limits
- Private access controls
- Secure retrieval
- Offline metadata and optional locally available files
- Document provenance and timestamps
- Deletion/retention policies
- Migration of locally stored prototype attachments where possible

## 12. Notifications

- Local medication reminders should work offline where device permissions allow.
- Server-coordinated notifications support household/caregiver nudges across devices.
- Quiet hours and per-user/per-profile preferences must be configurable.
- Snooze creates notification state, not clinical event state.
- Reminder delivery and acknowledgment must be idempotent where possible.
- Do not provide automated missed-dose advice.
- Android permission, exact-alarm and background restrictions must be tested on real devices.

## 13. Migration strategy

Migration is a controlled, versioned process; no destructive rewrite of user data.

### Principles
- Preserve legacy records and provenance.
- Never silently infer clinical equivalence or stock allocations.
- Migration must be repeatable/idempotent.
- Keep backup and recovery paths.
- Validate counts and relationships.
- Support interruption and retry.
- Document unresolved or unmappable records.
- Use an explicit migration version and state.

### Legacy migration scope
- Family profiles: map to stable profile IDs.
- Doctor profiles: preserve and deduplicate conservatively.
- Medication/course records: preserve original values and provenance; map only validated fields.
- Dose events: preserve timestamps, statuses and corrections/history where available.
- Legacy stock balances: create inventory items and opening ledger entries as appropriate.
- Legacy stock transaction history: retain or migrate with original timestamps and references.
- Attachments: migrate where technically available, preserving linkage.
- Allocations: do not automatically activate; require user review and confirmation.

Migration should include a report showing migrated, skipped, duplicate, invalid and unresolved records.

## 14. Current prototype gap analysis

| Area | Current state observed in audit | Target |
|---|---|---|
| Client architecture | Monolithic app.js | Modular application/domain/data layers |
| Storage | IndexedDB prototype | Local cache behind stable data layer plus cloud authority |
| Identity | No real auth/tenant model | Authenticated users and household membership |
| Profiles | Inconsistent name-based links | Stable profile IDs and household scope |
| Prescriptions | Provenance per course/entry | Encounter -> prescription -> lines -> courses |
| Catalogue | Text-oriented | Structured, source-aware catalogue |
| Dose events | Basic tracking; correction/stock consistency gaps | Auditable, idempotent and transactionally integrated |
| Inventory | Fragmented legacy and separate inventory concepts | Batch-aware household ledger |
| Sync | No cloud synchronization | Durable offline queue and conflict policy |
| Documents | Local-only | Private cloud storage and offline support |
| Vaccination | Not implemented | Dedicated vaccination records and dose-series tracking |
| Injections | Not implemented as dedicated model | Course and administration tracking |
| Timeline | Not implemented as unified view | Derived healthcare timeline |
| Security | No cloud tenant security | Auth, authorization, tenant isolation and policies |
| Notifications | Prototype/local capabilities | Local reminders plus cloud coordination |
| Migration | Basic schema evolution | Versioned migration and reconciliation |
| Testing | Build validation | Automated domain, migration, sync, security and device regression |

### Retain/refactor/replace
- Capacitor wrapper: retain initially.
- Existing UI/CSS: refactor, preserving useful design decisions.
- Existing dose-tracking concept: retain; redesign implementation and semantics as needed.
- Doctor profiles and prescription provenance: retain data and concepts; refactor model.
- IndexedDB: temporary implementation/cache; not authoritative shared storage.
- Legacy stock structures: migrate and retire after validation.
- Monolithic app.js: progressively replace with modular structure.
- Signing and CI: retain, protect signing identity.
- Existing records: migration assets; not disposable.

## 15. Development roadmap and dependency gates

### Stage 0 — Blueprint and baseline
- Audit completed.
- Master blueprint established.
- Decisions, open questions and scope recorded.
- No application code changes in the blueprint commit.

**Gate:** Architecture review and explicit baseline approval.

### Stage 1 — Platform foundation
- Modular structure and architecture boundaries
- Local data layer and schema migration framework
- Backend and technology decision
- Authentication
- Household and membership model
- Permission design
- Tenant isolation
- CI and automated tests

**Gate:** Security/tenant tests; clean install; migration smoke tests.

### Stage 2 — Family and healthcare foundation
- Family profiles
- Doctors/providers and clinics
- Encounters
- Document metadata and storage
- Appointments/follow-ups
- Observation foundation

**Gate:** CRUD, permission, migration and document access regression tests.

### Stage 3 — Catalogue and prescription model
- Catalogue/reference data
- Prescription capture
- Encounter-level prescription grouping
- Prescription lines
- Provenance and attachments
- Treatment courses

**Gate:** Relationship, provenance, validation and regression tests.

### Stage 4 — Schedule and dose tracking
- Schedule engine and timezone behavior
- PRN support
- Dose/admin event capture
- Correction history
- Notifications
- Audit

**Gate:** Boundary/timezone/idempotency/correction tests.

### Stage 5 — Inventory and purchasing
- Inventory items and batches
- Purchase/receipt entry
- Ledger
- Allocation confirmation
- Dose consumption linkage
- Wastage/expiry
- Reconciliation
- Reporting

**Gate:** Transaction integrity, ledger accuracy, migration and discrepancy tests.

### Stage 6 — Vaccinations and injections
- Vaccination records and series
- Injection courses and administration events
- Relevant reminders and provenance

**Gate:** History integrity, reminders and permissions tests.

### Stage 7 — Unified healthcare timeline
- Derived timeline
- Filters
- Source links
- Date ordering and correction visibility

**Gate:** Timeline consistency and cross-module regression.

### Stage 8 — Offline and multi-device hardening
Offline work may be built earlier as foundations are introduced; this stage focuses on end-to-end reliability.
- Queue recovery
- Retry and idempotency
- Conflict resolution
- Realtime refresh
- Device revocation
- Multi-device tests
- Offline document strategy

**Gate:** Disconnection/reconnection, conflict, duplicate and permission tests across real devices.

### Stage 9 — Intelligence and optimisation
Only after reliable core data:
- Household consumption trends
- Expiry and replenishment insights
- Reporting
- Optional insights that are strictly organizational and do not constitute medical advice

**Gate:** Privacy, quality, usefulness and safety review.

## 16. Quality and regression strategy

Every implementation change should include a scoped test plan.

### Automated testing layers
- Unit tests for domain rules
- Repository and persistence tests
- Schema/migration tests
- Integration tests for transactional operations
- Sync/idempotency/reconciliation tests
- Authorization and tenant-isolation tests
- UI/navigation interaction tests
- Build and static analysis

### Regression checklist
- Fresh install
- Upgrade/migration from prior build
- Household creation and switching
- Profile creation/edit/archive
- Prescription creation/edit and encounter grouping
- Schedule display, editing and timezone boundaries
- Taken/skipped/PRN/correction behavior
- Inventory receipt, consumption, adjustment and balance
- Expiry and batch handling
- Stock allocation and insufficient stock handling
- Vaccination and injection records
- Document upload/download and permissions
- Timeline filtering/order
- Notifications, permissions, snooze and quiet hours
- Offline operations and reconnect
- Duplicate sync/retry
- Concurrent multi-device edits
- Membership removal and device revocation
- Backup/export and recovery
- Accessibility, responsive layout and Android navigation

### Verification reporting
For each change, report separately:
- **Implemented:** What was changed.
- **Built:** Whether the build succeeded and which build.
- **Tested:** Which automated tests were run and their outcomes.
- **Device verified:** Which functionality was actually exercised on a physical device.
- **Not verified:** Known gaps and risks.

A successful build is not functional verification.

## 17. Engineering workflow and repository safeguards

- Work only on the designated development branch; never modify `main`.
- Inspect relevant code and current branch state before each change.
- Define scope and acceptance criteria before implementation.
- Prefer coherent architectural changes over reactive patch accumulation.
- Preserve working functionality unless a change is approved and justified.
- Review diffs for unintended changes.
- Run applicable tests, build and regression checks.
- Do not claim device verification without actual device testing.
- Preserve the existing Android signing identity.
- Keep secrets out of source control.
- Record architectural decisions and migrations.

## 18. Decisions still open

These require deliberate evaluation/review rather than assumptions:
- Final backend/platform selection
- Local database choice for Capacitor/Android
- Catalogue source and update policy
- Document storage, retention and backup policy
- Detailed role/permission matrix
- Sync conflict policy for each mutable entity
- Invitation and household transfer workflow
- Household deletion, member departure and record retention
- Data export format and backup restoration
- Notification delivery provider and cost
- Analytics/telemetry privacy scope

---

**This blueprint is the proposed target baseline.** Implementation should proceed only through the roadmap, with architecture decisions recorded, reviewable commits and explicit quality gates.
