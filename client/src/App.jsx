import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowUpRight, BadgeIndianRupee, Bell, CalendarDays,
  ChartNoAxesCombined, ChevronDown, CircleHelp, CreditCard, Download, LayoutDashboard,
  LogOut, Menu, Plus, Search, Settings2, ShieldCheck, Target, Trash2, TrendingDown,
  TrendingUp, Wallet, X, Pencil, ReceiptText, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts';
import api, { apiError } from './api.js';

const CATEGORIES = ['Food & Dining','Transport','Shopping','Bills & Utilities','Entertainment','Health','Education','Salary','Freelance','Investment','Other'];
const COLORS = ['#7c6cf2','#21b8a6','#f4a340','#f06b83','#58a6ff','#a78bfa','#e879f9','#8bc34a'];
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));
const monthNow = () => new Date().toISOString().slice(0, 7);
const dateInput = d => new Date(d || Date.now()).toISOString().slice(0, 10);
const niceDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const initials = name => (name || 'F').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

function App() {
  const [token, setToken] = useState(localStorage.getItem('flexi_token'));
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('flexi_user') || 'null'); } catch { return null; } });
  const [authMode, setAuthMode] = useState('login');
  const [active, setActive] = useState('Overview');
  const [month, setMonth] = useState(monthNow());
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  const notify = useCallback((message, kind = 'success') => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3400);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('flexi_token'); localStorage.removeItem('flexi_user');
    setToken(null); setUser(null); setSummary(null); setTransactions([]); setBudgets([]);
    setActive('Overview'); setModal(null);
  }, []);

  useEffect(() => {
    const fn = () => logout();
    window.addEventListener('flexi:logout', fn);
    return () => window.removeEventListener('flexi:logout', fn);
  }, [logout]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, t, b] = await Promise.all([
        api.get('/dashboard/summary', { params: { month } }),
        api.get('/transactions', { params: { month, limit: 250 } }),
        api.get('/budgets', { params: { month } })
      ]);
      setSummary(s.data); setTransactions(t.data.transactions); setBudgets(b.data.budgets);
    } catch (e) { notify(apiError(e), 'error'); }
    finally { setLoading(false); }
  }, [token, month, notify]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTransactions = useMemo(() => transactions.filter(t =>
    (typeFilter === 'all' || t.type === typeFilter) &&
    (categoryFilter === 'all' || t.category === categoryFilter) &&
    `${t.title} ${t.category} ${t.note || ''}`.toLowerCase().includes(query.toLowerCase())
  ), [transactions, typeFilter, categoryFilter, query]);

  const toastNotice = toast && (
    <div className={`toast ${toast.kind}`}>
      <span>{toast.kind === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}</span>
      {toast.message}
      <button onClick={() => setToast(null)}><X size={15}/></button>
    </div>
  );

  async function submitAuth(payload) {
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    try {
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('flexi_token', data.token);
      localStorage.setItem('flexi_user', JSON.stringify(data.user));
      setToken(data.token); setUser(data.user);
      notify(authMode === 'login' ? 'Welcome back!' : 'Your FLEXI account is ready.');
    } catch (e) { notify(apiError(e), 'error'); }
  }

  async function saveTransaction(form) {
    try {
      if (form._id) await api.put(`/transactions/${form._id}`, form);
      else await api.post('/transactions', form);
      setModal(null); await loadData(); notify(form._id ? 'Transaction updated.' : 'Transaction added.');
    } catch (e) { notify(apiError(e), 'error'); }
  }

  async function deleteTransaction(id) {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try { await api.delete(`/transactions/${id}`); await loadData(); notify('Transaction deleted.'); }
    catch (e) { notify(apiError(e), 'error'); }
  }

  async function saveBudget(form) {
    try {
      await api.post('/budgets', { ...form, month });
      setModal(null); await loadData(); notify('Budget saved.');
    } catch (e) { notify(apiError(e), 'error'); }
  }

  async function deleteBudget(id) {
    try { await api.delete(`/budgets/${id}`); await loadData(); notify('Budget removed.'); }
    catch (e) { notify(apiError(e), 'error'); }
  }

  function exportCsv() {
    const rows = [['Date','Title','Type','Category','Amount','Note'], ...filteredTransactions.map(t => [
      dateInput(t.date), t.title, t.type, t.category, t.amount, t.note || ''
    ])];
    const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `flexi-transactions-${month}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (!token) return <><AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={submitAuth} />{toastNotice}</>;

  const nav = [
    { title: 'WORKSPACE', items: [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Transactions', icon: ReceiptText }, { label: 'Budgets', icon: Target }] },
    { title: 'PREFERENCES', items: [{ label: 'Settings', icon: Settings2 }] }
  ];

  return (
    <div className="app-shell">
      {mobileNav && <div className="mobile-scrim" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Activity size={22}/></div><span>FLEXI<span className="brand-dot">.</span></span><button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
        <div className="workspace-pill"><div className="workspace-icon">F</div><div><strong>Personal workspace</strong><small>Free plan</small></div><ChevronDown size={15} className="muted-icon"/></div>
        {nav.map(group => <div className="nav-group" key={group.title}><div className="nav-label">{group.title}</div>{group.items.map(item => <button key={item.label} className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => { setActive(item.label); setMobileNav(false); }}><item.icon size={18}/><span>{item.label}</span>{item.label === 'Budgets' && budgets.some(b => b.spent > b.amount) && <span className="nav-alert"/>}</button>)}</div>)}
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><strong>Need a hand?</strong><p>Keep your finances in focus, one day at a time.</p><button onClick={() => notify('Tip: log transactions regularly and review your budget each month.')}>Quick tip <span>↗</span></button></div><div className="sidebar-user"><div className="avatar">{initials(user?.name)}</div><div className="user-meta"><strong>{user?.name || 'FLEXI user'}</strong><small>{user?.email}</small></div><button className="icon-btn" title="Log out" onClick={logout}><LogOut size={17}/></button></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{active}</strong></div></div><div className="topbar-actions"><div className="month-select"><CalendarDays size={16}/><input aria-label="Select month" type="month" value={month} onChange={e => setMonth(e.target.value)}/></div><button className="icon-btn notification-btn" title="Notifications" onClick={() => notify('You are all caught up.')}><Bell size={18}/><i/></button><div className="top-avatar">{initials(user?.name)}</div></div></header>

        <div className="page-content">
          {active === 'Overview' && <Overview summary={summary} budgets={budgets} transactions={transactions} month={month} loading={loading} onAdd={() => setModal({ kind: 'transaction' })} onNavigate={setActive} onEdit={t => setModal({ kind: 'transaction', item: t })} onDelete={deleteTransaction} />}
          {active === 'Transactions' && <TransactionsPage transactions={filteredTransactions} query={query} setQuery={setQuery} typeFilter={typeFilter} setTypeFilter={setTypeFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} onAdd={() => setModal({ kind: 'transaction' })} onEdit={t => setModal({ kind: 'transaction', item: t })} onDelete={deleteTransaction} onExport={exportCsv} />}
          {active === 'Budgets' && <BudgetsPage budgets={budgets} month={month} onAdd={() => setModal({ kind: 'budget' })} onDelete={deleteBudget} />}
          {active === 'Settings' && <SettingsPage user={user} onLogout={logout} onTip={() => notify('Your account data is stored in your MongoDB database.')} />}
        </div>
        <footer className="footer"><span>© {new Date().getFullYear()} FLEXI Finance</span><span><ShieldCheck size={13}/> Your data, organized securely</span><span>Made for mindful money habits</span></footer>
      </main>
      {modal?.kind === 'transaction' && <TransactionModal item={modal.item} onClose={() => setModal(null)} onSave={saveTransaction}/>}
      {modal?.kind === 'budget' && <BudgetModal budgets={budgets} onClose={() => setModal(null)} onSave={saveBudget}/>}
      {toastNotice}
    </div>
  );
}

function AuthScreen({ mode, setMode, onSubmit }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); await onSubmit({ name, email, password }); setBusy(false); }
  return <div className="auth-layout"><div className="auth-visual"><div className="auth-brand"><div className="brand-mark"><Activity size={22}/></div><span>FLEXI<span className="brand-dot">.</span></span></div><div className="auth-hero"><div className="eyebrow"><span/> YOUR MONEY, IN MOTION</div><h1>A clearer view of<br/><em>your finances.</em></h1><p>Spend with intention. Save with confidence. Build better money habits, one small step at a time.</p><div className="hero-stats"><div><strong>01</strong><span>Know where it goes</span></div><div><strong>02</strong><span>Plan what comes next</span></div><div><strong>03</strong><span>Feel in control</span></div></div></div><div className="auth-visual-footer"><span>FLEXI FINANCE</span><span>Simple money management</span></div></div><div className="auth-panel"><div className="auth-form-wrap"><div className="mobile-auth-brand"><div className="brand-mark"><Activity size={22}/></div><span>FLEXI<span className="brand-dot">.</span></span></div><div className="auth-kicker">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</div><h2>{mode === 'login' ? 'Sign in to FLEXI' : 'Create your account'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Pick up where you left off.' : 'A better relationship with money starts here.'}</p><form onSubmit={submit} className="auth-form">{mode === 'register' && <label>Full name<input required minLength="2" maxLength="80" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aanya Sharma"/></label>}<label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label><label>Password<div className="password-field"><input type={show ? 'text' : 'password'} required minLength={mode === 'register' ? 8 : 1} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label>{mode === 'register' && <div className="password-hint"><ShieldCheck size={14}/> Passwords are securely hashed before storage.</div>}<button className="primary-btn auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button></form><div className="auth-switch">{mode === 'login' ? "New to FLEXI?" : 'Already have an account?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div><div className="auth-privacy"><ShieldCheck size={14}/> Your data belongs to you.</div></div></div></div>;
}

function PageHeading({ eyebrow, title, subtitle, action, actionLabel = 'Add transaction' }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <button className="primary-btn" onClick={action}><Plus size={17}/>{actionLabel}</button>}</div>;
}

function Overview({ summary, budgets, transactions, month, loading, onAdd, onNavigate, onEdit, onDelete }) {
  const s = summary || { income: 0, expenses: 0, balance: 0, savingsRate: 0, categories: [], trend: [], recentTransactions: [], transactionCount: 0 };
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const totalBudget = budgets.reduce((a, b) => a + b.amount, 0); const totalSpent = budgets.reduce((a, b) => a + b.spent, 0);
  return <div className="page-stack">
    <PageHeading eyebrow="YOUR FINANCIAL SNAPSHOT" title="Good to see you." subtitle={`Here's your money overview for ${monthLabel}.`} action={onAdd}/>
    <div className="welcome-banner"><div className="welcome-icon"><ChartNoAxesCombined size={23}/></div><div><strong>Small steps. Stronger finances.</strong><p>{s.income > 0 ? `You've saved ${money(s.balance)} this month so far. Keep your goals in sight.` : 'Add your first transaction to start seeing your financial picture clearly.'}</p></div><div className="welcome-spark">✳</div></div>
    <div className="stat-grid">
      <StatCard title="Total balance" value={money(s.balance)} hint={`${s.transactionCount} transactions this month`} icon={Wallet} tone="violet" trend={s.balance >= 0 ? 'positive' : 'negative'} trendText={s.balance >= 0 ? 'In the green' : 'Spending exceeds income'}/>
      <StatCard title="Income" value={money(s.income)} hint="Money coming in" icon={ArrowDownLeft} tone="teal" trend="positive" trendText="Income this month"/>
      <StatCard title="Expenses" value={money(s.expenses)} hint="Money going out" icon={ArrowUpRight} tone="orange" trend="neutral" trendText="Spending this month"/>
      <StatCard title="Savings rate" value={`${s.savingsRate}%`} hint="Income minus expenses" icon={Activity} tone="pink" trend={s.savingsRate >= 20 ? 'positive' : 'neutral'} trendText={s.savingsRate >= 20 ? 'Healthy savings pace' : 'Room to improve'}/>
    </div>
    <div className="chart-grid">
      <section className="panel trend-panel"><div className="panel-heading"><div><h3>Cash flow</h3><p>Income vs expenses by day</p></div><span className="panel-period">{monthLabel}</span></div><div className="chart-legend"><span><i className="legend-income"/>Income</span><span><i className="legend-expense"/>Expenses</span></div><div className="trend-chart">{s.trend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={s.trend} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#20b99a" stopOpacity={0.18}/><stop offset="100%" stopColor="#20b99a" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8272f5" stopOpacity={0.18}/><stop offset="100%" stopColor="#8272f5" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#8992a5', fontSize: 11 }} tickFormatter={v => `${v}`}/><YAxis tickLine={false} axisLine={false} tick={{ fill: '#8992a5', fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v}/><Tooltip formatter={v => money(v)} labelFormatter={v => `Day ${v}`} contentStyle={{ border: '1px solid #e9ebf3', borderRadius: 12, fontSize: 12 }}/><Area type="monotone" dataKey="income" stroke="#20b99a" strokeWidth={2.5} fill="url(#incomeFill)"/><Area type="monotone" dataKey="expenses" stroke="#8272f5" strokeWidth={2.5} fill="url(#expenseFill)"/></AreaChart></ResponsiveContainer> : <EmptyChart text={loading ? 'Loading your cash flow…' : 'Your cash flow chart will appear here'}/>}</div></section>
      <section className="panel category-panel"><div className="panel-heading"><div><h3>Spending breakdown</h3><p>Where your money goes</p></div><button className="text-link" onClick={() => onNavigate('Transactions')}>Details <span>↗</span></button></div>{s.categories.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={s.categories} dataKey="amount" nameKey="category" innerRadius={63} outerRadius={88} paddingAngle={3} stroke="none">{s.categories.map((entry, i) => <Cell key={entry.category} fill={COLORS[i % COLORS.length]}/>)}</Pie><Tooltip formatter={v => money(v)}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(s.expenses)}</strong><span>Total spent</span></div></div><div className="category-legend">{s.categories.slice(0, 5).map((c, i) => <div className="category-legend-row" key={c.category}><span className="category-name"><i style={{ background: COLORS[i % COLORS.length] }}/>{c.category}</span><strong>{money(c.amount)}</strong></div>)}</div></> : <EmptyChart text="Add expenses to see your categories"/>}</section>
    </div>
    <div className="lower-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent transactions</h3><p>Your latest money movements</p></div><button className="text-link" onClick={() => onNavigate('Transactions')}>View all <span>↗</span></button></div>{transactions.length ? <TransactionTable transactions={(s.recentTransactions || []).slice(0, 5)} onEdit={onEdit} onDelete={onDelete} compact/> : <EmptyChart text="Your transactions will show up here"/>}</section>
      <section className="panel budget-summary"><div className="panel-heading"><div><h3>Budget check-in</h3><p>Monthly spending limits</p></div><button className="text-link" onClick={() => onNavigate('Budgets')}>Manage <span>↗</span></button></div>{budgets.length ? <><div className="budget-total"><div><span>Used so far</span><strong>{money(totalSpent)} <small>of {money(totalBudget)}</small></strong></div><div className="budget-circle">{totalBudget ? Math.min(100, Math.round(totalSpent / totalBudget * 100)) : 0}%</div></div><div className="progress-track overall"><i style={{ width: `${totalBudget ? Math.min(100, totalSpent / totalBudget * 100) : 0}%` }}/></div><div className="mini-budget-list">{budgets.slice(0, 3).map((b, i) => <div key={b._id} className="mini-budget"><span className="mini-budget-dot" style={{ background: COLORS[i % COLORS.length] }}/><span>{b.category}</span><strong>{money(b.spent)} <small>/ {money(b.amount)}</small></strong></div>)}</div></> : <div className="budget-empty"><div className="budget-empty-icon"><Target size={23}/></div><strong>Give your money a plan</strong><p>Set category limits to stay mindful of spending.</p><button className="secondary-btn" onClick={() => onNavigate('Budgets')}>Set a budget <span>→</span></button></div>}</section>
    </div>
  </div>;
}

