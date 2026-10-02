import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api, { withToken } from './lib/api';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import SalesRecord from './pages/SalesRecord';
import Settings from './pages/Settings';

const AdminOnlyRoute = ({ user, children }) => (
  user?.role === 'admin' ? children : <Navigate to="/billing" replace />
);

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('userInfo')) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    let cancelled = false;
    const validateSession = async () => {
      if (!user?.token) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/me', withToken(user.token));
        const nextUser = { ...user, ...res.data };
        localStorage.setItem('userInfo', JSON.stringify(nextUser));
        if (!cancelled) setUser(nextUser);
      } catch {
        localStorage.removeItem('userInfo');
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    validateSession();
    return () => { cancelled = true; };
  }, []);

  const handleLoginSuccess = userData => {
    localStorage.setItem('userInfo', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-100 text-slate-500">Loading application…</div>;
  if (!user) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <Router>
      <div className="min-h-screen bg-slate-100">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex">
          <Sidebar user={user} />
          <main className="flex-1 min-w-0 p-4 sm:p-6">
            <Routes>
              <Route path="/" element={<Dashboard token={user.token} />} />

              <Route
                path="/inventory"
                element={
                  <AdminOnlyRoute user={user}>
                    <Inventory token={user.token} userRole={user.role} />
                  </AdminOnlyRoute>
                }
              />

              <Route path="/billing" element={<Billing token={user.token} />} />
              <Route path="/sales" element={<SalesRecord token={user.token} userRole={user.role} />} />

              <Route
                path="/settings"
                element={
                  <AdminOnlyRoute user={user}>
                    <Settings token={user.token} user={user} onUserUpdate={setUser} />
                  </AdminOnlyRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
