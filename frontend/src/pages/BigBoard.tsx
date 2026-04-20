import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { subscribeToBoard, type BoardState } from '../api/api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function BigBoard() {
  const [state, setState] = useState<BoardState | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToBoard(setState);
    return unsubscribe;
  }, []);

  if (!state) return <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white text-3xl">Loading Board...</div>;

  const totalSold = state.boxes.filter(b => b.owner && b.x !== b.y).length;
  const totalBoxes = 380;
  const pot = totalSold * (state.pricePerBox || 3);
  
  const tipAmount = Math.floor(pot * ((state.tipPercentage || 0) / 100));
  const prizePool = pot - tipAmount;
  
  const rawColumnPool = prizePool * ((100 - (state.grandPrizePercentage || 50)) / 100);
  const columnPrizeEach = Math.floor((rawColumnPool / 18) / 5) * 5; // Round down to nearest $5
  
  const totalColumnPayout = columnPrizeEach * 18;
  const grandPrize = prizePool - totalColumnPayout; // Grand prize absorbs the odd dollars

  return (
    <div className="h-screen w-screen bg-[#f0f4f8] flex flex-col items-center justify-center overflow-hidden font-sans text-white">
      <div 
        className="relative bg-[#1B365D] border border-white/20 shadow-[0_0_40px_rgba(27,54,93,0.3)] flex flex-col"
        style={{
          aspectRatio: '16/9',
          height: '98vh',
        }}
      >
        {/* Header section */}
        <div className="h-[12%] flex items-center justify-between px-8 bg-white border-b-4 border-[#1B365D]">
          <div className="flex items-center gap-8 h-full py-3">
            <img src="/burgee.png" alt="MRYC Burgee" className="h-full w-auto object-contain flex-shrink-0" />
            <div className="flex flex-col justify-center gap-1">
               <span className="text-4xl lg:text-[3rem] leading-none font-serif text-[#0B1D3A] uppercase tracking-[0.05em]" style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Manasquan River Yacht Club</span>
               <span className="text-sm lg:text-base text-slate-500 font-bold tracking-[0.3em] uppercase mt-1">Kentucky Derby Exacta Box Pool</span>
            </div>
          </div>
          <div className="flex gap-16 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Status</div>
              <div className={cn(
                "text-2xl font-black uppercase tracking-wider", 
                (state.winHorse && state.showHorse) ? "text-yellow-500 drop-shadow-md scale-110 transition-transform" :
                state.winHorse ? "text-emerald-500 drop-shadow-sm" :
                state.status === 'DRAWN' ? "text-emerald-600" : "text-[#1B365D]"
              )}>
                {(state.winHorse && state.showHorse) ? 'RESULTS OFFICIAL' :
                 state.winHorse ? '1ST PLACE REVEALED' :
                 state.status === 'DRAWN' ? 'LOCKED & DRAWN' : 'SALES OPEN'}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Sold</div>
              <div className="text-2xl font-black text-[#1B365D]">{totalSold} <span className="text-slate-400 text-lg">/ {totalBoxes}</span></div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Total Pot</div>
              <div className="text-2xl font-black text-emerald-600 drop-shadow-sm">${pot}</div>
            </div>
          </div>
        </div>

        {/* Board section */}
        <div className="flex-1 flex p-2 pb-4 pr-4">
          
          {/* Y Axis Title Area (Leftmost) */}
          <div className="w-12 flex items-center justify-center relative">
             <div className="-rotate-90 text-white/80 font-black tracking-[0.3em] text-xl uppercase whitespace-nowrap absolute">
                SHOW (2nd Place)
             </div>
          </div>
          
          <div className="flex-1 flex flex-col">
            
            {/* Top Area: X Axis Title + X Axis Labels */}
            <div className="flex flex-col mb-1">
                {/* Title */}
                <div className="text-center text-white/80 font-black tracking-[0.3em] text-xl uppercase leading-none pb-2 pl-8">
                   WIN (1st Place)
                </div>
                {/* Labels */}
                <div className="flex">
                  {/* Empty spacer for Y Axis Label column */}
                  <div className="w-8 pr-1" />
                  {/* Actual X labels */}
                  <div className="flex-1 flex gap-[2px] px-[2px]">
                    {Array.from({length: 20}).map((_, i) => (
                      <div key={i} className="flex-1 flex items-center justify-center font-black text-white/80 text-sm lg:text-lg drop-shadow-sm">
                         {state.horses ? state.horses[i] : '?'}
                      </div>
                    ))}
                  </div>
                </div>
            </div>

            {/* Bottom Area: Y Axis Labels + Grid */}
            <div className="flex-1 flex">
              {/* Y Axis Labels */}
              <div className="w-8 flex flex-col gap-[2px] py-[2px] pr-1">
                {Array.from({length: 20}).map((_, i) => (
                  <div key={i} className="flex-1 flex items-center justify-end font-black text-white/80 text-sm lg:text-lg drop-shadow-sm">
                     {state.horses ? state.horses[i] : '?'}
                  </div>
                ))}
              </div>

              {/* 20x20 Grid */}
              <div className="flex-1 flex flex-col gap-[2px] bg-[#112444] p-[2px] rounded-md shadow-inner relative overflow-hidden">
                  
                  {/* Phase 1 Popup: Column Winners */}
                  {state.winHorse != null && state.showHorse == null && (() => {
                     const winX = state.horses?.indexOf(state.winHorse);
                     const columnWinners = state.boxes.filter(b => b.x === winX && b.x !== b.y && b.owner);
                     return (
                       <div className="absolute z-50 right-8 top-1/2 -translate-y-1/2 bg-[#0B1D3A]/95 p-6 border-4 border-emerald-400 rounded-2xl shadow-[0_0_50px_rgba(52,211,153,0.5)] flex flex-col items-center w-[350px]">
                         <h2 className="text-2xl font-black text-emerald-400 mb-1 uppercase tracking-widest text-center">Column Winners!</h2>
                         <div className="text-lg font-bold text-white mb-4 text-center">Winning {columnPrizeEach.toLocaleString('en-US', {style: 'currency', currency: 'USD'})} each</div>
                         <div className="w-full flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-2">
                            {columnWinners.map(b => (
                              <div key={`${b.x}-${b.y}`} className="bg-white/10 px-3 py-2 rounded text-base font-semibold text-emerald-100 flex justify-between">
                                <span className="truncate mr-2">{b.owner}</span>
                                <span className="flex-shrink-0">+{columnPrizeEach.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</span>
                              </div>
                            ))}
                         </div>
                       </div>
                     );
                  })()}

                  {/* Phase 2 Popup: Grand Prize Winner */}
                  {state.winHorse != null && state.showHorse != null && (() => {
                     const winX = state.horses?.indexOf(state.winHorse);
                     const showY = state.horses?.indexOf(state.showHorse);
                     const exactWinner = state.boxes.find(b => b.x === winX && b.y === showY);
                     return (
                       <div className="absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 p-12 border-8 border-white rounded-3xl shadow-[0_0_100px_rgba(250,204,21,1)] flex flex-col items-center animate-bounce">
                         <h2 className="text-4xl lg:text-5xl font-black text-[#0B1D3A] mb-4 uppercase tracking-widest text-center drop-shadow-md">Grand Prize Winner!</h2>
                         <div className="text-6xl lg:text-8xl font-black text-white mb-6 drop-shadow-xl text-center truncate max-w-[80vw]" style={{ WebkitTextStroke: '2px #0B1D3A' }}>
                            {exactWinner?.owner ? exactWinner.owner : "UNSOLD BOX"}
                         </div>
                         <div className="text-4xl lg:text-5xl font-black text-[#0B1D3A] px-8 py-4 bg-white/50 rounded-2xl border-4 border-[#0B1D3A]/20">
                           Wins {grandPrize.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                         </div>
                       </div>
                     );
                  })()}

                  {/* Confetti overlay locked to the grid area if desired, or screen-wide. Screen-wide is better. */}
                  {state.showHorse && (
                    <div className="fixed inset-0 pointer-events-none z-50">
                      <Confetti 
                        width={windowSize.width} 
                        height={windowSize.height} 
                        recycle={false} 
                        numberOfPieces={400} 
                        gravity={0.12} 
                        drawShape={ctx => {
                          ctx.font = '35px serif';
                          ctx.fillText('🌹', -17, 12);
                        }}
                      />
                    </div>
                  )}

                  {Array.from({length: 20}).map((_, y) => (
                    <div key={y} className="flex-1 flex gap-[2px]">
                       {Array.from({length: 20}).map((_, x) => {
                         const isDiagonal = x === y;
                         const box = state.boxes.find(b => b.x === x && b.y === y);
                         const isSold = box?.owner;
                         
                         const winX = state.horses?.indexOf(state.winHorse || -1);
                         const showY = state.horses?.indexOf(state.showHorse || -1);

                         const isWinColumn = state.winHorse != null && x === winX && !isDiagonal;
                         const isExactaMatch = isWinColumn && state.showHorse != null && y === showY;
                         
                         // If any result is revealed, dim boxes that aren't in the winning column
                         const isDimmed = state.winHorse != null && !isWinColumn && !isDiagonal;

                         return (
                           <div 
                             key={`${x}-${y}`} 
                             className={cn(
                               "flex-1 flex items-center justify-center text-[0.65rem] lg:text-xs font-bold truncate px-1 rounded-sm transition-all duration-700",
                               isDiagonal ? "bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.2),rgba(0,0,0,0.2)_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)] bg-[#0D1A2E] border border-[#0D1A2E]" :
                               isExactaMatch ? "bg-yellow-400 text-black shadow-[0_0_30px_rgba(250,204,21,1)] scale-125 z-40 border-2 border-white text-sm lg:text-base" :
                               isWinColumn ? "bg-[#4ADE80] text-[#064e3b] shadow-[0_0_15px_rgba(74,222,128,0.8)] z-20 border border-emerald-300 scale-105" :
                               isSold ? "bg-[#88D4AB] text-[#0A1F3F] border border-[#65C292]" :
                               "bg-[#224476] border border-[#2A528A] text-white/50",
                               isDimmed && !isExactaMatch && "opacity-20 grayscale scale-95"
                             )}
                           >
                             {isDiagonal ? '' : (isSold ? box.owner.substring(0,10) : '')}
                           </div>
                         );
                       })}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
