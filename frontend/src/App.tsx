import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BigBoard from './pages/BigBoard';
import AdminDesk from './pages/AdminDesk';
import ConfigWizard from './pages/ConfigWizard';

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === 'BAFFERT');
  const [password, setPassword] = useState('');

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-8 border-[#1B365D]">
        <h2 className="text-2xl font-black text-[#1B365D] mb-6 text-center uppercase tracking-wider">Bookie Login</h2>
        <form onSubmit={e => {
          e.preventDefault();
          if (password.toUpperCase() === 'BAFFERT') {
            sessionStorage.setItem('admin_auth', 'BAFFERT');
            setAuthed(true);
          } else {
            alert('Incorrect password');
            setPassword('');
          }
        }}>
          <input 
            type="password" 
            placeholder="Enter Master Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-4 border-2 border-slate-200 rounded-xl mb-4 text-center text-xl font-bold text-slate-900 bg-white focus:border-[#1B365D] focus:outline-none"
          />
          <button type="submit" className="w-full py-4 bg-[#1B365D] hover:bg-slate-800 transition-colors text-white text-xl font-black rounded-xl uppercase tracking-widest shadow-lg">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/board" replace />} />
        <Route path="/board" element={<BigBoard />} />
        <Route path="/admin" element={<AuthWrapper><AdminDesk /></AuthWrapper>} />
        <Route path="/config" element={<AuthWrapper><ConfigWizard /></AuthWrapper>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
