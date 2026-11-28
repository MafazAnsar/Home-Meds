# WP1 — Baseline workflow inventory and verification checklist

**Branch:** `homemeds-2.0-architecture`  
**Status:** Inventory derived from the prototype source; behavioural verification still required.

## Existing prototype workflows to preserve or deliberately redesign

### Dose tracking
- Daily scheduled dose generation from medicine schedule fields.
- Dose status: unconfirmed, taken, skipped, corrected.
- Correction prompts and optional correction notes.
- Dose history display and progress display.
- PRN dose recording, including quantity and optional note.

### Medicine catalogue
- Add medicine (name, strength/form, member, schedule and optional time).
- Search by name, family member and strength.
- View daily completion status.
- View dose and stock history.
- Adjust legacy medicine stock.

### Prescription/course record
- Prescriber name and clinic/hospital.
- Prescription date, course start/end and notes.
- Optional image/PDF attachment stored with the prescription.
- Prescriber profiles/suggestions.

### Household inventory
- Add stock item and opening quantity.
- Adjust stock with reason.
- Ledger/history.
- Legacy medicine-stock conversion to inventory item and opening ledger entry.

### Profiles and navigation
- Household member profiles seeded in the prototype.
- Five tabs: Home, Medicines, Stock, Family, Settings.

## Known prototype limitations and risk areas (not yet exhaustively tested)
- Storage is IndexedDB and operations often span multiple independent transactions.
- Dose status change and audit record are written separately, so partial failure can produce inconsistent records.
- Stock adjustment writes the transaction and medicine balance separately.
- PRN dose and stock consumption are not atomic.
- Relationships and display names are partly duplicated.
- Demo profiles and medicines are inserted automatically when stores are empty.
- Prescription file blobs and data export/recovery have not been validated.
- No automated regression suite or repeatable functional test procedure existed at baseline.

## Proposed test cases for the persistence spike
These cases must be exercised in a SQLite-native diagnostic harness before adopting SQLite for application workflows:
1. Open/create database on Android.
2. Create schema and enforce foreign keys.
3. Insert/query using parameterised statements.
4. Commit a multi-statement transaction.
5. Force a failure and confirm rollback of all statements in the transaction.
6. Close and reopen the database; confirm data persists.
7. Execute a schema migration from an earlier test schema and confirm data survives.
8. Confirm repeat invocation is idempotent where intended.
9. Build APK through existing CI pipeline.
10. Physical-device smoke test, including application restart.

## Verification rule
A CI build verifies compilation and packaging only. It does not prove runtime database behaviour. Results must be recorded separately for build, automated tests and physical-device validation.
