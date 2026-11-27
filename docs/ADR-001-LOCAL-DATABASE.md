# ADR-001 — Local database: SQLite via Capacitor Community SQLite

**Status:** Accepted for Stage 1 implementation (subject to a CI/device compatibility spike before application adoption)  
**Date:** 28 November 2026  
**Branch:** `homemeds-2.0-architecture`

## Context

Home-Meds is a local-first medication and healthcare record app. Its domain requires relational links and atomic operations: a prescription/course, dose event, audit entry, and stock movement must not become partially committed. IndexedDB is currently used directly throughout a monolithic JavaScript file.

The user confirms the current prototype contains **no real user data**. Prototype/demo seed records are not data that must be migrated. This removes the need for a production-record migration from IndexedDB but does not remove the need for future schema migrations, validation, export or recovery.

## Decision

Use **SQLite behind a Home-Meds persistence/repository boundary** as the target local persistence technology for the Android application. The candidate implementation is `@capacitor-community/sqlite`, with the version pinned to the Capacitor 6-compatible release after verifying package compatibility in CI.

Do not start domain/application code depending directly on plugin calls. A database adapter and repository boundary must isolate plugin details.

## Evaluation

### SQLite / @capacitor-community/sqlite — preferred
- SQL tables, indexes, foreign keys and constraints suit the relational domain.
- Explicit transactions can protect multi-record operations such as recording a dose and related audit/stock movement.
- Schema versions and migration scripts provide a controlled evolution path.
- Plugin documents Android support, SQL queries and transactions, plus JSON import/export facilities.
- SQLCipher support is available in the plugin family; encryption-at-rest configuration and key handling are a separate security decision and are not assumed in this ADR.
- Capacitor's generated Android build in CI can install/sync the plugin, but this must be proven with a test build.

### IndexedDB — fallback, not target
- It works in the current prototype and is browser-native.
- It offers less ergonomic relational integrity and cross-store atomic workflows for this domain.
- Retaining it as the permanent Android store would leave the core data model coupled to weaker application-enforced consistency.

## Compatibility and implementation gate

Before adoption in application code:
1. Pin a release specifically compatible with the project's Capacitor 6 dependencies (do not install latest blindly).
2. Add the plugin and run the existing generated-Android CI workflow.
3. Verify open/close lifecycle and query/parameter binding.
4. Test a multi-statement transaction, rollback on failure, and foreign-key enforcement.
5. Verify versioned schema migration and clean-install behaviour.
6. Verify data export/import and document backup/recovery constraints.
7. Run the APK on the target Android device before describing the storage layer as device-verified.

If a compatibility or reliability gate fails, stop and reassess; do not layer fixes into the app without revisiting the decision.

## Prototype transition

Since no user data needs preservation, the new database can start clean. The transition must still:
- retain or intentionally redesign prototype workflows based on the approved blueprint;
- remove demo seed records from production-facing defaults where appropriate, or clearly isolate them as demo data;
- define a clean initial schema and schema migration mechanism;
- provide backup/export and recovery before release;
- maintain regression tests for existing supported behaviour.

No cloud backend, account/authentication or sync is introduced by this decision.

## Consequences

- Adds a native dependency and generated-project CI integration to validate.
- Enables relational constraints and transactional workflows.
- Requires SQL schema and migrations to be designed before domain modules are migrated.
- No legacy-record migration is required, but future app-version schema migrations remain mandatory.
- No app code or database implementation is changed by this ADR itself.
