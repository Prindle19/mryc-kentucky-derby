const API_BASE = 'http://localhost:3000';

export interface Box {
  x: number;
  y: number;
  owner: string | null;
}

export interface BoardState {
  status: 'OPEN' | 'DRAWN';
  horses: number[] | null;
  winHorse?: number | null;
  showHorse?: number | null;
  pricePerBox: number;
  tipPercentage: number;
  grandPrizePercentage: number;
  scratchedHorses: number[];
  activeHorses: number[];
  boxes: Box[];
}

export const fetchBoard = async (): Promise<BoardState> => {
  const res = await fetch(`${API_BASE}/board`);
  if (!res.ok) throw new Error('Failed to fetch board');
  return res.json();
};

export const buyBoxes = async (owner: string, selections: {x: number, y: number}[]) => {
  const res = await fetch(`${API_BASE}/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, selections })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to buy');
  return data;
};

export const quickPick = async (owner: string, quantity: number) => {
  const res = await fetch(`${API_BASE}/quick-pick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, quantity })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to quick pick');
  return data;
};

export const draw = async () => {
  const res = await fetch(`${API_BASE}/draw`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to draw');
  return data;
};

export const resetBoard = async () => {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reset');
  return data;
};

export const setResults = async (winHorse?: number | null, showHorse?: number | null) => {
  const payload: any = {};
  if (winHorse !== undefined) payload.winHorse = winHorse;
  if (showHorse !== undefined) payload.showHorse = showHorse;

  const res = await fetch(`${API_BASE}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to set results');
  return data;
};

export const updateSettings = async (pricePerBox?: number, tipPercentage?: number, grandPrizePercentage?: number) => {
  const payload: any = {};
  if (pricePerBox !== undefined) payload.pricePerBox = pricePerBox;
  if (tipPercentage !== undefined) payload.tipPercentage = tipPercentage;
  if (grandPrizePercentage !== undefined) payload.grandPrizePercentage = grandPrizePercentage;

  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update settings');
  return data;
};

export const toggleScratch = async (horseNumber: number, isScratched: boolean) => {
  const res = await fetch(`${API_BASE}/scratch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ horseNumber, isScratched })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to toggle scratch');
  return data;
};

export const toggleActiveHorse = async (horseNumber: number, isActive: boolean) => {
  const res = await fetch(`${API_BASE}/active-horses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ horseNumber, isActive })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to toggle active horse');
  return data;
};

export const subscribeToBoard = (onMessage: (state: BoardState) => void) => {
  const sse = new EventSource(`${API_BASE}/events`);
  sse.onmessage = (e) => {
    const data = JSON.parse(e.data);
    onMessage(data);
  };
  return () => sse.close();
};
