'use client';
import { useState } from 'react';
import { createEvent, updateEvent, deleteEvent, uploadEventImage, Event } from '../../lib/api';
import { useEvents } from '../../components/EventContext';

// Modal component
function Modal({ isOpen, onClose, title, children }: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode; 
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0.5rem',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventsPage() {
  const { events, selected, setSelected, refresh, loading, error } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalType, setModalType] = useState<'create' | 'details' | 'edit' | 'delete' | null>(null);
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
  const [adminPassword, setAdminPassword] = useState('');
  const [eventCodeConfirmation, setEventCodeConfirmation] = useState('');

  const closeModal = () => {
    setModalType(null);
    setSelectedEvent(null);
    setAdminPassword('');
    setEventCodeConfirmation('');
    setImageFile(null);
    setForm({
      code: '',
      name: '',
      description: '',
      start: new Date().toISOString().slice(0, 16),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    });
  };

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
      closeModal();
      alert('Event created successfully!');
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
      setSelectedEvent(events.find(e => e.code === form.code) || null);
      setModalType('details');
      alert('Event updated successfully!');
    } catch (error: any) {
      console.error('Failed to update event:', error);
      alert(`Failed to update event: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventCode: string) => {
    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'password123';
    
    if (adminPassword !== expectedPassword) {
      alert('Invalid admin password');
      return;
    }

    if (eventCodeConfirmation !== eventCode) {
      alert('Event code confirmation does not match. Please type the exact event code to confirm deletion.');
      return;
    }

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
      closeModal();
      alert('Event deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      alert(`Failed to delete event: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (eventCode: string) => {
    if (!imageFile) {
      alert('Please select an image file');
      return;
    }
    
    setUploadingImage(true);
    try {
      await uploadEventImage(eventCode, imageFile);
      await refresh();
      alert('Event image uploaded successfully!');
      setImageFile(null);
      // Refresh the selected event data
      const updatedEvent = events.find(e => e.code === eventCode);
      if (updatedEvent) {
        setSelectedEvent(updatedEvent);
      }
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      alert(`Failed to upload image: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const openModal = (type: typeof modalType, event?: Event) => {
    setModalType(type);
    if (event) {
      setSelectedEvent(event);
      if (type === 'edit') {
        setForm({
          code: event.code,
          name: event.name,
          description: event.description || '',
          start: new Date(event.start_date_time).toISOString().slice(0, 16),
          end: new Date(event.end_date_time).toISOString().slice(0, 16),
        });
      }
    }
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
        }}>Events</h1>

        {error && (
          <div style={{ 
            background: '#fee', 
            color: '#c33', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => openModal('create')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontSize: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            Create New Event
          </button>
        </div>

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
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50', fontSize: '2.5rem' }}>
                      {event.name}
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1rem',
                      marginBottom: '0.5rem' 
                    }}>
                      <span style={{ 
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        letterSpacing: '1px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                      }}>
                        {event.code}
                      </span>
                    </div>
                    {event.description && (
                      <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
                        {event.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>
                      <span>{new Date(event.start_date_time).toLocaleDateString()}</span>
                      <span>{new Date(event.end_date_time).toLocaleDateString()}</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openModal('details', event)}
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
                        Details
                      </button>
                      
                      <button
                        onClick={() => openModal('edit', event)}
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
                        Edit
                      </button>
                      
                      <button
                        onClick={() => openModal('delete', event)}
                        style={{
                          background: '#e74c3c',
                          color: '#fff',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                      
                      <button
                        onClick={() => setSelected(event.code)}
                        style={{
                          background: event.code === selected ? '#28a745' : '#6c757d',
                          color: '#fff',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        {event.code === selected ? 'Selected' : 'Select'}
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

        {/* Create Modal */}
        <Modal
          isOpen={modalType === 'create'}
          onClose={closeModal}
          title="Create New Event"
        >
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
                cursor: (!submitting && form.code && form.name) ? 'pointer' : 'not-allowed'
              }}
            >
              {submitting ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </Modal>

        {/* Details Modal */}
        <Modal
          isOpen={modalType === 'details'}
          onClose={closeModal}
          title="Event Details"
        >
          {selectedEvent && (
            <div>
              <h2 style={{ color: '#2c3e50', marginBottom: '1rem' }}>{selectedEvent.name}</h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong>Event Code:</strong> 
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem', 
                  marginTop: '0.5rem' 
                }}>
                  <span style={{ 
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}>
                    {selectedEvent.code}
                  </span>
                </div>
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
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>

              {/* Event Image Display */}
              {selectedEvent.event_image_url && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Current Event Image:</strong>
                  <div style={{ marginTop: '0.5rem' }}>
                    <img 
                      src={selectedEvent.event_image_url}
                      alt="Event"
                      style={{
                        width: '100%',
                        maxHeight: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* QR Code Section */}
              {selectedEvent.qr_code_image_url && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <strong>QR Code:</strong>
                  <div style={{ marginTop: '0.5rem' }}>
                    <img 
                      src={selectedEvent.qr_code_image_url}
                      alt="QR Code"
                      style={{
                        width: '150px',
                        height: '150px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                      }}
                    />
                    <div>
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
                        Download QR Code
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={modalType === 'edit'}
          onClose={closeModal}
          title="Edit Event"
        >
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
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#ccc',
                color: '#fff',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '8px',
                fontSize: '1.1rem',
                cursor: (!submitting && form.name) ? 'pointer' : 'not-allowed'
              }}
            >
              {submitting ? 'Updating...' : 'Update Event'}
            </button>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={modalType === 'delete'}
          onClose={closeModal}
          title="Delete Event"
        >
          {selectedEvent && (
            <div>
              <div style={{ 
                background: '#fee', 
                color: '#c33', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                Warning: This action cannot be undone!
              </div>
              
              <p style={{ marginBottom: '1rem' }}>
                You are about to delete the event <strong>"{selectedEvent.name}"</strong> (Code: {selectedEvent.code}).
              </p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Admin Password *
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Type Event Code to Confirm *
                </label>
                <input
                  type="text"
                  value={eventCodeConfirmation}
                  onChange={(e) => setEventCodeConfirmation(e.target.value)}
                  placeholder={`Type "${selectedEvent.code}" to confirm`}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>
              
              <button
                onClick={() => handleDelete(selectedEvent.code)}
                disabled={submitting || !adminPassword || !eventCodeConfirmation}
                style={{
                  background: (!submitting && adminPassword && eventCodeConfirmation) 
                    ? '#e74c3c' 
                    : '#ccc',
                  color: '#fff',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  cursor: (!submitting && adminPassword && eventCodeConfirmation) ? 'pointer' : 'not-allowed',
                  width: '100%'
                }}
              >
                {submitting ? 'Deleting...' : 'Delete Event'}
              </button>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

export default EventsPage;
