import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BigBoard from './pages/BigBoard';
import AdminDesk from './pages/AdminDesk';
import ConfigWizard from './pages/ConfigWizard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/board" replace />} />
        <Route path="/board" element={<BigBoard />} />
        <Route path="/admin" element={<AdminDesk />} />
        <Route path="/config" element={<ConfigWizard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
