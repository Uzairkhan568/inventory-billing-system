import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Package, Search, SlidersHorizontal, X } from 'lucide-react';
import api, { withToken } from '../lib/api';

const emptyForm = { name: '', sku: '', barcode: '', category: '', unit: 'piece', costPrice: '', price: '', stockQuantity: '', minStockAlert: 5, taxPercent: 0 };
const units = ['kilogram', 'gram', 'litre', 'ml', 'packet', 'piece', 'dozen', 'box'];
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Inventory({ token, userRole }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [stockItem, setStockItem] = useState(null);
  const [stockDelta, setStockDelta] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchItems = async () => { try { const res = await api.get('/inventory', { ...withToken(token), params: { search: searchTerm, category } }); setItems(res.data); } catch (err) { setError(err.response?.data?.message || 'Unable to load inventory'); } };
  const fetchCategories = async () => { try { const res = await api.get('/inventory/categories', withToken(token)); setCategories(res.data); } catch {} };
  useEffect(() => { fetchItems(); }, [searchTerm, category]);
  useEffect(() => { fetchCategories(); }, []);

  const onChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));
  const resetForm = () => { setFormData(emptyForm); setEditId(null); };

  const handleSubmit = async e => {
    e.preventDefault(); setError(''); setMessage('');
    try {
      const payload = { ...formData, price: Number(formData.price), costPrice: Number(formData.costPrice || 0), stockQuantity: Number(formData.stockQuantity), minStockAlert: Number(formData.minStockAlert), taxPercent: Number(formData.taxPercent) };
      if (editId) await api.put(`/inventory/${editId}`, payload, withToken(token)); else await api.post('/inventory', payload, withToken(token));
      resetForm(); setMessage(editId ? 'Product updated.' : 'Product added.'); await fetchItems(); await fetchCategories();
    } catch (err) { setError(err.response?.data?.message || 'Error saving product'); }
  };

  const handleEdit = item => setEditId(item._id) || setFormData({ ...emptyForm, ...item });
  const handleDelete = async id => { if (userRole !== 'admin') return setError('Only admins can archive products.'); if (!window.confirm('Archive this product?')) return; try { await api.delete(`/inventory/${id}`, withToken(token)); setMessage('Product archived.'); fetchItems(); } catch (err) { setError(err.response?.data?.message || 'Unable to archive product'); } };
  const handleStock = async e => { e.preventDefault(); try { await api.patch(`/inventory/${stockItem._id}/stock`, { delta: Number(stockDelta) }, withToken(token)); setMessage('Stock updated.'); setStockItem(null); setStockDelta(''); fetchItems(); } catch (err) { setError(err.response?.data?.message || 'Unable to adjust stock'); } };
  const filteredCount = useMemo(() => items.length, [items]);

  return (
    <div className="space-y-6">
      <div><p className="eyebrow">Catalog</p><h2 className="page-title">Inventory management</h2><p className="text-sm text-slate-500 mt-1">Create products, track quantities, set low-stock alerts, and adjust stock safely.</p></div>
      {(message || error) && <div className={`p-3 rounded-xl text-sm border ${error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{error || message}</div>}

      <form onSubmit={handleSubmit} className="card p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
        <div className="sm:col-span-2 xl:col-span-2"><label className="label">Product name</label><input className="input" required value={formData.name} onChange={e => onChange('name', e.target.value)} placeholder="Basmati Rice" /></div>
        <div><label className="label">SKU</label><input className="input" value={formData.sku} onChange={e => onChange('sku', e.target.value)} placeholder="RICE-001" /></div>
        <div><label className="label">Barcode</label><input className="input" value={formData.barcode} onChange={e => onChange('barcode', e.target.value)} placeholder="Optional" /></div>
        <div><label className="label">Category</label><input className="input" required value={formData.category} onChange={e => onChange('category', e.target.value)} placeholder="Grocery" /></div>
        <div><label className="label">Unit</label><select className="input bg-white" value={formData.unit} onChange={e => onChange('unit', e.target.value)}>{units.map(u => <option key={u}>{u}</option>)}</select></div>
        <div><label className="label">Cost price</label><input className="input" type="number" min="0" step="0.01" value={formData.costPrice} onChange={e => onChange('costPrice', e.target.value)} placeholder="0.00" /></div>
        <div><label className="label">Selling price</label><input className="input" type="number" min="0" step="0.01" required value={formData.price} onChange={e => onChange('price', e.target.value)} placeholder="0.00" /></div>
        <div><label className="label">Stock quantity</label><input className="input" type="number" min="0" step="0.001" required value={formData.stockQuantity} onChange={e => onChange('stockQuantity', e.target.value)} placeholder="0" /></div>
        <div><label className="label">Low-stock alert</label><input className="input" type="number" min="0" step="0.001" value={formData.minStockAlert} onChange={e => onChange('minStockAlert', e.target.value)} /></div>
        <div><label className="label">Tax %</label><input className="input" type="number" min="0" max="100" step="0.01" value={formData.taxPercent} onChange={e => onChange('taxPercent', e.target.value)} /></div>
        <div className="xl:col-span-1 flex items-end gap-2"><button className="btn-primary flex-1"><Plus className="w-4 h-4" />{editId ? 'Update' : 'Add'}</button>{editId && <button type="button" onClick={resetForm} className="btn-secondary"><X className="w-4 h-4" /></button>}</div>
      </form>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Package className="w-4 h-4 text-indigo-600" />{filteredCount} active products</div><div className="flex flex-col sm:flex-row gap-2"><div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input className="input pl-9 w-full sm:w-72" placeholder="Search name, SKU, barcode…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div><div className="relative"><SlidersHorizontal className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><select className="input pl-9 bg-white" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div></div></div>
        <div className="overflow-x-auto"><table className="table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Tax</th><th className="text-right">Actions</th></tr></thead><tbody>{items.length ? items.map(item => <tr key={item._id}><td><div className="font-semibold text-slate-800">{item.name}</div><div className="text-[11px] text-slate-400">{item.unit}</div></td><td>{item.sku || '—'}</td><td>{item.category}</td><td className="font-semibold text-emerald-700">{money(item.price)}</td><td><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.stockQuantity <= item.minStockAlert ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.stockQuantity} {item.unit}</span></td><td>{item.taxPercent || 0}%</td><td className="text-right"><div className="inline-flex items-center gap-1"><button onClick={() => setStockItem(item)} className="icon-btn" title="Adjust stock"><Package className="w-4 h-4" /></button><button onClick={() => handleEdit(item)} className="icon-btn text-blue-600" title="Edit"><Edit2 className="w-4 h-4" /></button>{userRole === 'admin' && <button onClick={() => handleDelete(item._id)} className="icon-btn text-rose-600" title="Archive"><Trash2 className="w-4 h-4" /></button>}</div></td></tr>) : <tr><td colSpan="7" className="p-10 text-center text-slate-400">No products found.</td></tr>}</tbody></table></div>
      </div>

      {stockItem && <div className="fixed inset-0 z-50 bg-slate-950/50 grid place-items-center p-4"><form onSubmit={handleStock} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4"><div className="flex justify-between"><div><h3 className="font-bold text-slate-900">Adjust stock</h3><p className="text-xs text-slate-500">{stockItem.name} · current {stockItem.stockQuantity} {stockItem.unit}</p></div><button type="button" onClick={() => setStockItem(null)}><X className="w-5 h-5" /></button></div><div><label className="label">Change quantity</label><input className="input" type="number" step="0.001" value={stockDelta} onChange={e => setStockDelta(e.target.value)} placeholder="+10 or -2" required /></div><button className="btn-primary w-full">Apply stock change</button></form></div>}
    </div>
  );
}
