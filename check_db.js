const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'animations.db');
const db = new Database(dbPath);
const records = db.prepare('SELECT id, title, status, updated_at FROM animations ORDER BY updated_at DESC LIMIT 20').all();
console.log(JSON.stringify(records, null, 2));
db.close();
