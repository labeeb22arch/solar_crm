import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from '../data/api.js';

// Re-runs loader whenever data or session changes.
export function useData(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true });
  const ref = useRef(loader);
  ref.current = loader;
  const run = useCallback(() => {
    let alive = true;
    Promise.resolve(ref.current()).then((data) => alive && setState({ data, loading: false }));
    return () => { alive = false; };
  }, []);
  useEffect(() => run(), deps); // eslint-disable-line
  useEffect(() => api.subscribe(() => run()), [run]);
  return [state.data, state.loading];
}

export function useSession() {
  const [s, setS] = useState(api.getSession());
  useEffect(() => api.subscribe(() => setS(api.getSession())), []);
  return s;
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('sunpay.final.theme', theme); } catch { /* */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text) => {
    const id = Math.random();
    setItems((x) => [...x, { id, text }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">{items.map((t) => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// UI-level context: open command palette / slide-over from anywhere.
export const UiCtx = createContext({ openSearch() {}, openCustomer() {} });
export const useUi = () => useContext(UiCtx);

export function useHotkeys(map, deps = [], global = false) {
  useEffect(() => {
    const h = (e) => {
      if (e.defaultPrevented) return;
      if (!global && document.querySelector('.search-pop, .peek')) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const fn = map[e.key];
      if (fn) { fn(e); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, deps); // eslint-disable-line
}

export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const inrK = (n) => n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(2) + ' L' : inr(n);
export const fdate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
export const fdateY = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const ftime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
export const initials = (s) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = isMac ? '⌘' : 'Ctrl';
