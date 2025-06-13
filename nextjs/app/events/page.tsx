'use client';
import { useState } from 'react';
import { createEvent } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

function EventsPage() {
  const { events, selected, setSelected, refresh, loading, error } = useEvents();
  const [tab, setTab] = useState<'current' | 'create'>('current');
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!form.code || !form.name) {
      alert('Please fill in required fields (code and name)');
      return;
    }
    
    setSubmitting(true);
    try {
      await createEvent({
        event_code: form.code,
        name: form.name,
        description: form.description,
        start_date_time: new Date(form.start).toISOString(),
        end_date_time: new Date(form.end).toISOString(),
      });
      
      await refresh();
      setSelected(form.code);
      setTab('current');
      setForm({
        code: '',
        name: '',
        description: '',
        start: new Date().toISOString().slice(0, 16),
        end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
      alert('Event created successfully! 🎉');
    } catch (error: any) {
      console.error('Failed to create event:', error);
      alert(`Failed to create event: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '900px', 
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '2rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          color: '#2c3e50',
          fontSize: '2.5rem'
        }}>🎭 Events Manager</h1>
        
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#666' }}>
          Manage your events and maintain a collaborative photo album.
        </p>

        {error && (
          <div style={{ 
            background: '#fee', 
            color: '#c33', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '2px solid #eee',
          paddingBottom: '1rem'
        }}>
          {[
            { key: 'current', label: '📋 Current Events' },
            { key: 'create', label: '➕ Create Event' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              style={{
                background: tab === key 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#f8f9fa',
                color: tab === key ? '#fff' : '#333',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: tab === key ? 'bold' : 'normal',
                transition: 'all 0.3s ease'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'current' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p>Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ fontSize: '1.2rem', color: '#666' }}>
                  No events found. Create your first event to get started! 
                </p>
                <button 
                  onClick={() => setTab('create')}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    marginTop: '1rem'
                  }}
                >
                  ➕ Create First Event
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {events.map((event) => (
                  <div 
                    key={event.code}
                    style={{
                      border: event.code === selected ? '2px solid #667eea' : '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      background: event.code === selected ? '#f8f9ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setSelected(event.code)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>
                          {event.name}
                        </h3>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                          Code: {event.code}
                        </p>
                        {event.description && (
                          <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                            {event.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#888' }}>
                          <span>📅 {new Date(event.start_date_time).toLocaleDateString()}</span>
                          <span>🕒 {new Date(event.end_date_time).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {event.event_image_url && (
                        <img 
                          src={event.event_image_url} 
                          alt="Event"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'create' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>Create New Event</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Event Code *
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="unique-event-code"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Event Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My Amazing Event"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your event..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <button
                onClick={handleCreate}
                disabled={submitting || !form.code || !form.name}
                style={{
                  background: (!submitting && form.code && form.name) 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  cursor: (!submitting && form.code && form.name) ? 'pointer' : 'not-allowed',
                  marginTop: '1rem'
                }}
              >
                {submitting ? '⏳ Creating...' : '➕ Create Event'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventsPage;