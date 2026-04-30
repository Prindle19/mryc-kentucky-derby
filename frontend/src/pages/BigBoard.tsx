import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { subscribeToBoard, type BoardState } from '../api/api';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const getSaddleClothStyle = (horseNumber: number) => {
  switch (horseNumber) {
    case 1: return { bg: '#E53935', text: '#FFFFFF' };
    case 2: return { bg: '#FFFFFF', text: '#000000', border: '#E0E0E0' };
    case 3: return { bg: '#1E3A8A', text: '#FFFFFF' };
    case 4: return { bg: '#FACC15', text: '#000000' };
    case 5: return { bg: '#16A34A', text: '#FFFFFF' };
    case 6: return { bg: '#000000', text: '#FACC15' };
    case 7: return { bg: '#F97316', text: '#000000' };
    case 8: return { bg: '#F472B6', text: '#000000' };
    case 9: return { bg: '#2DD4BF', text: '#000000' };
    case 10: return { bg: '#7E22CE', text: '#FFFFFF' };
    case 11: return { bg: '#9CA3AF', text: '#DC2626' };
    case 12: return { bg: '#A3E635', text: '#000000' };
    case 13: return { bg: '#452B11', text: '#FFFFFF' };
    case 14: return { bg: '#7F1D1D', text: '#FACC15' };
    case 15: return { bg: '#E5E5CB', text: '#000000' };
    case 16: return { bg: '#93C5FD', text: '#EA580C' };
    case 17: return { bg: '#172554', text: '#FFFFFF' };
    case 18: return { bg: '#14532D', text: '#FACC15' };
    case 19: return { bg: '#2563EB', text: '#DC2626' };
    case 20: return { bg: '#D946EF', text: '#FACC15' };
    case 21: return { bg: '#D8B4E2', text: '#1E3A8A' };
    case 22: return { bg: '#0284C7', text: '#FFFFFF' };
    case 23: return { bg: '#BEE3DB', text: '#064E3B' };
    case 24: return { bg: '#4B5320', text: '#FFFFFF' };
    default: return { bg: '#333333', text: '#FFFFFF' };
  }
};

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

  const isBoxScratched = (x: number, y: number) => {
    if (!state.horses) return false;
    const horseX = state.horses[x];
    const horseY = state.horses[y];
    return !!state.scratchedHorses?.includes(horseX) || !!state.scratchedHorses?.includes(horseY);
  };

  const gridSize = state.activeHorses ? state.activeHorses.length : 20;
  const validSoldBoxes = state.boxes.filter(b => b.owner && b.x !== b.y && b.x < gridSize && b.y < gridSize && !isBoxScratched(b.x, b.y));
  const totalSold = validSoldBoxes.length;
  const totalBoxes = (gridSize * gridSize) - gridSize;
  const pot = totalSold * (state.pricePerBox || 3);
  
  const tipAmount = Math.floor(pot * ((state.tipPercentage || 0) / 100));
  const houseAmount = Math.floor(pot * ((state.housePercentage || 0) / 100));
  const prizePool = pot - tipAmount - houseAmount;
  
  const columnWinnerCount = Math.max(0, gridSize - 2);
  const rawColumnPool = prizePool * ((100 - (state.grandPrizePercentage || 50)) / 100);
  const rawColumnPrizeEach = columnWinnerCount > 0 ? rawColumnPool / columnWinnerCount : 0;
  const columnPrizeEach = Math.floor(rawColumnPrizeEach / 5) * 5; // Round down to nearest $5
  
  const totalColumnPayout = columnPrizeEach * columnWinnerCount;
  const grandPrize = prizePool - totalColumnPayout; // Grand prize absorbs the odd dollars

  const isDesktop = windowSize.width >= 1024;

  return (
    <div className="h-[100dvh] w-screen bg-[#f0f4f8] flex flex-col items-center justify-center overflow-hidden font-sans text-white">
      <div 
        className="relative bg-[#1B365D] border border-white/20 shadow-[0_0_40px_rgba(27,54,93,0.3)] flex flex-col w-full h-full lg:w-auto lg:h-[98vh] lg:aspect-video lg:rounded-xl overflow-hidden"
      >
        {/* Header section */}
        <div className="h-auto lg:h-[12%] flex flex-col lg:flex-row items-center justify-between p-2 lg:px-8 bg-white border-b-4 border-[#1B365D] gap-2 lg:gap-0 z-10 shrink-0">
          <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-8 h-full lg:py-3 text-center lg:text-left">
            <img src="/burgee.png" alt="MRYC Burgee" className="h-10 sm:h-12 lg:h-full w-auto object-contain flex-shrink-0" />
            <div className="flex flex-col justify-center gap-0 lg:gap-1">
               <span className="text-xl sm:text-2xl lg:text-[3rem] leading-none font-serif text-[#0B1D3A] uppercase tracking-[0.05em]" style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>Manasquan River Yacht Club</span>
               <span className="text-[0.6rem] sm:text-sm lg:text-base text-slate-500 font-bold tracking-[0.1em] lg:tracking-[0.3em] uppercase lg:mt-1">Kentucky Derby Exacta Box Pool</span>
            </div>
          </div>
          <div className="flex gap-4 lg:gap-16 text-center bg-slate-50 lg:bg-transparent w-full lg:w-auto justify-center p-2 lg:p-0 rounded-lg border lg:border-none border-slate-200">
            <div className="flex flex-col items-center justify-center">
              <div className="text-[0.6rem] lg:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0 lg:mb-1">Status</div>
              <div className={cn(
                "text-sm sm:text-base lg:text-2xl font-black uppercase tracking-wider", 
                (state.winHorse && state.showHorse) ? "text-yellow-500 drop-shadow-md scale-110 transition-transform" :
                state.winHorse ? "text-emerald-500 drop-shadow-sm" :
                state.status === 'DRAWN' ? "text-emerald-600" : "text-[#1B365D]"
              )}>
                {(state.winHorse && state.showHorse) ? 'OFFICIAL' :
                 state.winHorse ? '1ST REVEALED' :
                 state.status === 'DRAWN' ? 'DRAWN' : 'SALES OPEN'}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-[0.6rem] lg:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0 lg:mb-1">Sold</div>
              <div className="text-sm sm:text-base lg:text-2xl font-black text-[#1B365D]">{totalSold} <span className="text-slate-400 text-xs lg:text-lg">/ {totalBoxes}</span></div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-[0.6rem] lg:text-xs text-slate-400 font-bold uppercase tracking-wider mb-0 lg:mb-1">Total Pot</div>
              <div className="text-sm sm:text-base lg:text-2xl font-black text-emerald-600 drop-shadow-sm">${pot}</div>
            </div>
          </div>
        </div>

        {/* Board section */}
        <div className="flex-1 overflow-hidden relative">
          <TransformWrapper
            key={isDesktop ? 'desktop' : 'mobile'}
            initialScale={isDesktop ? 1 : 0.6}
            minScale={isDesktop ? 1 : 0.2}
            maxScale={4}
            centerOnInit={true}
            wheel={{ step: 0.1, disabled: isDesktop }}
            pinch={{ step: 5 }}
            panning={{ disabled: isDesktop }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="absolute top-2 right-2 z-50 flex gap-2 opacity-70 hover:opacity-100 transition-opacity lg:hidden">
                  <button className="bg-black/40 px-3 py-1 rounded text-white backdrop-blur-sm font-black" onClick={() => zoomIn()}>+</button>
                  <button className="bg-black/40 px-3 py-1 rounded text-white backdrop-blur-sm font-black" onClick={() => zoomOut()}>-</button>
                  <button className="bg-black/40 px-3 py-1 rounded text-white backdrop-blur-sm text-xs font-bold" onClick={() => resetTransform()}>RESET</button>
                </div>
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full min-w-max min-h-max lg:min-w-full lg:min-h-full">
                  <div className="w-[1000px] h-[750px] lg:w-full lg:h-full flex p-2 pb-4 pr-4">
                    
                    {/* Y Axis Title Area (Leftmost) */}
                    <div className="w-8 lg:w-12 flex items-center justify-center relative">
                       <div className="-rotate-90 text-white/80 font-black tracking-[0.2em] lg:tracking-[0.3em] text-sm lg:text-xl uppercase whitespace-nowrap absolute">
                          SHOW (2nd Place)
                       </div>
                    </div>
          
          <div className="flex-1 flex flex-col">
            
            {/* Top Area: X Axis Title + X Axis Labels */}
            <div className="flex flex-col mb-1">
                {/* Title */}
                <div className="text-center text-white/80 font-black tracking-[0.2em] lg:tracking-[0.3em] text-sm lg:text-xl uppercase leading-none pb-2 pl-8 lg:pl-12">
                   WIN (1st Place)
                </div>
                {/* Labels */}
                <div className="flex">
                  {/* Empty spacer for Y Axis Label column */}
                  <div className="w-8 pr-1" />
                  {/* Actual X labels */}
                  <div className="flex-1 flex gap-[2px] px-[2px]">
                    {Array.from({length: gridSize}).map((_, i) => {
                      const horseNum = state.horses ? state.horses[i] : null;
                      const style = horseNum ? getSaddleClothStyle(horseNum) : { bg: 'transparent', text: 'rgba(255,255,255,0.8)' };
                      const isScratched = horseNum && state.scratchedHorses?.includes(horseNum);
                      return (
                        <div 
                          key={i} 
                          className={cn(
                            "flex-1 flex items-center justify-center font-black text-sm lg:text-lg rounded-sm transition-all",
                            horseNum ? "shadow-md" : "drop-shadow-sm",
                            !!isScratched && "opacity-30 grayscale line-through"
                          )}
                          style={{
                            backgroundColor: style.bg,
                            color: style.text,
                            border: style.border ? `1px solid ${style.border}` : 'none'
                          }}
                        >
                           {horseNum || '?'}
                        </div>
                      );
                    })}
                  </div>
                </div>
            </div>

            {/* Bottom Area: Y Axis Labels + Grid */}
            <div className="flex-1 flex">
              {/* Y Axis Labels */}
              <div className="w-8 flex flex-col gap-[2px] py-[2px] pr-1">
                {Array.from({length: gridSize}).map((_, i) => {
                  const horseNum = state.horses ? state.horses[i] : null;
                  const style = horseNum ? getSaddleClothStyle(horseNum) : { bg: 'transparent', text: 'rgba(255,255,255,0.8)' };
                  const isScratched = horseNum && state.scratchedHorses?.includes(horseNum);
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 flex items-center font-black text-sm lg:text-lg rounded-sm transition-all",
                        horseNum ? "justify-center shadow-md" : "justify-end pr-1 drop-shadow-sm",
                        !!isScratched && "opacity-30 grayscale line-through"
                      )}
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                        border: style.border ? `1px solid ${style.border}` : 'none'
                      }}
                    >
                       {horseNum || '?'}
                    </div>
                  );
                })}
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

                  {Array.from({length: gridSize}).map((_, y) => (
                    <div key={y} className="flex-1 flex gap-[2px]">
                       {Array.from({length: gridSize}).map((_, x) => {
                         const isDiagonal = x === y;
                         const box = state.boxes.find(b => b.x === x && b.y === y);
                         const isSold = box?.owner;
                         
                         const winX = state.horses?.indexOf(state.winHorse || -1);
                         const showY = state.horses?.indexOf(state.showHorse || -1);

                         const isWinColumn = state.winHorse != null && x === winX && !isDiagonal;
                         const isExactaMatch = isWinColumn && state.showHorse != null && y === showY;
                         
                         // If any result is revealed, dim boxes that aren't in the winning column
                         const isDimmed = state.winHorse != null && !isWinColumn && !isDiagonal;
                         const isScratched = isBoxScratched(x, y);

                         return (
                           <div 
                             key={`${x}-${y}`} 
                             className={cn(
                               "flex-1 flex items-center justify-center text-[0.65rem] lg:text-xs font-bold truncate px-1 rounded-sm transition-all duration-700",
                               isDiagonal ? "bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.2),rgba(0,0,0,0.2)_4px,rgba(255,255,255,0.02)_4px,rgba(255,255,255,0.02)_8px)] bg-[#0D1A2E] border border-[#0D1A2E]" :
                               isScratched ? "bg-slate-800 text-white/30 line-through opacity-60 border border-slate-700" :
                               isExactaMatch ? "bg-yellow-400 text-black shadow-[0_0_30px_rgba(250,204,21,1)] scale-125 z-40 border-2 border-white text-sm lg:text-base" :
                               isWinColumn ? "bg-[#4ADE80] text-[#064e3b] shadow-[0_0_15px_rgba(74,222,128,0.8)] z-20 border border-emerald-300 scale-105" :
                               isSold ? "bg-[#88D4AB] text-[#0A1F3F] border border-[#65C292]" :
                               "bg-[#224476] border border-[#2A528A] text-white/50",
                               isDimmed && !isExactaMatch && !isScratched && "opacity-20 grayscale scale-95"
                             )}
                           >
                             {isDiagonal ? '' : (isSold ? box.owner?.substring(0,10) : '')}
                           </div>
                         );
                       })}
                    </div>
                  ))}
              </div>
            </div>
          </div>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
    </div>
  );
}
