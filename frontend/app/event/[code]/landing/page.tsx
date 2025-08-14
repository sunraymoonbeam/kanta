'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../../components/ui/button';
import { eventsApi, handleApiError, type EventInfo } from '../../../../lib/api';
import { Calendar, Camera, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  params: Promise<{
    code: string;
  }>;
}

export default function EventLandingPage({ params }: Props) {
  const router = useRouter();
  const { code } = use(params);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (code) {
      loadEvent();
    }
  }, [code]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError('');
      const eventData = await eventsApi.getEvent(code);
      setEvent(eventData);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = () => {
    router.push(`/event/${code}/camera`);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-lg">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please check the event code and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 text-center">
            <h1 className="text-4xl font-bold mb-2">
              {event.name || 'Welcome to the Event'}
            </h1>
            <p className="text-blue-100 text-lg">
              Event Code: <span className="font-mono font-semibold">{event.code}</span>
            </p>
          </div>

          {/* Content Section */}
          <div className="p-8 space-y-6">
            {event.description && (
              <div className="text-center">
                <p className="text-gray-700 text-lg leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {/* Event Details */}
            {(event.start_date_time || event.end_date_time || event.running) && (
              <div className="space-y-3 bg-gray-50 rounded-lg p-6">
                {event.start_date_time && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Event Starts</p>
                      <p className="font-medium">{formatDate(event.start_date_time)}</p>
                    </div>
                  </div>
                )}
                
                {event.end_date_time && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500">Event Ends</p>
                      <p className="font-medium">{formatDate(event.end_date_time)}</p>
                    </div>
                  </div>
                )}

                {event.running && (
                  <div className="flex items-center justify-center mt-4">
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Event is currently active
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Call to Action */}
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Ready to capture and share your memories?
              </p>
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-6 text-lg"
                onClick={handleJoinEvent}
              >
                <Camera className="w-5 h-5 mr-2" />
                Join Event
              </Button>
              <p className="text-sm text-gray-500">
                Take photos and share them instantly with other attendees
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Powered by Kanta
          </p>
        </div>
      </div>
    </div>
  );
}