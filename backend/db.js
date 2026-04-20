const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'derby.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    status TEXT NOT NULL DEFAULT 'OPEN',
    horses TEXT,
    win_horse INTEGER,
    show_horse INTEGER,
    price_per_box INTEGER DEFAULT 3,
    tip_percentage INTEGER DEFAULT 0,
    grand_prize_percentage INTEGER DEFAULT 50,
    scratched_horses TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS boxes (
    x INTEGER,
    y INTEGER,
    owner TEXT,
    PRIMARY KEY (x, y)
  );
`);

// Insert initial meta if empty
const metaCount = db.prepare('SELECT COUNT(*) as count FROM meta').get().count;
if (metaCount === 0) {
  db.prepare("INSERT INTO meta (id, status, horses, win_horse, show_horse, price_per_box, tip_percentage, grand_prize_percentage, scratched_horses) VALUES (1, 'OPEN', NULL, NULL, NULL, 3, 0, 50, '[]')").run();
} else {
  // Safely add columns to existing DB
  try { db.exec('ALTER TABLE meta ADD COLUMN win_horse INTEGER'); } catch(e) {}
  try { db.exec('ALTER TABLE meta ADD COLUMN show_horse INTEGER'); } catch(e) {}
  try { db.exec('ALTER TABLE meta ADD COLUMN price_per_box INTEGER DEFAULT 3'); } catch(e) {}
  try { db.exec('ALTER TABLE meta ADD COLUMN tip_percentage INTEGER DEFAULT 0'); } catch(e) {}
  try { db.exec('ALTER TABLE meta ADD COLUMN grand_prize_percentage INTEGER DEFAULT 50'); } catch(e) {}
  try { db.exec("ALTER TABLE meta ADD COLUMN scratched_horses TEXT DEFAULT '[]'"); } catch(e) {}
}

// Insert 400 boxes if empty
const boxCount = db.prepare('SELECT COUNT(*) as count FROM boxes').get().count;
if (boxCount === 0) {
  const insertBox = db.prepare('INSERT INTO boxes (x, y, owner) VALUES (?, ?, NULL)');
  db.transaction(() => {
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        insertBox.run(x, y);
      }
    }
  })();
}

module.exports = db;
