'use client';
import { useState } from 'react';
import { createEvent, updateEvent, deleteEvent, uploadEventImage, Event } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

function EventsPage() {
  const { events, selected, setSelected, refresh, loading, error } = useEvents();
  const [tab, setTab] = useState<'current' | 'create' | 'details' | 'edit' | 'delete'>('current');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleUpdate = async () => {
    if (!form.code || !form.name) {
      alert('Please fill in required fields (code and name)');
      return;
    }
    
    setSubmitting(true);
    try {
      await updateEvent({
        event_code: form.code,
        name: form.name,
        description: form.description,
        start_date_time: new Date(form.start).toISOString(),
        end_date_time: new Date(form.end).toISOString(),
      });
      
      await refresh();
      setTab('details');
      setSelectedEvent(events.find(e => e.code === form.code) || null);
      alert('Event updated successfully! ✅');
    } catch (error: any) {
      console.error('Failed to update event:', error);
      alert(`Failed to update event: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventCode: string) => {
    if (!confirm(`Are you sure you want to delete event "${eventCode}"? This action cannot be undone.`)) {
      return;
    }
    
    setSubmitting(true);
    try {
      await deleteEvent(eventCode);
      await refresh();
      if (selected === eventCode) {
        setSelected('');
      }
      setSelectedEvent(null);
      setTab('current');
      alert('Event deleted successfully! 🗑️');
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      alert(`Failed to delete event: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (eventCode: string) => {
    if (!imageFile) {
      alert('Please select an image first');
      return;
    }
    
    setUploadingImage(true);
    try {
      await uploadEventImage(eventCode, imageFile);
      await refresh();
      setImageFile(null);
      const updatedEvent = events.find(e => e.code === eventCode);
      if (updatedEvent) setSelectedEvent(updatedEvent);
      alert('Event image uploaded successfully! 🖼️');
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      alert(`Failed to upload image: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const openEventDetails = (event: Event) => {
    setSelectedEvent(event);
    setTab('details');
  };

  const openEventEdit = (event: Event) => {
    setSelectedEvent(event);
    setForm({
      code: event.code,
      name: event.name,
      description: event.description || '',
      start: new Date(event.start_date_time).toISOString().slice(0, 16),
      end: new Date(event.end_date_time).toISOString().slice(0, 16),
    });
    setTab('edit');
  };

  const downloadQRCode = (event: Event) => {
    if (event.qr_code_image_url) {
      const link = document.createElement('a');
      link.href = event.qr_code_image_url;
      link.download = `${event.code}-qr-code.png`;
      link.click();
    } else {
      alert('QR code not available for this event');
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

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '2px solid #eee',
          paddingBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          {[
            { key: 'current', label: '📋 Current Events' },
            { key: 'create', label: '➕ Create Event' },
            ...(selectedEvent ? [
              { key: 'details', label: '👁️ Event Details' },
              { key: 'edit', label: '✏️ Edit Event' },
              { key: 'delete', label: '🗑️ Delete Event' }
            ] : [])
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

        {/* Current Events Tab */}
        {tab === 'current' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '1rem', color: '#666' }}>Loading events...</p>
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
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => openEventDetails(event)}
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
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>
                          <span>📅 {new Date(event.start_date_time).toLocaleDateString()}</span>
                          <span>🕒 {new Date(event.end_date_time).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(event.code);
                            }}
                            style={{
                              background: event.code === selected ? '#28a745' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: '#fff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              cursor: 'pointer'
                            }}
                          >
                            {event.code === selected ? '✅ Selected' : '📌 Select'}
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventDetails(event);
                            }}
                            style={{
                              background: '#17a2b8',
                              padding: '0.5rem 1rem',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              cursor: 'pointer'
                            }}
                          >
                            {event.code === selected ? '✅ Selected' : '📌 Select'}
                          </button>
                          
                          <button
                            onClick={() => openEventDetails(event)}
                            style={{
                              background: '#3498db',
                              color: '#fff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Details
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventEdit(event);
                            }}
                            style={{
                              background: '#f39c12',
                              color: '#fff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setTab('delete');
                            }}
                            disabled={submitting}
                            style={{
                              background: '#e74c3c',
                              color: '#fff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              opacity: submitting ? 0.5 : 1
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      
                      {event.event_image_url && (
                        <img 
                          src={event.event_image_url} 
                          alt="Event"
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginLeft: '1rem' }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Event Tab */}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
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
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
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

        {/* Event Details Tab */}
        {tab === 'details' && selectedEvent && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>Event Details</h3>
              <button 
                onClick={() => setTab('current')}
                style={{
                  background: '#95a5a6',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ⬅️ Back to List
              </button>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: selectedEvent.event_image_url ? '2fr 1fr' : '1fr',
              gap: '2rem',
              marginBottom: '2rem'
            }}>
              <div>
                <h2 style={{ color: '#2c3e50', marginBottom: '1rem' }}>{selectedEvent.name}</h2>
                
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Event Code:</strong> 
                  <span style={{ 
                    background: '#f8f9fa', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    marginLeft: '0.5rem',
                    fontFamily: 'monospace'
                  }}>
                    {selectedEvent.code}
                  </span>
                </div>

                {selectedEvent.description && (
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Description:</strong>
                    <p style={{ marginTop: '0.5rem', color: '#666' }}>{selectedEvent.description}</p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <strong>Start Date & Time:</strong>
                    <p style={{ marginTop: '0.25rem', color: '#666' }}>
                      {new Date(selectedEvent.start_date_time).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <strong>End Date & Time:</strong>
                    <p style={{ marginTop: '0.25rem', color: '#666' }}>
                      {new Date(selectedEvent.end_date_time).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Event Image Upload */}
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Event Image:</strong>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      style={{ flex: 1 }}
                    />
                    <button
                      onClick={() => handleImageUpload(selectedEvent.code)}
                      disabled={!imageFile || uploadingImage}
                      style={{
                        background: imageFile && !uploadingImage ? '#27ae60' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: imageFile && !uploadingImage ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {uploadingImage ? 'Uploading...' : '📤 Upload'}
                    </button>
                  </div>
                </div>

                {/* QR Code Section */}
                {selectedEvent.qr_code_image_url && (
                  <div>
                    <strong>QR Code:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        onClick={() => downloadQRCode(selectedEvent)}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '1rem'
                        }}
                      >
                        📥 Download QR Code
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Event Image Display */}
              {selectedEvent.event_image_url && (
                <div>
                  <img 
                    src={selectedEvent.event_image_url}
                    alt="Event"
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              )}
            </div>

            {/* QR Code Display */}
            {selectedEvent.qr_code_image_url && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Event QR Code</h4>
                <img 
                  src={selectedEvent.qr_code_image_url}
                  alt="QR Code"
                  style={{
                    width: '200px',
                    height: '200px',
                    border: '2px solid #ddd',
                    borderRadius: '8px'
                  }}
                />
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Share this QR code for guests to join the event
                </p>
              </div>
            )}
          </div>
        )}

        {/* Edit Event Tab */}
        {tab === 'edit' && selectedEvent && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>Edit Event</h3>
              <button 
                onClick={() => setTab('details')}
                style={{
                  background: '#95a5a6',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ⬅️ Back to Details
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Event Code (Read-only)
                </label>
                <input
                  type="text"
                  value={form.code}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    background: '#f8f9fa',
                    color: '#666'
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
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
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
              
              <button
                onClick={handleUpdate}
                disabled={submitting || !form.name}
                style={{
                  background: (!submitting && form.name) 
                    ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' 
                    : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  cursor: (!submitting && form.name) ? 'pointer' : 'not-allowed',
                  marginTop: '1rem'
                }}
              >
                {submitting ? '⏳ Updating...' : '✅ Update Event'}
              </button>
            </div>
          </div>
        )}

        {/* Delete Event Tab */}
        {tab === 'delete' && selectedEvent && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, color: '#e74c3c' }}>Delete Event</h3>
              <button 
                onClick={() => setTab('details')}
                style={{
                  background: '#95a5a6',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ⬅️ Back to Details
              </button>
            </div>

            <div style={{ 
              background: '#fee', 
              border: '1px solid #fcc', 
              borderRadius: '8px', 
              padding: '2rem', 
              textAlign: 'center' 
            }}>
              <h4 style={{ color: '#e74c3c', marginBottom: '1rem' }}>⚠️ Warning: This action cannot be undone!</h4>
              <p style={{ color: '#666', marginBottom: '2rem' }}>
                You are about to delete the event "<strong>{selectedEvent.name}</strong>" (Code: {selectedEvent.code}).
                <br />
                This will permanently remove the event and all associated photos and data.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  onClick={() => setTab('details')}
                  style={{
                    background: '#95a5a6',
                    color: '#fff',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  ❌ Cancel
                </button>
                
                <button
                  onClick={() => handleDelete(selectedEvent.code)}
                  disabled={submitting}
                  style={{
                    background: submitting ? '#ccc' : '#e74c3c',
                    color: '#fff',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '8px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {submitting ? '⏳ Deleting...' : '🗑️ Delete Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default EventsPage;
