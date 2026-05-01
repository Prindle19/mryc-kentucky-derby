const express = require('express');
const path = require('path');
const cors = require('cors');
const { db } = require('./firebase');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const docRef = db.collection('pools').doc('kentucky_derby_2026');

// In-memory cache synced by onSnapshot
let cachedState = null;
let clients = [];

// Ensure document exists
async function initDB() {
  const doc = await docRef.get();
  if (!doc.exists) {
    await docRef.set({
      status: 'OPEN',
      horses: null,
      winHorse: null,
      showHorse: null,
      pricePerBox: 3,
      tipPercentage: 0,
      housePercentage: 0,
      grandPrizePercentage: 50,
      scratchedHorses: [],
      activeHorses: Array.from({length: 20}, (_, i) => i + 1),
      boxes: [],
      paidPlayers: []
    });
  }
}
initDB();

docRef.onSnapshot(doc => {
  if (doc.exists) {
    cachedState = doc.data();
    notifyClients();
  }
});

function notifyClients() {
  if (!cachedState) return;
  clients.forEach(c => {
    try {
      c.res.write(`data: ${JSON.stringify(cachedState)}\n\n`);
    } catch (e) {
      // client disconnected
    }
  });
}

// SSE Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clients.push({ req, res });
  if (cachedState) {
    res.write(`data: ${JSON.stringify(cachedState)}\n\n`);
  }

  req.on('close', () => {
    clients = clients.filter(c => c.req !== req);
  });
});

app.get('/api/board', (req, res) => {
  if (!cachedState) return res.status(503).json({ error: 'Starting up' });
  res.json(cachedState);
});

app.post('/api/buy', async (req, res) => {
  const { selections, owner } = req.body;
  if (!owner || !Array.isArray(selections) || selections.length === 0) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      const data = doc.data();
      if (data.status !== 'OPEN') throw new Error('Board is locked');

      const boxes = data.boxes || [];
      
      for (let sel of selections) {
        if (sel.x === sel.y) throw new Error('Cannot select diagonal box');
        if (sel.x < 0 || sel.y < 0) throw new Error('Invalid box coordinates');
        if (boxes.some(b => b.x === sel.x && b.y === sel.y)) {
          throw new Error('Box already taken');
        }
      }

      // Add selections
      const newBoxes = [...boxes];
      for (let sel of selections) {
        newBoxes.push({ x: sel.x, y: sel.y, owner });
      }

      t.update(docRef, { boxes: newBoxes });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/quick-pick', async (req, res) => {
  const { quantity, owner } = req.body;
  if (!owner || quantity <= 0) return res.status(400).json({ error: 'Invalid data' });

  try {
    const selections = await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      const data = doc.data();
      if (data.status !== 'OPEN') throw new Error('Board is locked');

      const gridSize = data.activeHorses ? data.activeHorses.length : 20;
      const boxes = data.boxes || [];
      
      // Find available boxes
      const available = [];
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          if (x !== y && !boxes.some(b => b.x === x && b.y === y)) {
            available.push({x, y});
          }
        }
      }

      if (available.length < quantity) throw new Error('Not enough empty boxes');

      // Shuffle available
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }

      const picked = available.slice(0, quantity);
      const newBoxes = [...boxes];
      for (let sel of picked) {
        newBoxes.push({ x: sel.x, y: sel.y, owner });
      }

      t.update(docRef, { boxes: newBoxes });
      return picked;
    });
    res.json({ success: true, selections });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/draw', async (req, res) => {
  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      const data = doc.data();
      if (data.status !== 'OPEN') throw new Error('Already drawn');

      let horses = data.activeHorses ? [...data.activeHorses] : Array.from({length: 20}, (_, i) => i + 1);
      for (let i = horses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [horses[i], horses[j]] = [horses[j], horses[i]];
      }

      t.update(docRef, {
        status: 'DRAWN',
        horses: horses,
        winHorse: null,
        showHorse: null
      });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/results', async (req, res) => {
  const { winHorse, showHorse } = req.body;
  
  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      const data = doc.data();
      if (data.status !== 'DRAWN') throw new Error('Board not drawn yet');

      const updates = {};
      if (winHorse !== undefined) updates.winHorse = winHorse;
      if (showHorse !== undefined) updates.showHorse = showHorse;
      
      t.update(docRef, updates);
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  const { pricePerBox, tipPercentage, housePercentage, grandPrizePercentage } = req.body;
  const updates = {};
  if (pricePerBox !== undefined) updates.pricePerBox = pricePerBox;
  if (tipPercentage !== undefined) updates.tipPercentage = tipPercentage;
  if (housePercentage !== undefined) updates.housePercentage = housePercentage;
  if (grandPrizePercentage !== undefined) updates.grandPrizePercentage = grandPrizePercentage;
  
  await docRef.update(updates);
  res.json({ success: true });
});

app.post('/api/scratch', async (req, res) => {
  const { horseNumber, isScratched } = req.body;
  if (horseNumber < 1 || horseNumber > 24) return res.status(400).json({ error: 'Invalid horse number' });

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      const data = doc.data();
      let scratched = data.scratchedHorses || [];

      if (isScratched && !scratched.includes(horseNumber)) {
        scratched.push(horseNumber);
      } else if (!isScratched) {
        scratched = scratched.filter(h => h !== horseNumber);
      }

      t.update(docRef, { scratchedHorses: scratched });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/active-horses', async (req, res) => {
  const { horseNumber, isActive } = req.body;
  if (horseNumber < 1 || horseNumber > 24) return res.status(400).json({ error: 'Invalid horse number' });

  try {
    let newActive = [];
    await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      const data = doc.data();
      if (data.status !== 'OPEN') throw new Error('Board is locked');

      let active = data.activeHorses ? [...data.activeHorses] : Array.from({length: 20}, (_, i) => i + 1);
      
      if (isActive && !active.includes(horseNumber)) {
        active.push(horseNumber);
        active.sort((a,b) => a - b);
      } else if (!isActive) {
        active = active.filter(h => h !== horseNumber);
      }

      newActive = active;
      t.update(docRef, { activeHorses: active });
    });
    res.json({ success: true, activeHorses: newActive });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/reset', async (req, res) => {
  await docRef.update({
    status: 'OPEN',
    horses: null,
    winHorse: null,
    showHorse: null,
    scratchedHorses: [],
    activeHorses: Array.from({length: 20}, (_, i) => i + 1),
    boxes: [],
    paidPlayers: []
  });
  res.json({ success: true });
});

app.post('/api/paid', async (req, res) => {
  const { playerName, isPaid } = req.body;
  if (!playerName) return res.status(400).json({ error: 'Invalid player name' });

  try {
    await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      const data = doc.data();
      let paid = data.paidPlayers || [];

      if (isPaid && !paid.includes(playerName)) {
        paid.push(playerName);
      } else if (!isPaid) {
        paid = paid.filter(p => p !== playerName);
      }

      t.update(docRef, { paidPlayers: paid });
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Serve Frontend in Production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
