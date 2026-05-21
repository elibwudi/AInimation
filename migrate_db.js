const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'animations.db');
const db = new Database(dbPath);

try {
  console.log('Migrating database...');
  db.prepare('ALTER TABLE animations ADD COLUMN core_difficulty TEXT').run();
  console.log('Migration successful: core_difficulty added.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('Column core_difficulty already exists.');
  } else {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
} finally {
  db.close();
}
