import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { IndianRupee, ShoppingBag, Package, AlertTriangle, Boxes, ArrowUpRight } from 'lucide-react';
import api, { withToken } from '../lib/api';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EC4899'];
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try { setError(''); const res = await api.get('/sales/dashboard-stats', withToken(token)); setStats(res.data); }
    catch (err) { setError(err.response?.data?.message || 'Unable to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <div className="card p-8 text-center text-slate-500">Loading business overview…</div>;
  if (error) return <div className="card p-6 text-rose-700 bg-rose-50 border-rose-200">{error}</div>;

  const data = stats || { chartData: [], recentSales: [], lowStockItems: [] };
  const cards = [
    { label: 'Net Revenue', value: money(data.totalRevenue), icon: IndianRupee, tone: 'bg-emerald-100 text-emerald-600' },
    { label: 'Completed Orders', value: data.totalOrders, icon: ShoppingBag, tone: 'bg-indigo-100 text-indigo-600' },
    { label: 'Products', value: data.totalProducts, icon: Package, tone: 'bg-blue-100 text-blue-600' },
    { label: 'Units in Stock', value: Number(data.totalUnits || 0).toLocaleString('en-IN'), icon: Boxes, tone: 'bg-violet-100 text-violet-600' },
    { label: 'Low Stock', value: data.lowStockCount, icon: AlertTriangle, tone: 'bg-rose-100 text-rose-600' },
    { label: 'Inventory Value', value: money(data.inventoryValue), icon: ArrowUpRight, tone: 'bg-amber-100 text-amber-600' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Overview</p><h2 className="page-title">Business dashboard</h2></div><button onClick={fetchStats} className="text-xs font-semibold text-indigo-600 hover:underline">Refresh data</button></div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {cards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="card p-4 sm:p-5 flex items-center justify-between"><div><p className="text-xs sm:text-sm text-slate-500 font-medium">{label}</p><h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{value}</h3></div><div className={`p-2.5 rounded-xl ${tone}`}><Icon className="w-5 h-5 sm:w-6 sm:h-6" /></div></div>)}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2"><div className="flex items-center justify-between"><div><h3 className="section-title">Payment mix</h3><p className="text-xs text-slate-500">Revenue by completed payment method</p></div></div><div className="h-72 mt-2"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.chartData} cx="50%" cy="45%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">{data.chartData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={value => money(value)} /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer></div></div>
        <div className="card p-5"><h3 className="section-title">Low-stock alerts</h3><p className="text-xs text-slate-500 mb-4">Products at or below their threshold</p><div className="space-y-3">{data.lowStockItems.length ? data.lowStockItems.map(item => <div key={item._id} className="flex items-center justify-between border border-rose-100 bg-rose-50 rounded-xl p-3"><div><p className="font-semibold text-slate-800 text-sm">{item.name}</p><p className="text-[11px] text-slate-500">Alert at {item.minStockAlert} {item.unit}</p></div><span className="font-black text-rose-600 text-sm">{item.stockQuantity}</span></div>) : <div className="p-5 rounded-xl bg-emerald-50 text-emerald-700 text-sm">All stock levels look healthy.</div>}</div></div>
      </div>

      <div className="card overflow-hidden"><div className="p-5 border-b border-slate-100"><h3 className="section-title">Recent sales</h3></div><div className="overflow-x-auto"><table className="table"><thead><tr><th>Invoice</th><th>Customer</th><th>Payment</th><th>Amount</th><th>Date</th></tr></thead><tbody>{data.recentSales.length ? data.recentSales.map(sale => <tr key={sale._id}><td className="font-bold text-indigo-600">{sale.invoiceNumber}</td><td>{sale.customerName}</td><td><span className="badge">{sale.paymentMode}</span></td><td className="font-bold">{money(sale.netAmount)}</td><td>{new Date(sale.createdAt).toLocaleString('en-IN')}</td></tr>) : <tr><td colSpan="5" className="p-8 text-center text-slate-400">No completed sales yet.</td></tr>}</tbody></table></div></div>
    </div>
  );
}
