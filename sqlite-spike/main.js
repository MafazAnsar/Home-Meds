import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const out=document.getElementById('out');
const log=(s)=>{out.textContent+=s+'\n';};
document.getElementById('run').onclick=async()=>{
 out.textContent='Running…\n';
 const platform=Capacitor.getPlatform();
 log('Platform: '+platform);
 if(platform!=='android'){log('FAIL: test requires Android native runtime');return;}
 const sqlite=new SQLiteConnection(CapacitorSQLite);
 let db;
 try{
  db=await sqlite.createConnection('homemeds_spike',false,'no-encryption',1,false);
  await db.open();log('PASS: open/create database');
  await db.execute('PRAGMA foreign_keys = ON');log('Foreign-key enforcement enabled');
  await db.execute('CREATE TABLE IF NOT EXISTS parent (id INTEGER PRIMARY KEY, label TEXT NOT NULL)');
  await db.execute('CREATE TABLE IF NOT EXISTS child (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL, label TEXT, FOREIGN KEY(parent_id) REFERENCES parent(id))');
  await db.execute('CREATE TABLE IF NOT EXISTS migration_probe (id INTEGER PRIMARY KEY, value TEXT)');
  await db.run('INSERT OR REPLACE INTO parent (id,label) VALUES (?,?)',[1,'parameterized']);
  const q=await db.query('SELECT label FROM parent WHERE id=?',[1]);
  if(q.values?.[0]?.label!=='parameterized')throw Error('parameterized query assertion failed');
  log('PASS: parameterized write/query');
  await db.execute('BEGIN TRANSACTION');
  await db.run('INSERT INTO child (parent_id,label) VALUES (?,?)',[1,'committed']);
  await db.execute('COMMIT');
  const committed=await db.query('SELECT COUNT(*) AS c FROM child');
  if(Number(committed.values?.[0]?.c)!==1)throw Error('commit assertion failed');
  log('PASS: transaction commit');
  await db.execute('BEGIN TRANSACTION');
  await db.run('INSERT INTO child (parent_id,label) VALUES (?,?)',[1,'rollback']);
  await db.execute('ROLLBACK');
  const rolled=await db.query('SELECT COUNT(*) AS c FROM child');
  if(Number(rolled.values?.[0]?.c)!==1)throw Error('rollback assertion failed');
  log('PASS: rollback');
  let fkFailed=false;
  try{await db.run('INSERT INTO child (parent_id,label) VALUES (?,?)',[999,'invalid']);}catch(e){fkFailed=true;}
  if(!fkFailed)throw Error('foreign key was not enforced');
  log('PASS: foreign key constraint');
  await db.execute('ALTER TABLE migration_probe ADD COLUMN version2 TEXT');
  await db.run('INSERT OR REPLACE INTO migration_probe (id,value,version2) VALUES (?,?,?)',[1,'preserved','migration']);
  const mig=await db.query('SELECT value,version2 FROM migration_probe WHERE id=?',[1]);
  if(mig.values?.[0]?.value!=='preserved'||mig.values?.[0]?.version2!=='migration')throw Error('migration/data preservation assertion failed');
  log('PASS: schema alteration and data preservation');
  await db.close();log('PASS: close');
  db=await sqlite.createConnection('homemeds_spike',false,'no-encryption',1,false);
  await db.open();
  const reopen=await db.query('SELECT label FROM parent WHERE id=?',[1]);
  if(reopen.values?.[0]?.label!=='parameterized')throw Error('reopen persistence assertion failed');
  log('PASS: reopen and persistence');
  await db.close();await sqlite.closeConnection('homemeds_spike',false);
  log('ALL TESTS PASSED (runtime evidence from this device)');
 }catch(e){
  log('FAIL: '+(e?.message||String(e)));
  try{if(db)await db.close();}catch{}
  try{await sqlite.closeConnection('homemeds_spike',false);}catch{}
 }
};