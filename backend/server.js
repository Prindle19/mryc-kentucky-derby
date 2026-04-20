const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// SSE Clients
let clients = [];

function notifyClients() {
  const state = getBoardState();
  clients.forEach(c => {
    try {
      c.res.write(`data: ${JSON.stringify(state)}\n\n`);
    } catch (e) {
      // client probably disconnected
    }
  });
}

function getBoardState() {
  const meta = db.prepare('SELECT * FROM meta WHERE id = 1').get();
  const boxes = db.prepare('SELECT * FROM boxes').all();
  return {
    status: meta.status,
    horses: meta.horses ? JSON.parse(meta.horses) : null,
    winHorse: meta.win_horse,
    showHorse: meta.show_horse,
    pricePerBox: meta.price_per_box ?? 3,
    tipPercentage: meta.tip_percentage ?? 0,
    grandPrizePercentage: meta.grand_prize_percentage ?? 50,
    scratchedHorses: meta.scratched_horses ? JSON.parse(meta.scratched_horses) : [],
    activeHorses: meta.active_horses ? JSON.parse(meta.active_horses) : Array.from({length: 20}, (_, i) => i + 1),
    boxes: boxes
  };
}

// SSE Endpoint
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clients.push({ req, res });
  res.write(`data: ${JSON.stringify(getBoardState())}\n\n`);

  req.on('close', () => {
    clients = clients.filter(c => c.req !== req);
  });
});

app.get('/board', (req, res) => {
  res.json(getBoardState());
});

app.post('/buy', (req, res) => {
  const { selections, owner } = req.body;
  if (!owner || !Array.isArray(selections) || selections.length === 0) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  const meta = db.prepare('SELECT status FROM meta WHERE id = 1').get();
  if (meta.status !== 'OPEN') return res.status(400).json({ error: 'Board is locked' });

  // verify boxes are available
  const getBox = db.prepare('SELECT owner FROM boxes WHERE x = ? AND y = ?');
  for (let sel of selections) {
    if (sel.x === sel.y) return res.status(400).json({ error: 'Cannot select diagonal box' });
    const box = getBox.get(sel.x, sel.y);
    if (!box) return res.status(400).json({ error: 'Invalid box coordinates' });
    if (box.owner) return res.status(400).json({ error: 'Box already taken' });
  }

  const update = db.prepare('UPDATE boxes SET owner = ? WHERE x = ? AND y = ? AND x != y AND owner IS NULL');
  
  db.transaction(() => {
    for (let sel of selections) {
      update.run(owner, sel.x, sel.y);
    }
  })();

  notifyClients();
  res.json({ success: true });
});

app.post('/quick-pick', (req, res) => {
  const { quantity, owner } = req.body;
  if (!owner || quantity <= 0) return res.status(400).json({ error: 'Invalid data' });

  const meta = db.prepare('SELECT status, active_horses FROM meta WHERE id = 1').get();
  if (meta.status !== 'OPEN') return res.status(400).json({ error: 'Board is locked' });

  const activeHorses = meta.active_horses ? JSON.parse(meta.active_horses) : Array.from({length: 20}, (_, i) => i + 1);
  const gridSize = activeHorses.length;

  const available = db.prepare('SELECT x, y FROM boxes WHERE owner IS NULL AND x != y AND x < ? AND y < ?').all(gridSize, gridSize);
  if (available.length < quantity) return res.status(400).json({ error: 'Not enough empty boxes' });

  // Shuffle available
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  const selections = available.slice(0, quantity);
  const update = db.prepare('UPDATE boxes SET owner = ? WHERE x = ? AND y = ?');
  
  db.transaction(() => {
    for (let sel of selections) {
      update.run(owner, sel.x, sel.y);
    }
  })();

  notifyClients();
  res.json({ success: true, selections });
});

