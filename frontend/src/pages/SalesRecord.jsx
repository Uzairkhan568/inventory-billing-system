import React, { useEffect, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Search, Trash2, Eye, FileDown } from 'lucide-react';
import api, { withToken } from '../lib/api';

const money = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SalesRecord({ token, userRole }) {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSales = async () => { try { const res = await api.get('/sales', { ...withToken(token), params: { search, paymentMode } }); setSales(res.data); } catch (err) { setError(err.response?.data?.message || 'Unable to load sales'); } };
  useEffect(() => { fetchSales(); }, [search, paymentMode]);

  const cancelSale = async id => {
    if (userRole !== 'admin') return setError('Only admins can cancel sales.');
    if (!window.confirm('Cancel this sale? Its stock will be restored.')) return;
    try { await api.delete(`/sales/${id}`, withToken(token)); setMessage('Sale cancelled and stock restored.'); fetchSales(); } catch (err) { setError(err.response?.data?.message || 'Unable to cancel sale'); }
  };

  const downloadSelected = () => {
    if (!selected) return;
    const node = document.getElementById('sale-print-area');
    html2pdf().set({ margin: 0.35, filename: `${selected.invoiceNumber}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(node).save();
  };

  return (
    <div className="space-y-6">
      <div><p className="eyebrow">History</p><h2 className="page-title">Sales records</h2><p className="text-sm text-slate-500 mt-1">Search invoices, review line items, export PDFs, and cancel sales when needed.</p></div>
      {(message || error) && <div className={`p-3 rounded-xl text-sm border ${error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{error || message}</div>}
      <div className="card overflow-hidden"><div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input className="input pl-9" placeholder="Search invoice, customer, phone…" value={search} onChange={e => setSearch(e.target.value)} /></div><select className="input bg-white md:w-44" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}><option value="">All payments</option><option>Cash</option><option>UPI</option><option>Card</option><option>Credit</option></select></div><div className="overflow-x-auto"><table className="table"><thead><tr><th>Invoice</th><th>Customer</th><th>Payment</th><th>Amount</th><th>Status</th><th>Date</th><th className="text-right">Actions</th></tr></thead><tbody>{sales.length ? sales.map(sale => <tr key={sale._id}><td className="font-bold text-indigo-600">{sale.invoiceNumber}</td><td><div className="font-semibold">{sale.customerName}</div><div className="text-[11px] text-slate-400">{sale.customerPhone || 'No phone'}</div></td><td><span className="badge">{sale.paymentMode}</span></td><td className="font-bold">₹{money(sale.netAmount)}</td><td><span className={`badge ${sale.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{sale.status}</span></td><td>{new Date(sale.createdAt).toLocaleDateString('en-IN')}</td><td className="text-right"><div className="inline-flex gap-1"><button className="icon-btn text-indigo-600" title="View" onClick={() => setSelected(sale)}><Eye className="w-4 h-4" /></button>{sale.status === 'Completed' && userRole === 'admin' && <button className="icon-btn text-rose-600" title="Cancel and restore stock" onClick={() => cancelSale(sale._id)}><Trash2 className="w-4 h-4" /></button>}</div></td></tr>) : <tr><td colSpan="7" className="p-10 text-center text-slate-400">No sales found.</td></tr>}</tbody></table></div></div>

      {selected && <div className="fixed inset-0 z-50 bg-slate-950/50 grid place-items-center p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"><div className="p-5 border-b border-slate-100 flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-indigo-600 font-bold">Invoice</p><h3 className="text-xl font-black">{selected.invoiceNumber}</h3></div><button onClick={() => setSelected(null)} className="text-slate-400">×</button></div><div id="sale-print-area" className="p-6"><div className="grid sm:grid-cols-2 gap-3 text-sm"><p><b>Customer:</b> {selected.customerName}</p><p><b>Payment:</b> {selected.paymentMode}</p><p><b>Phone:</b> {selected.customerPhone || '—'}</p><p><b>Date:</b> {new Date(selected.createdAt).toLocaleString('en-IN')}</p></div><div className="overflow-x-auto mt-6"><table className="w-full text-sm"><thead><tr className="border-y border-slate-200"><th className="py-2 text-left">Item</th><th>Qty</th><th>Price</th><th className="text-right">Amount</th></tr></thead><tbody>{selected.items.map(item => <tr key={`${selected._id}-${item.itemId}`} className="border-b border-slate-100"><td className="py-2">{item.name}</td><td className="text-center">{item.quantity}</td><td className="text-center">₹{money(item.price)}</td><td className="text-right">₹{money(item.subtotal)}</td></tr>)}</tbody></table></div><div className="ml-auto mt-5 w-64 text-sm space-y-2"><div className="flex justify-between"><span>Subtotal</span><b>₹{money(selected.subtotal)}</b></div><div className="flex justify-between"><span>Tax</span><b>₹{money(selected.taxAmount)}</b></div><div className="flex justify-between"><span>Discount</span><b>₹{money(selected.discount)}</b></div><div className="border-t pt-2 flex justify-between text-lg"><b>Net amount</b><b>₹{money(selected.netAmount)}</b></div></div></div><div className="p-5 border-t border-slate-100 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setSelected(null)}>Close</button><button className="btn-primary" onClick={downloadSelected}><FileDown className="w-4 h-4" /> Download PDF</button></div></div></div>}
    </div>
  );
}
