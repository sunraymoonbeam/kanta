'use client';
import { useEffect, useState } from 'react';
import {
  getEvents,
  createEvent,
  deleteEvent,
  updateEvent,
  uploadEventImage,
} from '../../lib/api';
import { useEvents } from '../../components/EventContext';

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'password123';

interface EventInfo {
  code: string;
  name?: string;
  description?: string;
  start_date_time?: string;
  end_date_time?: string;
  event_image_url?: string;
}

export default function EventsPage() {
  const { events, selected, setSelected, refresh } = useEvents();
  const [tab, setTab] = useState<'current' | 'create' | 'delete'>('current');
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16),
  });
  const [edit, setEdit] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    name: '',
    description: '',
    start: '',
    end: '',
  });
  const [imgFile, setImgFile] = useState<File>();
  const [deletePwd, setDeletePwd] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = events.find((e) => e.code === selected);
    if (current) {
      setUpdateForm({
        name: current.name || '',
        description: current.description || '',
        start: current.start_date_time?.slice(0, 16) || '',
        end: current.end_date_time?.slice(0, 16) || '',
      });
    }
  }, [selected, events]);

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
    await refresh();
    setTab('current');
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (deletePwd !== ADMIN_PW || deleteConfirm.trim() !== selected) {
      alert('Incorrect password or event code');
      return;
    }
    await deleteEvent(selected);
    await refresh();
    setSelected('');
    setDeletePwd('');
    setDeleteConfirm('');
  };

  const handleUpdate = async () => {
    if (!selected) return;
    await updateEvent({
      event_code: selected,
      name: updateForm.name,
      description: updateForm.description,
      start_date_time: new Date(updateForm.start).toISOString(),
      end_date_time: new Date(updateForm.end).toISOString(),
    });
    if (imgFile) {
      await uploadEventImage(selected, imgFile);
    }
    await refresh();
    setEdit(false);
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
              {!edit ? (
                <>
                  {current.event_image_url && (
                    <img src={current.event_image_url} width={200} />
                  )}
                  <h3>{current.name || current.code}</h3>
                  <p>{current.description}</p>
                  <button onClick={() => setEdit(true)}>Edit</button>
                </>
              ) : (
                <>
                  <input
                    placeholder="name"
                    value={updateForm.name}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, name: e.target.value })
                    }
                  />
                  <br />
                  <textarea
                    placeholder="description"
                    value={updateForm.description}
                    onChange={(e) =>
                      setUpdateForm({
                        ...updateForm,
                        description: e.target.value,
                      })
                    }
                  />
                  <br />
                  <label>Start:</label>{' '}
                  <input
                    type="datetime-local"
                    value={updateForm.start}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, start: e.target.value })
                    }
                  />
                  <br />
                  <label>End:</label>{' '}
                  <input
                    type="datetime-local"
                    value={updateForm.end}
                    onChange={(e) =>
                      setUpdateForm({ ...updateForm, end: e.target.value })
                    }
                  />
                  <br />
                  <input
                    type="file"
                    onChange={(e) => setImgFile(e.target.files?.[0])}
                  />
                  <br />
                  <button onClick={handleUpdate}>Save</button>
                  <button onClick={() => setEdit(false)}>Cancel</button>
                </>
              )}
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
          <div style={{ marginTop: '0.5rem' }}>
            <input
              type="password"
              placeholder="Administrator Password"
              value={deletePwd}
              onChange={(e) => setDeletePwd(e.target.value)}
            />
            <input
              placeholder="Type event code to confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <button onClick={handleDelete} disabled={!selected}>
              Delete
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