function StatCard({ title, value, hint, icon: Icon, tone, trend, trendText }) {
  return <div className="stat-card"><div className="stat-top"><span>{title}</span><div className={`stat-icon ${tone}`}><Icon size={18}/></div></div><div className="stat-value">{value}</div><div className="stat-hint">{hint}</div><div className={`stat-trend ${trend}`}><span>{trend === 'positive' ? <TrendingUp size={14}/> : trend === 'negative' ? <TrendingDown size={14}/> : <Activity size={13}/>}</span>{trendText}</div></div>;
}

function TransactionsPage({ transactions, query, setQuery, typeFilter, setTypeFilter, categoryFilter, setCategoryFilter, onAdd, onEdit, onDelete, onExport }) {
  return <div className="page-stack"><PageHeading eyebrow="MONEY IN, MONEY OUT" title="Transactions" subtitle="Every little detail adds up. Keep track of it all." action={onAdd}/><section className="panel transactions-panel"><div className="transactions-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search transactions…"/></div><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="Filter by type"><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><button className="secondary-btn export-btn" onClick={onExport}><Download size={15}/> Export CSV</button></div><div className="table-meta"><span>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span><span>Sorted by date</span></div><TransactionTable transactions={transactions} onEdit={onEdit} onDelete={onDelete}/></section></div>;
}

