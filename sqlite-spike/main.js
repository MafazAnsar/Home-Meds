import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const out = document.getElementById('out');
const runButton = document.getElementById('run');
const log = (message) => { out.textContent += message + '\n'; };

runButton.onclick = async () => {
  runButton.disabled = true;
  out.textContent = 'Running…\n';
  const platform = Capacitor.getPlatform();
  log('Platform: ' + platform);
  if (platform !== 'android') {
    log('FAIL: test requires Android native runtime');
    runButton.disabled = false;
    return;
  }

  const sqlite = new SQLiteConnection(CapacitorSQLite);
  let db;
  try {
    db = await sqlite.createConnection('homemeds_spike', false, 'no-encryption', 1, false);
    await db.open();
    log('PASS: open/create database');

    await db.execute('PRAGMA foreign_keys = ON');
    const fkState = await db.query('PRAGMA foreign_keys');
    if (Number(fkState.values?.[0]?.foreign_keys) !== 1) throw Error('foreign key pragma assertion failed');
    log('PASS: foreign-key enforcement enabled');

    // Reset only the disposable diagnostic schema so runs are repeatable.
    await db.execute('DROP TABLE IF EXISTS child');
    await db.execute('DROP TABLE IF EXISTS parent');
    await db.execute('DROP TABLE IF EXISTS migration_probe');
    await db.execute('CREATE TABLE parent (id INTEGER PRIMARY KEY, label TEXT NOT NULL)');
    await db.execute('CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL, label TEXT, FOREIGN KEY(parent_id) REFERENCES parent(id))');
    await db.execute('CREATE TABLE migration_probe (id INTEGER PRIMARY KEY, value TEXT)');

    await db.run('INSERT OR REPLACE INTO parent (id,label) VALUES (?,?)', [1, 'parameterized']);
    const q = await db.query('SELECT label FROM parent WHERE id=?', [1]);
    if (q.values?.[0]?.label !== 'parameterized') throw Error('parameterized query assertion failed');
    log('PASS: parameterized write/query');

    await db.execute('BEGIN TRANSACTION');
    try {
      await db.run('INSERT INTO child (parent_id,label) VALUES (?,?)', [1, 'committed']);
      await db.execute('COMMIT');
    } catch (e) {
      try { await db.execute('ROLLBACK'); } catch {}
      throw e;
    }
    const committed = await db.query('SELECT COUNT(*) AS c FROM child');
    if (Number(committed.values?.[0]?.c) !== 1) throw Error('commit assertion failed');
    log('PASS: transaction commit');

    await db.execute('BEGIN TRANSACTION');
    try {
      await db.run('INSERT INTO child (parent_id,label) VALUES (?,?)', [1, 'rollback']);
      await db.execute('ROLLBACK');
    } catch (e) {
      try { await db.execute('ROLLBACK'); } catch {}
      throw e;
    }
    const rolled = await db.query('SELECT COUNT(*) AS c FROM child');
    if (Number(rolled.values?.[0]?.c) !== 1) throw Error('rollback assertion failed');
    log('PASS: rollback');

    let fkFailed = false;
    try { await db.run('INSERT INTO child (parent_id,label) VALUES (?,?)', [999, 'invalid']); } catch { fkFailed = true; }
    if (!fkFailed) throw Error('foreign key was not enforced');
    log('PASS: foreign key constraint');

    await db.execute('ALTER TABLE migration_probe ADD COLUMN version2 TEXT');
    await db.run('INSERT OR REPLACE INTO migration_probe (id,value,version2) VALUES (?,?,?)', [1, 'preserved', 'migration']);
    const mig = await db.query('SELECT value,version2 FROM migration_probe WHERE id=?', [1]);
    if (mig.values?.[0]?.value !== 'preserved' || mig.values?.[0]?.version2 !== 'migration') throw Error('migration/data preservation assertion failed');
    log('PASS: schema alteration and data preservation');

    await db.close();
    log('PASS: close');
    db = await sqlite.createConnection('homemeds_spike', false, 'no-encryption', 1, false);
    await db.open();
    const reopen = await db.query('SELECT label FROM parent WHERE id=?', [1]);
    if (reopen.values?.[0]?.label !== 'parameterized') throw Error('reopen persistence assertion failed');
    log('PASS: reopen and persistence');
    await db.close();
    await sqlite.closeConnection('homemeds_spike', false);
    log('ALL TESTS PASSED (runtime evidence from this device)');
  } catch (e) {
    log('FAIL: ' + (e?.message || String(e)));
    try { if (db) await db.close(); } catch {}
    try { await sqlite.closeConnection('homemeds_spike', false); } catch {}
  } finally {
    runButton.disabled = false;
  }
};
