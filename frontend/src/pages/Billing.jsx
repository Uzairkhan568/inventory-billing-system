import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { ShoppingCart, Plus, Minus, Send, Search, FileDown, Trash2 } from 'lucide-react';
import api, { withToken } from '../lib/api';

const money = value => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Billing({ token }) {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSale, setLastSale] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const invoiceRef = useRef(null);

  const fetchItems = async () => { try { const res = await api.get('/inventory', withToken(token)); setItems(res.data); } catch (err) { setError(err.response?.data?.message || 'Unable to load products'); } };
  useEffect(() => { fetchItems(); }, []);

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.category?.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku?.toLowerCase().includes(searchTerm.toLowerCase()));
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const tax = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity * Number(item.taxPercent || 0) / 100), 0), [cart]);
  const total = Math.max(0, subtotal + tax - Number(discount || 0));

  const addToCart = item => {
    const existing = cart.find(c => c.itemId === item._id);
    if (existing) {
      if (existing.quantity >= item.stockQuantity) return setError('Cannot add more than available stock.');
      setCart(cart.map(c => c.itemId === item._id ? { ...c, quantity: c.quantity + 1 } : c));
    } else setCart([...cart, { itemId: item._id, name: item.name, unit: item.unit, price: item.price, taxPercent: item.taxPercent || 0, quantity: 1, maxStock: item.stockQuantity }]);
    setError('');
  };
  const updateQuantity = (id, delta) => setCart(cart.map(c => { if (c.itemId !== id) return c; const next = c.quantity + delta; if (next > c.maxStock) return c; return next > 0 ? { ...c, quantity: next } : null; }).filter(Boolean));

  const makeWhatsAppUrl = sale => {
    let phone = customerPhone.replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`;
    if (!phone) return '';
    const lines = sale.items.map(i => `• ${i.name} × ${i.quantity} = ₹${money(i.subtotal)}`).join('\n');
    const message = `🧾 *STORE INVOICE*\nInvoice: *${sale.invoiceNumber}*\nCustomer: ${sale.customerName}\nDate: ${new Date(sale.createdAt).toLocaleDateString('en-IN')}\n\n${lines}\n\nSubtotal: ₹${money(sale.subtotal)}\nTax: ₹${money(sale.taxAmount)}\nDiscount: ₹${money(sale.discount)}\n*Net Payable: ₹${money(sale.netAmount)}*\nPayment: ${sale.paymentMode}\n\nThank you for shopping with us!`;
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  };

  const downloadInvoice = sale => {
    if (!invoiceRef.current) return;
    const options = { margin: 0.35, filename: `${sale.invoiceNumber}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(options).from(invoiceRef.current).save();
  };

  const checkout = async () => {
    if (!cart.length) return setError('Add at least one product to the cart.');
    if (Number(discount) < 0 || Number(discount) > subtotal + tax) return setError('Discount cannot exceed the bill total.');
    setError(''); setMessage('');
    try {
      const res = await api.post('/sales', { customerName, customerPhone, items: cart.map(({ itemId, quantity }) => ({ itemId, quantity })), discount: Number(discount || 0), paymentMode, notes }, withToken(token));
      setLastSale(res.data); setMessage('Bill generated successfully.'); setCart([]); setCustomerName(''); setCustomerPhone(''); setDiscount(0); setNotes(''); await fetchItems();
      const url = makeWhatsAppUrl(res.data); if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) { setError(err.response?.data?.message || 'Checkout failed'); }
  };

  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Point of sale</p><h2 className="page-title">Create a new bill</h2></div>
      {(message || error) && <div className={`p-3 rounded-xl text-sm border ${error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{error || message}</div>}
      <div className="grid xl:grid-cols-5 gap-5 items-start">
        <div className="xl:col-span-3 card overflow-hidden"><div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div><h3 className="section-title">Products</h3><p className="text-xs text-slate-500">Click a product to add it to the bill.</p></div><div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input className="input pl-9 w-full sm:w-72" placeholder="Search products…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div><div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-[66vh] overflow-y-auto">{filteredItems.length ? filteredItems.map(item => <button type="button" disabled={!item.stockQuantity} key={item._id} onClick={() => addToCart(item)} className="text-left border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"><p className="font-bold text-slate-800 line-clamp-2">{item.name}</p><p className="text-xs text-slate-500 mt-1">{item.category} · {item.unit}</p><div className="mt-3 flex items-end justify-between gap-2"><span className="font-black text-indigo-600">₹{money(item.price)}</span><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.stockQuantity <= item.minStockAlert ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{item.stockQuantity} left</span></div></button>) : <div className="col-span-full text-center p-10 text-slate-400">No products found.</div>}</div></div>

        <div className="xl:col-span-2 card p-5 space-y-4 xl:sticky xl:top-24"><div className="flex items-center justify-between"><div><h3 className="section-title flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-indigo-600" />Current cart</h3><p className="text-xs text-slate-500">{cart.length} line item{cart.length !== 1 ? 's' : ''}</p></div>{cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-rose-600 font-bold">Clear</button>}</div>
          <div className="space-y-2 max-h-60 overflow-y-auto">{cart.length ? cart.map(item => <div key={item.itemId} className="p-3 rounded-xl bg-slate-50 border border-slate-100"><div className="flex justify-between gap-3"><div><p className="font-semibold text-sm text-slate-800">{item.name}</p><p className="text-xs text-slate-500">₹{money(item.price)} × {item.quantity}</p></div><button onClick={() => setCart(cart.filter(c => c.itemId !== item.itemId))} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={() => updateQuantity(item.itemId, -1)} className="qty-btn"><Minus className="w-3.5 h-3.5" /></button><span className="text-xs font-bold w-5 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.itemId, 1)} className="qty-btn"><Plus className="w-3.5 h-3.5" /></button></div><span className="font-black text-slate-800">₹{money(item.price * item.quantity)}</span></div></div>) : <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">Your cart is empty.</div>}</div>
          <div className="pt-3 border-t border-slate-100 space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">Subtotal</span><b>₹{money(subtotal)}</b></div><div className="flex justify-between"><span className="text-slate-500">Tax</span><b>₹{money(tax)}</b></div><div className="flex items-center justify-between gap-3"><span className="text-slate-500">Discount</span><input className="input w-24 text-right" type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} /></div><div className="pt-2 border-t border-slate-100 flex justify-between text-lg"><span className="font-bold">Payable</span><span className="font-black text-indigo-600">₹{money(total)}</span></div></div>
          <div className="space-y-2"><input className="input" placeholder="Customer name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} /><input className="input" placeholder="WhatsApp phone (optional)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /><select className="input bg-white" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}><option>Cash</option><option>UPI</option><option>Card</option><option>Credit</option></select><textarea className="input min-h-20 resize-y" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <button onClick={checkout} className="btn-primary w-full py-3"><Send className="w-4 h-4" /> Generate Bill</button>
          {lastSale && <div className="grid grid-cols-2 gap-2"><button onClick={() => downloadInvoice(lastSale)} className="btn-secondary"><FileDown className="w-4 h-4" /> PDF Invoice</button><button onClick={() => { const url = makeWhatsAppUrl(lastSale); if (url) window.open(url, '_blank', 'noopener,noreferrer'); else setError('Add a customer phone number to open WhatsApp.'); }} className="btn-secondary"><Send className="w-4 h-4" /> WhatsApp</button></div>}
        </div>
      </div>

      {lastSale && <div ref={invoiceRef} className="fixed -left-[10000px] top-0 w-[794px] bg-white text-slate-900 p-10"><div className="border-b-2 border-slate-900 pb-5 flex justify-between"><div><h1 className="text-3xl font-black">SmartInventory</h1><p className="text-sm text-slate-500">Inventory & Billing System</p></div><div className="text-right"><p className="font-black text-lg">INVOICE</p><p className="text-sm">{lastSale.invoiceNumber}</p><p className="text-sm text-slate-500">{new Date(lastSale.createdAt).toLocaleString('en-IN')}</p></div></div><div className="py-5 text-sm"><p><b>Customer:</b> {lastSale.customerName}</p><p><b>Phone:</b> {lastSale.customerPhone || '—'}</p></div><table className="w-full text-sm"><thead><tr className="border-y border-slate-200"><th className="py-3 text-left">Item</th><th className="py-3">Qty</th><th className="py-3">Price</th><th className="py-3 text-right">Amount</th></tr></thead><tbody>{lastSale.items.map(i => <tr key={i.itemId} className="border-b border-slate-100"><td className="py-3">{i.name}</td><td className="py-3 text-center">{i.quantity}</td><td className="py-3 text-center">₹{money(i.price)}</td><td className="py-3 text-right">₹{money(i.subtotal)}</td></tr>)}</tbody></table><div className="ml-auto mt-6 w-64 space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>₹{money(lastSale.subtotal)}</b></div><div className="flex justify-between"><span>Tax</span><b>₹{money(lastSale.taxAmount)}</b></div><div className="flex justify-between"><span>Discount</span><b>₹{money(lastSale.discount)}</b></div><div className="border-t border-slate-300 pt-2 flex justify-between text-lg"><span className="font-black">Net Amount</span><span className="font-black">₹{money(lastSale.netAmount)}</span></div><p className="pt-3 text-xs text-slate-500">Payment: {lastSale.paymentMode}</p></div><p className="mt-10 text-center text-xs text-slate-400">Thank you for shopping with us.</p></div>}
    </div>
  );
}
