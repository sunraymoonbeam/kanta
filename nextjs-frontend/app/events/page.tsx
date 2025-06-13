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
      minHeight: '100vh',
      background: '#ffffff',
      padding: '2rem'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto'
      }}>
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ 
            marginBottom: '0.5rem',
            color: '#262626',
            fontSize: '2rem',
            fontWeight: 'bold',
            letterSpacing: '-0.02em'
          }}>
            Events
          </h1>
          <p style={{ 
            color: '#8e8e8e', 
            fontSize: '1rem',
            margin: 0
          }}>
            Create and manage your photo events
          </p>
        </div>

      {error && (
        <div style={{ 
          marginBottom: '2rem', 
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{ color: '#dc2626', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div style={{ 
          textAlign: 'center',
          padding: '4rem 2rem',
          background: '#ffffff',
          border: '1px solid #dbdbdb',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
          <h2 style={{ color: '#262626', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>No events yet</h2>
          <p style={{ color: '#8e8e8e', marginBottom: '2rem', fontSize: '1rem' }}>
            Create your first event to start organizing photos
          </p>
          <Button onClick={() => openModal('create')} size="lg">
            ✨ Create Your First Event
          </Button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
            {events.map((event) => (
              <div 
                key={event.code}
                style={{
                  padding: '2rem',
                  marginBottom: '1.5rem',
                  background: '#ffffff',
                  border: event.code === selected 
                    ? '2px solid #262626' 
                    : '1px solid #dbdbdb',
                  borderRadius: '12px',
                  boxShadow: event.code === selected 
                    ? '0 4px 12px rgba(0,0,0,0.15)' 
                    : '0 1px 3px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (event.code !== selected) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (event.code !== selected) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Event Header with enhanced styling */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <h2 style={{ 
                          margin: 0, 
                          color: '#1f2937', 
                          fontSize: '2rem',
                          fontWeight: '700',
                          lineHeight: '1.2',
                          flex: '1 1 auto',
                          minWidth: '200px'
                        }}>
                          {event.name}
                        </h2>
                        <div style={{ 
                          background: '#262626',
                          color: '#fff',
                          padding: '0.75rem 1.25rem',
                          borderRadius: '12px',
                          fontSize: '1.1rem',
                          fontWeight: '700',
                          fontFamily: 'monospace',
                          letterSpacing: '2px',
                          boxShadow: '0 4px 20px rgba(79, 70, 229, 0.3)',
                          border: '2px solid rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(10px)',
                          textTransform: 'uppercase'
                        }}>
                          {event.code}
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Description */}
                    {event.description && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ 
                          margin: 0, 
                          color: '#4b5563',
                          fontSize: '1.1rem',
                          lineHeight: '1.6',
                          padding: '1rem',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontWeight: '400'
                        }}>
                          {event.description}
                        </p>
                      </div>
                    )}
                    
                    {/* Enhanced Date/Time Display */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                      gap: '1rem', 
                      marginBottom: '1.5rem' 
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        padding: '1rem',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)'
                      }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem', fontWeight: '600' }}>
                          🎯 EVENT STARTS
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                          {formatDateTime(event.start_date_time)}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#fff',
                        padding: '1rem',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(245, 158, 11, 0.2)'
                      }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem', fontWeight: '600' }}>
                          🏁 EVENT ENDS
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                          {formatDateTime(event.end_date_time)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Button
                        onClick={() => openModal('details', event)}
                        variant="primary"
                        size="sm"
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                          fontWeight: '600'
                        }}
                      >
                        📄 Details
                      </Button>
                      
                      <Button
                        onClick={() => openModal('edit', event)}
                        variant="warning"
                        size="sm"
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                          fontWeight: '600'
                        }}
                      >
                        ✏️ Edit
                      </Button>
                      
                      <Button
                        onClick={() => openModal('delete', event)}
                        variant="danger"
                        size="sm"
                        style={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                          fontWeight: '600'
                        }}
                      >
                        🗑️ Delete
                      </Button>
                      
                      <Button
                        onClick={() => setSelected(event.code)}
                        variant={event.code === selected ? "success" : "secondary"}
                        size="sm"
                        style={{
                          background: event.code === selected 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                            : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                          border: 'none',
                          boxShadow: event.code === selected 
                            ? '0 4px 12px rgba(16, 185, 129, 0.3)' 
                            : '0 4px 12px rgba(107, 114, 128, 0.3)',
                          fontWeight: '600'
                        }}
                      >
                        {event.code === selected ? '✓ Selected' : '📌 Select'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Enhanced Event Image Display */}
                  {event.event_image_url && (
                    <div style={{ 
                      flexShrink: 0,
                      position: 'relative',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                      padding: '6px'
                    }}>
                      <img 
                        src={event.event_image_url} 
                        alt={`${event.name} Event`}
                        style={{ 
                          width: '280px', 
                          height: '280px', 
                          objectFit: 'cover',
                          borderRadius: '16px',
                          transition: 'transform 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onClick={() => {
                          // Open image in new tab for full view
                          window.open(event.event_image_url, '_blank');
                        }}
                      />
                      {/* Image overlay with upload button */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '8px',
                        padding: '6px'
                      }}>
                        <Button
                          onClick={() => {
                            // Trigger image upload modal
                            setSelectedEvent(event);
                            setModalType('edit'); // This will allow image upload via edit modal
                          }}
                          size="sm"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            fontSize: '1rem',
                            padding: '4px 8px',
                            minWidth: 'auto'
                          }}
                          title="Change event image"
                        >
                          📷
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* No Image Placeholder with Upload Option */}
                  {!event.event_image_url && (
                    <div style={{ 
                      flexShrink: 0,
                      width: '280px', 
                      height: '280px',
                      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                      borderRadius: '20px',
                      border: '2px dashed #d1d5db',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => {
                      setSelectedEvent(event);
                      setModalType('edit');
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)';
                    }}
                    >
                      <div style={{ fontSize: '3rem', color: '#9ca3af' }}>📷</div>
                      <div style={{ color: '#6b7280', fontWeight: '600', textAlign: 'center' }}>
                        Click to add<br />event image
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                background: '#262626',
                border: 'none',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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

      {/* Edit Modal */}
      <Modal
        isOpen={modalType === 'edit'}
        onClose={closeModal}
        title="Edit Event"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Event Code *
            </label>
            <input
              type="text"
              value={form.code}
              disabled
              className="w-full p-3 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Event code cannot be changed</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Sarah & John's Wedding"
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell us about your event..."
              rows={3}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors resize-vertical"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={closeModal}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              isLoading={submitting}
              disabled={!form.code || !form.name}
              variant="primary"
              style={{ flex: 1 }}
            >
              Update Event
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={modalType === 'delete'}
        onClose={closeModal}
        title="Delete Event"
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">
              Are you absolutely sure?
            </div>
            <p className="text-red-700">
              This action cannot be undone. This will permanently delete the event
              <strong> "{selectedEvent?.name}" </strong>
              and all associated images.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Administrator Password *
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type event code to confirm: <strong>{selectedEvent?.code}</strong>
            </label>
            <input
              type="text"
              value={eventCodeConfirmation}
              onChange={(e) => setEventCodeConfirmation(e.target.value)}
              placeholder={selectedEvent?.code || ''}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={closeModal}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedEvent && handleDelete(selectedEvent.code)}
              isLoading={submitting}
              disabled={!adminPassword || !eventCodeConfirmation}
              variant="danger"
              style={{ flex: 1 }}
            >
              Delete Forever
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
