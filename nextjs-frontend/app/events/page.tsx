'use client';
import React, { useState } from 'react';
import { createEvent, updateEvent, deleteEvent, uploadEventImage } from '../../lib/api';
import { useEvents } from '../../hooks/useEvents';
import { Event, EventFormData } from '../../types/events';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDateTime } from '../../lib/utils';
import { DEFAULT_ADMIN_PASSWORD } from '../../lib/constants';

type ModalType = 'create' | 'details' | 'edit' | 'delete' | null;

export default function EventsPage() {
  const { events, selected, setSelected, refresh, loading, error } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [form, setForm] = useState<EventFormData>({
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

  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      description: '',
      start: new Date().toISOString().slice(0, 16),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedEvent(null);
    setAdminPassword('');
    setEventCodeConfirmation('');
    setImageFile(null);
    resetForm();
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
    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
    
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

  const openModal = (type: ModalType, event?: Event) => {
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

  if (loading) {
    return <LoadingSpinner message="Loading events..." />;
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '1rem',
          color: '#2c3e50',
          fontSize: '2.5rem'
        }}>
          📅 Events Management
        </h1>
        <p style={{ 
          textAlign: 'center', 
          color: '#666', 
          fontSize: '1.1rem' 
        }}>
          Create and manage your photo events
        </p>
      </div>

      {error && (
        <Card style={{ marginBottom: '2rem', background: '#fee2e2' }}>
          <div style={{ color: '#dc2626', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        </Card>
      )}

      {events.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
            <h2 style={{ color: '#6b7280', marginBottom: '1rem' }}>No events yet</h2>
            <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '1.1rem' }}>
              Create your first event to start organizing photos
            </p>
            <Button onClick={() => openModal('create')} size="lg">
              ✨ Create Your First Event
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
            {events.map((event) => (
              <Card 
                key={event.code}
                style={{
                  border: event.code === selected ? '2px solid #667eea' : '1px solid #e5e7eb',
                  background: event.code === selected ? '#f8faff' : '#fff',
                  transition: 'all 0.3s ease'
                }}
                hoverable
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <h2 style={{ 
                        margin: 0, 
                        color: '#1f2937', 
                        fontSize: '1.5rem',
                        fontWeight: 'bold'
                      }}>
                        {event.name}
                      </h2>
                      <div style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        letterSpacing: '1px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}>
                        {event.code}
                      </div>
                    </div>
                    
                    {event.description && (
                      <p style={{ 
                        margin: '0 0 1rem 0', 
                        color: '#6b7280',
                        fontSize: '1rem',
                        lineHeight: '1.5'
                      }}>
                        {event.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '2rem', 
                      fontSize: '0.9rem', 
                      color: '#9ca3af',
                      marginBottom: '1.5rem' 
                    }}>
                      <div>
                        <strong>Start:</strong> {formatDateTime(event.start_date_time)}
                      </div>
                      <div>
                        <strong>End:</strong> {formatDateTime(event.end_date_time)}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Button
                        onClick={() => openModal('details', event)}
                        variant="primary"
                        size="sm"
                      >
                        📄 Details
                      </Button>
                      
                      <Button
                        onClick={() => openModal('edit', event)}
                        variant="warning"
                        size="sm"
                      >
                        ✏️ Edit
                      </Button>
                      
                      <Button
                        onClick={() => openModal('delete', event)}
                        variant="danger"
                        size="sm"
                      >
                        🗑️ Delete
                      </Button>
                      
                      <Button
                        onClick={() => setSelected(event.code)}
                        variant={event.code === selected ? "success" : "secondary"}
                        size="sm"
                      >
                        {event.code === selected ? '✓ Selected' : '📌 Select'}
                      </Button>
                    </div>
                  </div>
                  
                  {event.event_image_url && (
                    <div style={{ flexShrink: 0 }}>
                      <img 
                        src={event.event_image_url} 
                        alt="Event"
                        style={{ 
                          width: '120px', 
                          height: '120px', 
                          objectFit: 'cover', 
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                      />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          
          {/* Floating Action Button */}
          <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 100
          }}>
            <Button
              onClick={() => openModal('create')}
              style={{
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                fontSize: '1.5rem',
                boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
              }}
            >
              +
            </Button>
          </div>
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={modalType === 'create'}
        onClose={closeModal}
        title="✨ Create New Event"
        size="md"
      >
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
              Event Code *
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g., wedding-2024"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
              Event Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Sarah & John's Wedding"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell us about your event..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#374151' }}>
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>
          
          <Button
            onClick={handleCreate}
            isLoading={submitting}
            disabled={!form.code || !form.name}
            size="lg"
            style={{ marginTop: '1rem' }}
          >
            ✨ Create Event
          </Button>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={modalType === 'details'}
        onClose={closeModal}
        title="📋 Event Details"
        size="lg"
      >
        {selectedEvent && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: '#1f2937', marginBottom: '0.5rem', fontSize: '2rem' }}>
                {selectedEvent.name}
              </h2>
              <div style={{ 
                display: 'inline-block',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                fontFamily: 'monospace',
                letterSpacing: '2px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}>
                {selectedEvent.code}
              </div>
            </div>

            {selectedEvent.description && (
              <Card style={{ background: '#f8faff' }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#374151' }}>Description</h3>
                <p style={{ color: '#6b7280', lineHeight: '1.6', margin: 0 }}>
                  {selectedEvent.description}
                </p>
              </Card>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Card style={{ background: '#f0f9ff' }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#374151' }}>📅 Start Date & Time</h3>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '1.1rem' }}>
                  {formatDateTime(selectedEvent.start_date_time)}
                </p>
              </Card>
              <Card style={{ background: '#fef3f2' }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#374151' }}>🏁 End Date & Time</h3>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '1.1rem' }}>
                  {formatDateTime(selectedEvent.end_date_time)}
                </p>
              </Card>
            </div>

            {/* Event Image Upload */}
            <Card>
              <h3 style={{ marginBottom: '1rem', color: '#374151' }}>🖼️ Event Image</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={() => handleImageUpload(selectedEvent.code)}
                  isLoading={uploadingImage}
                  disabled={!imageFile}
                  variant="success"
                >
                  📤 Upload
                </Button>
              </div>

              {selectedEvent.event_image_url && (
                <div style={{ textAlign: 'center' }}>
                  <img 
                    src={selectedEvent.event_image_url}
                    alt="Event"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              )}
            </Card>

            {/* QR Code Section */}
            {selectedEvent.qr_code_image_url && (
              <Card style={{ textAlign: 'center' }}>
                <h3 style={{ marginBottom: '1rem', color: '#374151' }}>📱 QR Code</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <img 
                    src={selectedEvent.qr_code_image_url}
                    alt="QR Code"
                    style={{
                      width: '200px',
                      height: '200px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px'
                    }}
                  />
                </div>
                <Button
                  onClick={() => downloadQRCode(selectedEvent)}
                  variant="primary"
                >
                  💾 Download QR Code
                </Button>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Edit and Delete modals would go here - similar structure but abbreviated for space */}
      {/* ... */}
    </div>
  );
}
