import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard.tsx';
import Fleet from './pages/Fleet.jsx';
import NewEntry from './pages/NewEntry.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/fleet" element={<Fleet />} />
      <Route path="/new-entry" element={<NewEntry />} />
      <Route path="/dashoard" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}