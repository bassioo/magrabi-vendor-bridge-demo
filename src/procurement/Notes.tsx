import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useStore } from '@/app/store';
import type { Vendor } from '@/lib/types';
import { fmtDateTime } from '@/lib/format';

export function Notes({ vendor }: { vendor: Vendor }) {
  const store = useStore();
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    store.addNote(vendor.id, text.trim());
    store.audit(vendor.id, store.currentUser, 'review', 'Added an internal note');
    setText('');
  };
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2"><MessageSquare size={16} className="text-gold-deep" /><div className="eyebrow">Internal notes</div><span className="text-xs text-muted">· never shown to the vendor</span></div>
      <ul className="mt-3 space-y-3">
        {vendor.notes.map((n) => (
          <li key={n.id} className="rounded-xl bg-greige/60 p-3">
            <div className="text-sm text-ink">{n.text}</div>
            <div className="mt-1 text-[11px] text-muted">{n.by} · {fmtDateTime(n.at)}</div>
          </li>
        ))}
        {vendor.notes.length === 0 && <li className="text-sm text-muted">No notes yet.</li>}
      </ul>
      <div className="mt-3 flex gap-2">
        <input className="input" placeholder="Add a note for the team…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="New note" />
        <button className="btn-secondary shrink-0" onClick={add} disabled={!text.trim()}><Send size={14} /></button>
      </div>
    </section>
  );
}
