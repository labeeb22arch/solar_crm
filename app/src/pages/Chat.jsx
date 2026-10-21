import { useEffect, useRef, useState } from 'react';
import { IconSend, IconMessageCircle } from '@tabler/icons-react';
import * as api from '../data/api.js';
import { useSession } from '../lib/hooks.jsx';
import { PageHead, LinkCRNs, Avatar } from '../components/ui.jsx';

const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dayOf = (iso) => {
  const d = new Date(iso); const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** One shared room where Admin and Office staff talk. New messages appear for everyone straight away. */
export default function Chat() {
  const session = useSession();
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const add = (m) => setMsgs((list) => (!list || list.some((x) => x.id === m.id) ? list : [...list, m]));
  useEffect(() => {
    let live = true;
    api.listChat().then((l) => live && setMsgs(l)).catch((e) => live && setErr(e.message));
    const stop = api.watchChat(add);
    return () => { live = false; stop(); };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs?.length]);

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true); setErr('');
    try { const m = await api.postChat(text); if (m) add(m); setText(''); } catch (x) { setErr(`Message not sent: ${x.message}`); } finally { setSending(false); }
  };

  let lastDay = '';
  return (
    <div className="chat-page">
      <PageHead title="Team chat" sub="One shared room for Admin and Office staff. Everyone in these roles sees every message." />
      <div className="chat-box">
        <div className="chat-list" aria-live="polite">
          {msgs === null && !err && <div className="faint small chat-empty">Loading messages…</div>}
          {msgs && msgs.length === 0 && <div className="chat-empty"><span className="zero-ico" aria-hidden="true"><IconMessageCircle size={22} /></span><b>No messages yet.</b><span className="faint small">Write the first one below — for example who is handling today's installations.</span></div>}
          {msgs && msgs.map((m) => {
            const day = dayOf(m.at); const showDay = day !== lastDay; lastDay = day;
            const mine = m.author === api.chatName();
            return (
              <div key={m.id}>
                {showDay && <div className="chat-day"><span>{day}</span></div>}
                <div className={'chat-row' + (mine ? ' mine' : '')}>
                <Avatar name={m.author} size="sm" />
                <div className={'chat-msg' + (mine ? ' mine' : '')}>
                  <div className="chat-meta"><b>{m.author}</b><span className="chip">{m.role === 'Admin' ? 'Admin' : 'Office'}</span>{m.branch && m.branch !== m.author && <span className="faint">{m.branch}</span>}<span className="faint">{timeOf(m.at)}</span></div>
                  <div className="chat-body"><LinkCRNs text={m.body} /></div>
                </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        {err && <div className="form-err" role="alert">{err}</div>}
        <form className="chat-compose" onSubmit={send}>
          <textarea
            className="input" rows={2} maxLength={2000} value={text} placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
            aria-label="Message" onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
          />
          <button className="btn primary" type="submit" disabled={sending || !text.trim()}><IconSend size={16} />Send</button>
        </form>
      </div>
    </div>
  );
}
