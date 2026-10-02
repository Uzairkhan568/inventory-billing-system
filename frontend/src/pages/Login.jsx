import React, { useState } from 'react';
import api from '../lib/api';
import { Store, KeyRound, Mail, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [useOtpMode, setUseOtpMode] = useState(false);
  const [form, setForm] = useState({ name: '', identifier: '', password: '', otp: '' });
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSendOtp = async () => {
    if (!form.identifier.trim()) return setError('Enter your email or phone number first');
    setBusy(true); setError(''); setSuccess(''); setDemoOtp('');
    try {
      const res = await api.post('/auth/send-otp', { identifier: form.identifier.trim() });
      setDemoOtp(res.data.demoOtp || '');
      setSuccess(res.data.demoOtp ? 'Demo OTP generated below.' : 'OTP sent. Check your registered channel.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate OTP');
    } finally { setBusy(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setBusy(true); setError(''); setSuccess(''); setDemoOtp('');
    try {
      if (isRegister) {
        const res = await api.post('/auth/register', {
          name: form.name.trim(),
          identifier: form.identifier.trim(),
          password: form.password
        });
        onLoginSuccess(res.data);
      } else {
        const payload = useOtpMode
          ? { identifier: form.identifier.trim(), otp: form.otp }
          : { identifier: form.identifier.trim(), password: form.password };
        const res = await api.post('/auth/login', payload);
        onLoginSuccess(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally { setBusy(false); }
  };

  const switchMode = () => {
    setIsRegister(prev => !prev); setUseOtpMode(false); setError(''); setSuccess(''); setDemoOtp(''); setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 grid lg:grid-cols-2">
      <div className="hidden lg:flex items-center justify-center p-12 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 text-white">
        <div className="max-w-lg">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600 mb-6"><Store className="w-8 h-8" /></div>
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-300">Retail operations</p>
          <h1 className="text-5xl font-black tracking-tight mt-3">Run your shop from one dashboard.</h1>
          <p className="mt-5 text-slate-300 leading-7">Track stock, create bills, protect your inventory from overselling, and keep a clean sales history.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-5 sm:p-8 bg-slate-100">
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-slate-200">
          <div className="lg:hidden text-center mb-5"><div className="inline-flex p-3 bg-indigo-100 rounded-2xl text-indigo-600"><Store className="w-7 h-7" /></div></div>
          <h2 className="text-2xl font-bold text-slate-900">{isRegister ? 'Create admin account' : 'Welcome back'}</h2>
          <p className="text-sm text-slate-500 mt-1">Inventory & Billing Management System</p>

          {error && <div className="mt-5 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">{error}</div>}
          {success && <div className="mt-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">{success}</div>}
          {demoOtp && <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0" /><span>Demo OTP: <strong>{demoOtp}</strong></span></div>}

          <form onSubmit={handleSubmit} className="space-y-4 mt-5">
            {isRegister && (
              <div>
                <label className="label">Full name</label>
                <div className="relative">
                  <input className="input pl-10" value={form.name} onChange={e => update('name', e.target.value)} placeholder="Shop Admin" required minLength={2} />
                  <User className="icon" />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email or phone</label>
              <div className="relative">
                <input className="input pl-10" value={form.identifier} onChange={e => update('identifier', e.target.value)} placeholder="admin@shop.com" required />
                <Mail className="icon" />
              </div>
            </div>

            {!isRegister && useOtpMode ? (
              <div>
                <label className="label">One-time password</label>
                <div className="flex gap-2">
                  <input className="input" inputMode="numeric" maxLength={6} value={form.otp} onChange={e => update('otp', e.target.value.replace(/\D/g, ''))} placeholder="6-digit OTP" required />
                  <button type="button" onClick={handleSendOtp} disabled={busy} className="px-3 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold disabled:opacity-60">Get OTP</button>
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input className="input pl-10 pr-10" type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} placeholder="Minimum 6 characters" minLength={6} required />
                  <KeyRound className="icon" />
                  <button type="button" className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold transition shadow-md">
              {busy ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-3 text-xs">
            {!isRegister && (
              <button type="button" onClick={() => { setUseOtpMode(v => !v); setError(''); setSuccess(''); setDemoOtp(''); }} className="text-indigo-600 hover:underline font-semibold">
                {useOtpMode ? 'Use password instead' : 'Login using OTP instead'}
              </button>
            )}
            <button type="button" onClick={switchMode} className="text-slate-500 hover:text-indigo-600 font-semibold">
              {isRegister ? 'Already have an account? Sign in' : 'New user? Create account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
