import React, { useEffect, useState } from 'react';
import { fetchBoard, updateSettings, toggleActiveHorse, type BoardState } from '../api/api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}
import { useNavigate } from 'react-router-dom';

export default function ConfigWizard() {
  const navigate = useNavigate();
  const [state, setState] = useState<BoardState | null>(null);
  const [price, setPrice] = useState(3);
  const [tip, setTip] = useState(0);
  const [split, setSplit] = useState(50);

  useEffect(() => {
    fetchBoard().then(data => {
      setState(data);
      setPrice(data.pricePerBox);
      setTip(data.tipPercentage);
      setSplit(data.grandPrizePercentage);
    });
  }, []);

  const handleSave = async () => {
    try {
      await updateSettings(price, tip, split);
      navigate('/admin');
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!state) return <div className="p-10 text-white">Loading Config...</div>;

  // Financial Projections based on a Sold Out Board (Clean Denominations)
  const gridSize = state.activeHorses.length;
  const TOTAL_BOXES = (gridSize * gridSize) - gridSize;
  const grossPot = TOTAL_BOXES * price;
  
  // Tip gets exact percentage, rounded down to nearest dollar
  const tipAmount = Math.floor(grossPot * (tip / 100));
  const prizePool = grossPot - tipAmount;
  
  // Column winners always round down to the nearest $5
  const columnWinnerCount = Math.max(0, gridSize - 2);
  const rawColumnPool = prizePool * ((100 - split) / 100);
  const rawColumnPrizeEach = columnWinnerCount > 0 ? rawColumnPool / columnWinnerCount : 0;
  const columnPrizeEach = Math.floor(rawColumnPrizeEach / 5) * 5;
  const totalColumnPayout = columnPrizeEach * columnWinnerCount;
  
  // Grand Prize gets EVERYTHING ELSE in the prize pool (the odd ball)
  const grandPrize = prizePool - totalColumnPayout;

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-900 font-sans flex items-center justify-center p-6">
      <div className="max-w-5xl w-full flex flex-col gap-8">
        
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#1B365D] uppercase tracking-wider mb-2">Bookie Configuration Wizard</h1>
          <p className="text-lg text-slate-500">Fine-tune your box pricing and payout splits before opening sales.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Controls Panel */}
          <div className="flex-1 bg-white p-8 rounded-2xl shadow-md border border-slate-200">
            <h2 className="text-2xl font-bold mb-6 text-[#1B365D]">Active Roster & Parameters</h2>
            
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl">
              <label className="block text-sm font-bold text-red-800 mb-2 uppercase tracking-wider">Early Scratches</label>
              <p className="text-xs text-red-600 mb-3 font-semibold">WARNING: Removing horses will permanently shrink the grid. ONLY do this BEFORE selling any boxes, otherwise sold boxes will fall off the board!</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({length: 24}).map((_, i) => {
                   const horseNum = i + 1;
                   const isActive = state.activeHorses.includes(horseNum);
                   return (
                     <button 
                       key={horseNum}
                       onClick={async () => {
                         try {
                           const res = await toggleActiveHorse(horseNum, !isActive);
                           setState({...state, activeHorses: res.activeHorses});
                         } catch(e:any) { alert(e.message); }
                       }}
                       className={cn(
                         "w-8 h-8 rounded text-xs font-bold border transition-colors",
                         isActive ? "bg-[#1B365D] text-white border-[#0B1D3A]" : "bg-white text-slate-400 border-slate-300 opacity-50 hover:bg-slate-100 line-through"
                       )}
                     >
                       {horseNum}
                     </button>
                   );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3 font-bold">Grid Size: {gridSize}x{gridSize}</p>
            </div>
            
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Price per Box ($)</label>
              <input 
                type="number" 
                min="1"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full p-4 border-2 border-slate-200 rounded-xl text-2xl font-black focus:border-[#1B365D] focus:outline-none transition-colors"
              />
              <p className="text-xs text-slate-400 mt-2">The cost of a single box. The current grid has {TOTAL_BOXES} valid boxes.</p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Bar Staff Tip (%)</label>
                <span className="font-black text-2xl text-slate-700">{tip}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="50" step="5"
                value={tip}
                onChange={e => setTip(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1B365D]"
              />
              <p className="text-xs text-slate-400 mt-2">Percentage taken off the top of the Gross Pot for the house/staff.</p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Grand Prize Split (%)</label>
                <span className="font-black text-2xl text-yellow-600">{split}%</span>
              </div>
              <input 
                type="range" 
                min="10" max="100" step="5"
                value={split}
                onChange={e => setSplit(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <p className="text-xs text-slate-400 mt-2">Percentage of the remaining Prize Pool awarded to the EXACTA winner. The other {100 - split}% is divided evenly among the other {columnWinnerCount} column winners.</p>
            </div>

            <button 
              onClick={handleSave}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl rounded-xl shadow-lg transition-colors"
            >
              SAVE CONFIGURATION & RETURN
            </button>
          </div>

          {/* Projection Dashboard */}
          <div className="flex-1 bg-[#1B365D] text-white p-8 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">📈</span>
                <h2 className="text-2xl font-bold text-emerald-400 uppercase tracking-wider">Live Financial Preview</h2>
              </div>
              <p className="text-slate-400 text-sm mb-8 border-b border-white/10 pb-4">
                These are the projected payouts assuming a completely sold out board ({TOTAL_BOXES} boxes).
              </p>

              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-end">
                  <span className="text-lg text-slate-300 font-medium">Gross Pot Collected:</span>
                  <span className="text-3xl font-black">{grossPot.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</span>
                </div>
                
                <div className="flex justify-between items-end text-red-400">
                  <span className="text-lg font-medium">Minus Staff Tip ({tip}%):</span>
                  <span className="text-3xl font-black">-{tipAmount.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</span>
                </div>

                <div className="border-t border-white/20 pt-6 flex justify-between items-end">
                  <span className="text-xl text-emerald-300 font-bold uppercase tracking-wider">Total Prize Pool:</span>
                  <span className="text-4xl text-emerald-400 font-black">{prizePool.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 p-6 rounded-xl mt-8 border border-white/10">
              <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-4">Winner Payouts</h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-400 font-bold">1x Grand Prize (Exacta)</span>
                  <span className="text-3xl font-black text-yellow-400">{grandPrize.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">{columnWinnerCount}x Column Winners (Each)</span>
                  <span className="text-2xl font-bold text-white">{columnPrizeEach.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