app.post('/draw', (req, res) => {
  const meta = db.prepare('SELECT status, active_horses FROM meta WHERE id = 1').get();
  if (meta.status !== 'OPEN') return res.status(400).json({ error: 'Already drawn' });

  let horses = meta.active_horses ? JSON.parse(meta.active_horses) : Array.from({length: 20}, (_, i) => i + 1);
  // Shuffle horses
  for (let i = horses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [horses[i], horses[j]] = [horses[j], horses[i]];
  }

  db.prepare("UPDATE meta SET status = 'DRAWN', horses = ?, win_horse = NULL, show_horse = NULL WHERE id = 1").run(JSON.stringify(horses));
  
  notifyClients();
  res.json({ success: true });
});

app.post('/results', (req, res) => {
  const { winHorse, showHorse } = req.body;
  const meta = db.prepare('SELECT status FROM meta WHERE id = 1').get();
  if (meta.status !== 'DRAWN') return res.status(400).json({ error: 'Board not drawn yet' });

  if (winHorse !== undefined) {
    db.prepare("UPDATE meta SET win_horse = ? WHERE id = 1").run(winHorse);
  }
  if (showHorse !== undefined) {
    db.prepare("UPDATE meta SET show_horse = ? WHERE id = 1").run(showHorse);
  }
  
  notifyClients();
  res.json({ success: true });
});

app.post('/settings', (req, res) => {
  const { pricePerBox, tipPercentage, grandPrizePercentage } = req.body;
  
  if (pricePerBox !== undefined) {
    db.prepare("UPDATE meta SET price_per_box = ? WHERE id = 1").run(pricePerBox);
  }
  if (tipPercentage !== undefined) {
    db.prepare("UPDATE meta SET tip_percentage = ? WHERE id = 1").run(tipPercentage);
  }
  if (grandPrizePercentage !== undefined) {
    db.prepare("UPDATE meta SET grand_prize_percentage = ? WHERE id = 1").run(grandPrizePercentage);
  }
  
  notifyClients();
  res.json({ success: true });
});

app.post('/scratch', (req, res) => {
  const { horseNumber, isScratched } = req.body;
  
  // Can only scratch valid horses 1-24
  if (horseNumber < 1 || horseNumber > 24) {
    return res.status(400).json({ error: 'Invalid horse number' });
  }

  const meta = db.prepare('SELECT scratched_horses FROM meta WHERE id = 1').get();
  let scratched = meta.scratched_horses ? JSON.parse(meta.scratched_horses) : [];

  if (isScratched && !scratched.includes(horseNumber)) {
    scratched.push(horseNumber);
  } else if (!isScratched) {
    scratched = scratched.filter(h => h !== horseNumber);
  }

  db.prepare("UPDATE meta SET scratched_horses = ? WHERE id = 1").run(JSON.stringify(scratched));
  
  notifyClients();
  res.json({ success: true, scratchedHorses: scratched });
});

app.post('/active-horses', (req, res) => {
  const { horseNumber, isActive } = req.body;
  if (horseNumber < 1 || horseNumber > 24) return res.status(400).json({ error: 'Invalid horse number' });

  const meta = db.prepare('SELECT status, active_horses FROM meta WHERE id = 1').get();
  if (meta.status !== 'OPEN') return res.status(400).json({ error: 'Board is locked' });

  let active = meta.active_horses ? JSON.parse(meta.active_horses) : Array.from({length: 20}, (_, i) => i + 1);
  
  if (isActive && !active.includes(horseNumber)) {
    active.push(horseNumber);
    active.sort((a,b) => a - b);
  } else if (!isActive) {
    active = active.filter(h => h !== horseNumber);
  }

  db.prepare("UPDATE meta SET active_horses = ? WHERE id = 1").run(JSON.stringify(active));
  
  notifyClients();
  res.json({ success: true, activeHorses: active });
});

app.post('/reset', (req, res) => {
  db.transaction(() => {
    db.prepare("UPDATE meta SET status = 'OPEN', horses = NULL, win_horse = NULL, show_horse = NULL, scratched_horses = '[]', active_horses = '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]' WHERE id = 1").run();
    db.prepare("UPDATE boxes SET owner = NULL").run();
  })();
  notifyClients();
  res.json({ success: true });
});

// Serve Frontend in Production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
