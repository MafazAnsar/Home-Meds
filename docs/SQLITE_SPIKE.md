# SQLite Android compatibility spike

The diagnostic harness in `sqlite-spike/` is separate from the Home-Meds prototype and builds a temporary Android APK. It checks native plugin invocation, parameterized SQL, transaction commit/rollback, foreign-key enforcement, schema alteration/data preservation, close/reopen persistence.

**Interpretation:** CI success means APK compilation/package only. The test harness runs only after installation on an Android device. Runtime outcomes must be captured from the harness screen and are not inferred from CI.

The harness uses a disposable test database (`homemeds_spike`) and is not the application's production database.
