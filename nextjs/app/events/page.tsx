'use client';
import { useEffect, useState } from 'react';
import { getEvents, createEvent, deleteEvent } from '../../lib/api';

interface EventInfo {
  code: string;
  name?: string;
  description?: string;
  start_date_time?: string;
  end_date_time?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [tab, setTab] = useState<'current' | 'create' | 'delete'>('current');
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    getEvents().then((evts) => {
      setEvents(evts);
      if (evts.length && !selected) setSelected(evts[0].code);
    });
  }, []);

  const current = events.find((e) => e.code === selected);

  const handleCreate = async () => {
    if (!form.code) return;
    await createEvent({
      event_code: form.code,
      name: form.name,
      description: form.description,
      start_date_time: new Date(form.start).toISOString(),
      end_date_time: new Date(form.end).toISOString(),
    });
    setEvents(await getEvents());
    setTab('current');
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteEvent(selected);
    setEvents(await getEvents());
    setSelected('');
  };

  return (
    <section>
      <h2>Events</h2>
      <div>
        {['current', 'create', 'delete'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={tab === t ? 'active-tab' : ''}
          >
            {t === 'current' ? 'Current Event' : t === 'create' ? 'Create Event' : 'Delete Event'}
          </button>
        ))}
      </div>

      {tab === 'current' && (
        <div>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">--choose--</option>
            {events.map((e) => (
              <option key={e.code} value={e.code}>
                {e.name || e.code}
              </option>
            ))}
          </select>
          {current && (
            <div>
              <h3>{current.name || current.code}</h3>
              <p>{current.description}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'create' && (
        <div>
          <input
            placeholder="code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <br />
          <input
            placeholder="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <br />
          <textarea
            placeholder="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <br />
          <label>Start:</label>{' '}
          <input
            type="datetime-local"
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
          />
          <br />
          <label>End:</label>{' '}
          <input
            type="datetime-local"
            value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
          />
          <br />
          <button onClick={handleCreate}>Create</button>
        </div>
      )}

      {tab === 'delete' && (
        <div>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">--choose--</option>
            {events.map((e) => (
              <option key={e.code} value={e.code}>
                {e.name || e.code}
              </option>
            ))}
          </select>{' '}
          <button onClick={handleDelete} disabled={!selected}>
            Delete
          </button>
        </div>
      )}
    </section>
  );
}

