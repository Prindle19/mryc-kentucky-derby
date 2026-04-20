import { fetchBoard, buyBoxes, quickPick, draw, resetBoard, setResults, type BoardState, type Box } from '../api/api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function AdminDesk() {
  const navigate = useNavigate();
  const [state, setState] = useState<BoardState | null>(null);
  const [pending, setPending] = useState<Box[]>([]);
  const [player, setPlayer] = useState('');
  const [qpQty, setQpQty] = useState(1);
  
  const [winSelection, setWinSelection] = useState<number>(0);
  const [showSelection, setShowSelection] = useState<number>(0);
  
  // Viewport is 10x10. Coordinates are top-left corner. Max is 10.
  const [vpX, setVpX] = useState(0);
  const [vpY, setVpY] = useState(0);

  const loadBoard = async () => {
    const data = await fetchBoard();
    setState(data);
  };

  useEffect(() => {
    loadBoard();
    const interval = setInterval(loadBoard, 2000); // Poll for admin desk to keep it simple and robust, or could use SSE
    return () => clearInterval(interval);
  }, []);

  if (!state) return <div className="p-10 text-white">Loading Admin...</div>;

  const handleBoxClick = (x: number, y: number) => {
    if (x === y) return; // diagonal
    if (state.boxes.find(b => b.x === x && b.y === y)?.owner) return; // sold
    
    if (pending.some(p => p.x === x && p.y === y)) {
      setPending(pending.filter(p => !(p.x === x && p.y === y)));
    } else {
      setPending([...pending, { x, y }]);
    }
  };

  const commitManual = async () => {
    if (!player) return alert('Enter a player name');
    if (pending.length === 0) return alert('Select boxes first');
    try {
      await buyBoxes(player, pending);
      setPending([]);
      setPlayer('');
      loadBoard();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const commitQuickPick = async () => {
    if (!player) return alert('Enter a player name');
    if (qpQty < 1 || qpQty > 380) return alert('Invalid quantity');
    try {
      await quickPick(player, qpQty);
      setPlayer('');
      setQpQty(1);
      loadBoard();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const doDraw = async () => {
    if (!confirm('Are you sure you want to lock the board and draw numbers? This cannot be undone!')) return;
    try {
      await draw();
      loadBoard();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const doReset = async () => {
    if (prompt('Type "NUCLEAR" to wipe the board completely') !== 'NUCLEAR') return;
    try {
      await resetBoard();
      loadBoard();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const publishWin = async () => {
    if (!winSelection) return;
    try {
      await setResults(winSelection, undefined);
      loadBoard();
    } catch (e: any) { alert(e.message); }
  };

  const publishShow = async () => {
    if (!showSelection) return;
    if (showSelection === state.winHorse) return alert('Show horse cannot be the same as Win horse');
    try {
      await setResults(undefined, showSelection);
      loadBoard();
    } catch (e: any) { alert(e.message); }
  };

  const clearResults = async () => {
    if (!confirm('Are you sure you want to clear the results?')) return;
    try {
      await setResults(null, null);
      setWinSelection(0);
      setShowSelection(0);
      loadBoard();
    } catch (e: any) { alert(e.message); }
  };

  // Mini-map click to move viewport
  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    
    // xRatio maps to 0-19. We want the center of the 10x10 viewport to be at the click.
    let newX = Math.floor(xRatio * 20) - 5;
    let newY = Math.floor(yRatio * 20) - 5;
    
    newX = Math.max(0, Math.min(10, newX));
    newY = Math.max(0, Math.min(10, newY));
    
    setVpX(newX);
    setVpY(newY);
  };

  const availableBoxes = 380 - state.boxes.filter(b => b.owner).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-4">
            Bookie Desk: Box Pool
            <button onClick={() => navigate('/config')} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors flex items-center gap-2">
              ⚙️ Configure Payouts
            </button>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Available: {availableBoxes} / 380 | Status: {state.status}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={doDraw} disabled={state.status === 'DRAWN'} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded shadow disabled:opacity-50">
            LOCK & DRAW
          </button>
          <button onClick={doReset} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow">
            FULL RESET
          </button>
        </div>
      </header>

      <main className="flex-1 flex p-6 gap-6 h-[calc(100vh-80px)]">
        
        {/* Left Col: Controls & Minimap */}
        <div className="w-80 flex flex-col gap-6">
          
          {state.status === 'DRAWN' ? (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h2 className="font-bold text-xl mb-4 text-slate-800">Race Results</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-500 mb-2">1st Place (WIN) Horse</label>
                <select 
                  className="w-full p-3 border border-slate-300 rounded-lg text-lg font-semibold"
                  value={winSelection}
                  onChange={e => setWinSelection(Number(e.target.value))}
                  disabled={state.winHorse != null}
                >
                  <option value={0}>-- Select Horse --</option>
                  {state.horses?.map(h => <option key={h} value={h}>Horse {h}</option>)}
                </select>
                <button 
                  onClick={publishWin}
                  disabled={!winSelection || state.winHorse != null}
                  className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow disabled:opacity-50"
                >
                  Reveal 1st Place (WIN)
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-500 mb-2">2nd Place (SHOW) Horse</label>
                <select 
                  className="w-full p-3 border border-slate-300 rounded-lg text-lg font-semibold"
                  value={showSelection}
                  onChange={e => setShowSelection(Number(e.target.value))}
                  disabled={state.showHorse != null || state.winHorse == null}
                >
                  <option value={0}>-- Select Horse --</option>
                  {state.horses?.map(h => <option key={h} value={h}>Horse {h}</option>)}
                </select>
                <button 
                  onClick={publishShow}
                  disabled={!showSelection || state.showHorse != null || state.winHorse == null}
                  className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg shadow disabled:opacity-50"
                >
                  Reveal 2nd Place (EXACTA!)
                </button>
              </div>

              {(state.winHorse != null || state.showHorse != null) && (
                <button 
                  onClick={clearResults}
                  className="w-full mt-4 py-2 text-red-500 hover:bg-red-50 rounded font-bold"
                >
                  Clear Results (Mistake)
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="font-bold text-lg mb-4">Player Details</h2>
                <input 
                  type="text" 
                  placeholder="Player Name" 
                  value={player}
                  onChange={e => setPlayer(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-lg font-semibold"
                />
              </div>

              {/* Checkout Panel */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="font-bold text-lg mb-4">Manual Selection</h2>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-sm text-slate-500">Pending Boxes</div>
                    <div className="text-3xl font-black">{pending.length}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Total Owed</div>
                    <div className="text-3xl font-black text-emerald-600">${pending.length * state.pricePerBox}</div>
                  </div>
                </div>
                <button 
                  onClick={commitManual}
                  disabled={pending.length === 0 || !player || state.status === 'DRAWN'}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-lg shadow disabled:opacity-50"
                >
                  Commit Selection
                </button>
                {pending.length > 0 && (
                   <button onClick={() => setPending([])} className="w-full mt-2 py-2 text-slate-500 hover:bg-slate-100 rounded">Clear Pending</button>
                )}
              </div>

              {/* Quick Pick */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h2 className="font-bold text-lg mb-4">Quick Pick</h2>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="number" 
                    min="1" max={availableBoxes} 
                    value={qpQty}
                    onChange={e => setQpQty(parseInt(e.target.value) || 1)}
                    className="w-24 p-2 border border-slate-300 rounded-lg text-lg font-semibold text-center"
                  />
                  <div className="flex-1 flex flex-col justify-center bg-slate-50 rounded-lg px-3 text-right border border-slate-100">
                    <div className="text-xs text-slate-500">Owed</div>
                    <div className="font-bold text-emerald-600">${qpQty * state.pricePerBox}</div>
                  </div>
                </div>
                <button 
                  onClick={commitQuickPick}
                  disabled={!player || state.status === 'DRAWN'}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-lg shadow disabled:opacity-50"
                >
                  Buy Quick Picks
                </button>
              </div>
            </>
          )}

          {/* Minimap */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
             <h2 className="font-bold text-lg mb-2">Mini-Map</h2>
             <div className="flex-1 relative bg-slate-200 rounded overflow-hidden cursor-crosshair border border-slate-300" onClick={handleMiniMapClick}>
               {/* Minimap grid dots */}
               <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-[repeat(20,minmax(0,1fr))] gap-px p-1">
                 {Array.from({length: 400}).map((_, i) => {
                   const x = i % 20;
                   const y = Math.floor(i / 20);
                   const isDiag = x === y;
                   const isSold = state.boxes.find(b => b.x === x && b.y === y)?.owner;
                   const isPending = pending.some(p => p.x === x && p.y === y);
                   return (
                     <div key={i} className={cn(
                       "w-full h-full",
                       isDiag ? "bg-slate-400" :
                       isPending ? "bg-yellow-400" :
                       isSold ? "bg-emerald-500" :
                       "bg-white"
                     )} />
                   );
                 })}
               </div>
               {/* Viewport Outline */}
               <div 
                 className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none transition-all duration-200"
                 style={{
                   left: `calc( ${vpX} * 5% + 4px )`,
                   top: `calc( ${vpY} * 5% + 4px )`,
                   width: 'calc( 50% - 8px )',
                   height: 'calc( 50% - 8px )'
                 }}
               />
             </div>
          </div>
        </div>

        {/* Right Col: Zoomed Grid (10x10) */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
           <div className="flex justify-between items-end mb-4">
             <h2 className="font-bold text-2xl">Viewport</h2>
             <div className="flex gap-2">
               <button onClick={() => {setVpX(Math.max(0, vpX-1));}} className="p-2 bg-slate-100 rounded hover:bg-slate-200">←</button>
               <button onClick={() => {setVpX(Math.min(10, vpX+1));}} className="p-2 bg-slate-100 rounded hover:bg-slate-200">→</button>
               <button onClick={() => {setVpY(Math.max(0, vpY-1));}} className="p-2 bg-slate-100 rounded hover:bg-slate-200">↑</button>
               <button onClick={() => {setVpY(Math.min(10, vpY+1));}} className="p-2 bg-slate-100 rounded hover:bg-slate-200">↓</button>
             </div>
           </div>
           
           <div className="flex-1 grid grid-cols-10 grid-rows-10 gap-1 bg-slate-300 p-1 rounded-lg">
             {Array.from({length: 100}).map((_, i) => {
               const localX = i % 10;
               const localY = Math.floor(i / 10);
               const x = vpX + localX;
               const y = vpY + localY;
               
               const isDiag = x === y;
               const box = state.boxes.find(b => b.x === x && b.y === y);
               const isSold = !!box?.owner;
               const isPending = pending.some(p => p.x === x && p.y === y);

               return (
                 <button
                   key={i}
                   onClick={() => handleBoxClick(x, y)}
                   disabled={isDiag || isSold || state.status === 'DRAWN'}
                   className={cn(
                     "rounded relative flex flex-col items-center justify-center font-bold text-sm overflow-hidden transition-colors",
                     isDiag ? "bg-slate-400 cursor-not-allowed border border-slate-500" :
                     isSold ? "bg-emerald-500 text-white cursor-not-allowed border border-emerald-600" :
                     isPending ? "bg-yellow-400 text-yellow-900 border-2 border-yellow-500 cursor-pointer" :
                     "bg-white hover:bg-blue-50 text-slate-400 border border-slate-200 cursor-pointer shadow-sm hover:border-blue-300"
                   )}
                 >
                   {isDiag ? (
                      <span className="opacity-50">N/A</span>
                   ) : isSold ? (
                      <span className="truncate w-full px-1">{box.owner}</span>
                   ) : isPending ? (
                      <span>Pending</span>
                   ) : (
                      <span className="opacity-0 group-hover:opacity-100 text-xs">+{player ? 'Select' : ''}</span>
                   )}
                   {/* Coordinates tooltip or small label */}
                   <div className="absolute top-0.5 left-1 text-[0.6rem] opacity-30 pointer-events-none">
                     {x},{y}
                   </div>
                 </button>
               );
             })}
           </div>
        </div>

      </main>
    </div>
  );
}
