import React, { useEffect, useState } from 'react';
import { ShieldAlert, UserCheck, Users, UserPlus, Power } from 'lucide-react';
import api, { withToken } from '../lib/api';

export default function Settings({ token, user, onUserUpdate }) {
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState([]);
  const [cashier, setCashier] = useState({ name: '', identifier: '', password: '' });

  const loadTeam = async () => {
    if (user.role !== 'admin') return;
    try { const res = await api.get('/auth/users', withToken(token)); setTeam(res.data); } catch (err) { setError(err.response?.data?.message || 'Unable to load team'); }
  };
  useEffect(() => { loadTeam(); }, []);

  const handleUpdate = async e => {
    e.preventDefault(); setMsg(''); setError('');
    if (!name && !newPassword) return setError('Enter a name or password to update.');
    setBusy(true);
    try {
      const res = await api.put('/auth/update-profile', { name, newPassword }, withToken(token));
      const updated = { ...user, ...res.data, token };
      localStorage.setItem('userInfo', JSON.stringify(updated)); onUserUpdate(updated); setMsg('Profile updated successfully.'); setName(''); setNewPassword('');
    } catch (err) { setError(err.response?.data?.message || 'Update failed'); } finally { setBusy(false); }
  };

  const createCashier = async e => {
    e.preventDefault(); setMsg(''); setError('');
    try {
      await api.post('/auth/users', cashier, withToken(token));
      setCashier({ name: '', identifier: '', password: '' }); setMsg('Cashier account created.'); loadTeam();
    } catch (err) { setError(err.response?.data?.message || 'Unable to create cashier'); }
  };

  const toggleUser = async member => {
    try { await api.patch(`/auth/users/${member._id}/status`, { active: !member.active }, withToken(token)); setMsg(`${member.name} is now ${member.active ? 'disabled' : 'enabled'}.`); loadTeam(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to update account'); }
  };

  const clearAll = async () => {
    if (user.role !== 'admin') return setError('Only admins can clear store data.');
    if (!window.confirm('This will permanently clear all products and sales. Continue?')) return;
    try { await api.delete('/auth/clear-all-data', withToken(token)); setMsg('All inventory and sales records were cleared.'); } catch (err) { setError(err.response?.data?.message || 'Action failed'); }
  };

  return <div className="max-w-5xl space-y-6">
    <div><p className="eyebrow">Account & team</p><h2 className="page-title">Settings</h2></div>
    {(msg || error) && <div className={`p-3 rounded-xl text-sm border ${error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{error || msg}</div>}
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="card p-6"><h3 className="section-title flex items-center gap-2"><UserCheck className="w-5 h-5 text-indigo-600" /> Profile</h3><div className="mt-4 p-4 rounded-xl bg-slate-50 text-sm space-y-2"><p><span className="text-slate-500">Name</span><br /><b>{user.name}</b></p><p><span className="text-slate-500">Identifier</span><br /><b>{user.identifier}</b></p><p><span className="text-slate-500">Role</span><br /><b className="capitalize">{user.role}</b></p></div><form onSubmit={handleUpdate} className="mt-5 space-y-3"><div><label className="label">New display name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Leave blank to keep current" /></div><div><label className="label">New password</label><input className="input" type="password" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" /></div><button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save changes'}</button></form></div>
      <div className="card p-6"><h3 className="section-title flex items-center gap-2"><UserPlus className="w-5 h-5 text-indigo-600" /> Add cashier</h3><p className="text-sm text-slate-500 mt-2">Cashiers can create bills and view records; destructive admin actions stay protected.</p>{user.role === 'admin' && <form onSubmit={createCashier} className="mt-4 space-y-3"><input className="input" placeholder="Cashier name" required value={cashier.name} onChange={e => setCashier(v => ({ ...v, name: e.target.value }))} /><input className="input" placeholder="Email or phone" required value={cashier.identifier} onChange={e => setCashier(v => ({ ...v, identifier: e.target.value }))} /><input className="input" type="password" minLength={6} placeholder="Temporary password" required value={cashier.password} onChange={e => setCashier(v => ({ ...v, password: e.target.value }))} /><button className="btn-primary"><UserPlus className="w-4 h-4" /> Create cashier</button></form>}</div>
    </div>

    {user.role === 'admin' && <div className="card overflow-hidden"><div className="p-5 border-b border-slate-100"><h3 className="section-title flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> Team members</h3></div><div className="overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Identifier</th><th>Role</th><th>Status</th><th className="text-right">Action</th></tr></thead><tbody>{team.map(member => <tr key={member._id}><td className="font-semibold">{member.name}</td><td>{member.identifier}</td><td className="capitalize">{member.role}</td><td><span className={`badge ${member.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{member.active ? 'Active' : 'Disabled'}</span></td><td className="text-right"><button disabled={member._id === user._id} onClick={() => toggleUser(member)} className="btn-secondary disabled:opacity-40"><Power className="w-4 h-4" />{member.active ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table></div></div>}

    {user.role === 'admin' && <div className="card p-6 border-rose-200 bg-rose-50/40"><h3 className="section-title flex items-center gap-2 text-rose-700"><ShieldAlert className="w-5 h-5" /> Danger zone</h3><p className="text-sm text-slate-500 mt-2">Permanently clear all active inventory and completed/cancelled sales records. Use for a clean demo/reset.</p><button onClick={clearAll} className="mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm">Clear all store data</button><div className="mt-6 border-t border-rose-100 pt-4"><p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Production note</p><p className="text-sm text-slate-600 mt-1">Use a strong JWT secret and set <code>DEMO_OTP_ENABLED=false</code> after integrating a real OTP provider.</p></div></div>}
  </div>;
}
