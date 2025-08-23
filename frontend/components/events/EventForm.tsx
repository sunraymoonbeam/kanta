'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { CreateEventInput } from '../../lib/api';
import { Calendar, Type, FileText } from 'lucide-react';

interface EventFormProps {
  onSubmit: (data: CreateEventInput) => void;
  loading?: boolean;
  initialData?: Partial<CreateEventInput>;
}

export function EventForm({ onSubmit, loading = false, initialData = {} }: EventFormProps) {
  const [formData, setFormData] = useState<CreateEventInput>({
    event_code: initialData.event_code || '',
    name: initialData.name || '',
    description: initialData.description || '',
    start_date_time: initialData.start_date_time || '',
    end_date_time: initialData.end_date_time || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.event_code?.trim()) {
      newErrors.event_code = 'Event code is required';
    } else if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(formData.event_code)) {
      newErrors.event_code = 'Event code must be 3-63 characters, lowercase letters, numbers, and hyphens only';
    }

    if (!formData.name?.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (formData.start_date_time && formData.end_date_time) {
      const start = new Date(formData.start_date_time);
      const end = new Date(formData.end_date_time);
      if (start >= end) {
        newErrors.end_date_time = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Convert empty strings to undefined for optional fields
      const cleanData = {
        ...formData,
        name: formData.name || undefined,
        description: formData.description || undefined,
        start_date_time: formData.start_date_time || undefined,
        end_date_time: formData.end_date_time || undefined,
      };
      onSubmit(cleanData);
    }
  };

  const handleChange = (field: keyof CreateEventInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Type className="w-4 h-4 inline mr-1" />
          Event Code *
        </label>
        <input
          type="text"
          value={formData.event_code}
          onChange={handleChange('event_code')}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
            errors.event_code ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="my-awesome-event-2024"
          disabled={loading}
        />
        {errors.event_code && (
          <p className="text-red-500 text-sm mt-1">{errors.event_code}</p>
        )}
        <p className="text-gray-500 text-sm mt-1">
          Used in URLs and QR codes. Only lowercase letters, numbers, and hyphens allowed.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Type className="w-4 h-4 inline mr-1" />
          Event Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={handleChange('name')}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Sarah & John's Wedding"
          disabled={loading}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={handleChange('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Join us in celebrating our special day!"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Start Date & Time
          </label>
          <input
            type="datetime-local"
            value={formData.start_date_time}
            onChange={handleChange('start_date_time')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            End Date & Time
          </label>
          <input
            type="datetime-local"
            value={formData.end_date_time}
            onChange={handleChange('end_date_time')}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.end_date_time ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {errors.end_date_time && (
            <p className="text-red-500 text-sm mt-1">{errors.end_date_time}</p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={loading}
        size="lg"
      >
        {loading ? 'Creating Event...' : 'Create Event'}
      </Button>
    </form>
  );
}