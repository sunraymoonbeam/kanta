import React, { useState } from 'react';
import { Event, EventPayload } from '../../../types/events';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: EventPayload) => Promise<void>;
  initialEvent?: Event | null;
  isLoading?: boolean;
}

export default function EventFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialEvent = null,
  isLoading = false
}: EventFormModalProps) {
  const [formData, setFormData] = useState<EventPayload>({
    event_code: initialEvent?.code || '',
    name: initialEvent?.name || '',
    description: initialEvent?.description || '',
    start_date_time: initialEvent?.start_date_time || new Date().toISOString(),
    end_date_time: initialEvent?.end_date_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event_code.trim() || !formData.name.trim()) return;
    
    try {
      await onSubmit(formData);
      onClose();
      setFormData({ 
        event_code: '', 
        name: '', 
        description: '',
        start_date_time: new Date().toISOString(),
        end_date_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({ 
      event_code: '', 
      name: '', 
      description: '',
      start_date_time: new Date().toISOString(),
      end_date_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={initialEvent ? 'Edit Event' : 'Create New Event'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Event Code *
          </label>
          <input
            type="text"
            value={formData.event_code}
            onChange={(e) => setFormData({ ...formData, event_code: e.target.value })}
            placeholder="Enter event code"
            disabled={!!initialEvent} // Disable editing code for existing events
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '1rem',
              backgroundColor: initialEvent ? '#f8f9fa' : 'white',
              cursor: initialEvent ? 'not-allowed' : 'text'
            }}
            required
          />
          {initialEvent && (
            <small style={{ color: '#666', fontSize: '0.8rem' }}>
              Event code cannot be changed
            </small>
          )}
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Event Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter event name"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
            required
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter event description (optional)"
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '1rem',
              resize: 'vertical',
              minHeight: '80px'
            }}
          />
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginTop: '1rem',
          justifyContent: 'flex-end'
        }}>
          <Button 
            type="button"
            onClick={handleClose}
            variant="secondary"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!formData.event_code.trim() || !formData.name.trim()}
          >
            {initialEvent ? 'Update Event' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