function TransactionTable({ transactions, onEdit, onDelete, compact = false }) {
  if (!transactions?.length) return <div className="table-empty"><div><ReceiptText size={24}/></div><strong>No transactions yet</strong><p>Add a transaction to start tracking your money.</p></div>;
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th>{!compact && <th>TYPE</th>}<th></th></tr></thead><tbody>{transactions.map(t => <tr key={t._id}><td><div className="transaction-title"><div className={`transaction-symbol ${t.type}`}>{t.type === 'income' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}</div><div><strong>{t.title}</strong><small>{t.note || (t.type === 'income' ? 'Money received' : 'Money spent')}</small></div></div></td><td><span className="category-chip">{t.category}</span></td><td className="date-cell">{niceDate(t.date)}</td><td><strong className={`amount ${t.type}`}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</strong></td>{!compact && <td><span className={`type-pill ${t.type}`}>{t.type}</span></td>}<td><div className="row-actions"><button className="icon-btn" title="Edit" onClick={() => onEdit(t)}><Pencil size={15}/></button><button className="icon-btn danger-icon" title="Delete" onClick={() => onDelete(t._id)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>;
}

function BudgetsPage({ budgets, month, onAdd, onDelete }) {
  const spent = budgets.reduce((a, b) => a + b.spent, 0); const limit = budgets.reduce((a, b) => a + b.amount, 0);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return <div className="page-stack"><PageHeading eyebrow="PLAN WITH PURPOSE" title="Budgets" subtitle={`Your spending guardrails for ${monthLabel}.`} action={onAdd} actionLabel="Create budget"/><div className="budget-overview-cards"><div className="budget-overview-card"><span>Total budget</span><strong>{money(limit)}</strong><small>Across {budgets.length} categories</small></div><div className="budget-overview-card"><span>Spent so far</span><strong>{money(spent)}</strong><small>{limit ? Math.round(spent / limit * 100) : 0}% of total budget</small></div><div className="budget-overview-card"><span>Remaining</span><strong className={limit - spent < 0 ? 'negative-text' : ''}>{money(limit - spent)}</strong><small>{limit - spent < 0 ? 'Over your budget' : 'Available this month'}</small></div></div><div className="budget-cards">{budgets.map((b, i) => { const pct = b.amount ? b.spent / b.amount * 100 : 0; const over = pct > 100; return <div className="budget-card" key={b._id}><div className="budget-card-top"><div className="budget-category-icon" style={{ background: `${COLORS[i % COLORS.length]}18`, color: COLORS[i % COLORS.length] }}><CreditCard size={19}/></div><button className="icon-btn danger-icon" title="Remove budget" onClick={() => onDelete(b._id)}><Trash2 size={16}/></button></div><div className="budget-category">{b.category}</div><div className="budget-amount-line"><strong>{money(b.spent)}</strong><span>of {money(b.amount)}</span></div><div className={`progress-track ${over ? 'over' : ''}`}><i style={{ width: `${Math.min(100, pct)}%` }}/></div><div className="budget-foot"><span>{over ? 'Over budget' : `${Math.max(0, Math.round(100 - pct))}% remaining`}</span><strong className={over ? 'negative-text' : ''}>{Math.round(pct)}%</strong></div></div>; })}{!budgets.length && <div className="panel budget-first"><div className="budget-empty-icon"><Target size={24}/></div><h3>Make a plan for your spending</h3><p>Create a monthly limit for categories like food, shopping or transport. FLEXI will help you see how you're doing.</p><button className="primary-btn" onClick={onAdd}><Plus size={16}/> Create your first budget</button></div>}</div></div>;
}

function SettingsPage({ user, onLogout, onTip }) {
  return <div className="page-stack"><PageHeading eyebrow="YOUR ACCOUNT" title="Settings" subtitle="Manage your account and app preferences."/><div className="settings-grid"><section className="panel settings-panel"><div className="settings-section-title"><div className="settings-icon"><Settings2 size={19}/></div><div><h3>Profile information</h3><p>Your account details</p></div></div><div className="profile-block"><div className="profile-large-avatar">{initials(user?.name)}</div><div><strong>{user?.name}</strong><p>{user?.email}</p><span className="verified-tag"><ShieldCheck size={13}/> FLEXI account</span></div></div><div className="setting-row"><div><strong>Account email</strong><small>Used to sign in to FLEXI</small></div><span>{user?.email}</span></div><div className="setting-row"><div><strong>Currency</strong><small>Currency display in the app</small></div><span>INR (₹)</span></div></section><section className="panel settings-panel"><div className="settings-section-title"><div className="settings-icon"><ShieldCheck size={19}/></div><div><h3>Privacy & security</h3><p>How your data is handled</p></div></div><div className="security-note"><ShieldCheck size={19}/><div><strong>Protected by your account</strong><p>Your records are linked to your account. Passwords are hashed and API requests require a signed session token.</p></div></div><button className="secondary-btn full-btn" onClick={onTip}>About data storage</button><button className="logout-btn" onClick={onLogout}><LogOut size={16}/> Sign out of FLEXI</button></section></div></div>;
}

function TransactionModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({ title: item?.title || '', amount: item?.amount ?? '', type: item?.type || 'expense', category: item?.category || 'Food & Dining', date: dateInput(item?.date), note: item?.note || '', ...(item?._id ? { _id: item._id } : {}) });
  const [busy, setBusy] = useState(false);
  function update(key, value) { setForm(old => ({ ...old, [key]: value })); }
  async function submit(e) { e.preventDefault(); setBusy(true); await onSave(form); setBusy(false); }
  return <ModalShell title={item ? 'Edit transaction' : 'Add transaction'} subtitle="Keep your money movements up to date." onClose={onClose}><form className="modal-form" onSubmit={submit}><div className="type-toggle"><button type="button" className={form.type === 'expense' ? 'selected expense' : ''} onClick={() => { update('type', 'expense'); if (form.category === 'Salary' || form.category === 'Freelance' || form.category === 'Investment') update('category', 'Food & Dining'); }}> <ArrowUpRight size={16}/> Expense</button><button type="button" className={form.type === 'income' ? 'selected income' : ''} onClick={() => { update('type', 'income'); if (['Food & Dining','Transport','Shopping','Bills & Utilities','Entertainment','Health','Education'].includes(form.category)) update('category', 'Salary'); }}><ArrowDownLeft size={16}/> Income</button></div><label>Transaction name<input required maxLength="100" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Groceries, monthly salary"/></label><div className="form-row"><label>Amount (₹)<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => update('amount', e.target.value)} placeholder="0.00"/></label><label>Date<input type="date" required value={form.date} onChange={e => update('date', e.target.value)}/></label></div><div className="form-row"><label>Category<select required value={form.category} onChange={e => update('category', e.target.value)}>{CATEGORIES.filter(c => form.type === 'income' ? ['Salary','Freelance','Investment','Other'].includes(c) : !['Salary','Freelance','Investment'].includes(c)).map(c => <option key={c}>{c}</option>)}</select></label><label>Type<select value={form.type} onChange={e => update('type', e.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label></div><label>Note <span className="optional-label">Optional</span><textarea rows="3" maxLength="500" value={form.note} onChange={e => update('note', e.target.value)} placeholder="Add a little context…"/></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving…' : item ? 'Save changes' : 'Add transaction'} <span>→</span></button></div></form></ModalShell>;
}

function BudgetModal({ budgets, onClose, onSave }) {
  const [category, setCategory] = useState(CATEGORIES.find(c => !budgets.some(b => b.category === c)) || 'Food & Dining');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); await onSave({ category, amount: Number(amount) }); setBusy(false); }
  return <ModalShell title="Create a budget" subtitle="Set a monthly spending limit for a category." onClose={onClose}><form className="modal-form" onSubmit={submit}><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label><label>Monthly limit (₹)<input type="number" min="1" step="1" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000"/></label><div className="budget-modal-tip"><Target size={17}/><span>Choose a realistic amount. You can update a category's budget later by saving it again.</span></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save budget'} <span>→</span></button></div></form></ModalShell>;
}

function ModalShell({ title, subtitle, onClose, children }) {
  useEffect(() => { const onKey = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal-card"><div className="modal-heading"><div><div className="eyebrow">FLEXI FINANCE</div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}</section></div>;
}

function EmptyChart({ text }) { return <div className="empty-chart"><div className="empty-chart-icon"><ChartNoAxesCombined size={23}/></div><p>{text}</p></div>; }

export default App;
