'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeDisplay } from '../../../components/events/QRCodeDisplay';
import { Button } from '../../../components/ui/button';
import { Navigation } from '../../../components/Navigation';
import { eventsApi, handleApiError, type EventInfo } from '../../../lib/api';
import { 
  ArrowLeft, 
  Calendar, 
  Edit, 
  Trash2, 
  Users, 
  Camera, 
  AlertCircle, 
  Loader2,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

export default function EventDetailsPage() {
  const params = useParams();
  const eventCode = params.code as string;
  
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (eventCode) {
      loadEvent();
    }
  }, [eventCode]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError('');
      const eventData = await eventsApi.getEvent(eventCode);
      setEvent(eventData);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    
    const confirmed = confirm(
      `Are you sure you want to delete the event "${event.name || event.code}"? This action cannot be undone and will remove all associated photos.`
    );
    
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      await eventsApi.deleteEvent(event.code);
      // Redirect to events list after successful deletion
      window.location.href = '/events';
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
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
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button asChild>
            <Link href="/events">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
          </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" asChild>
              <Link href="/events">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Events
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {event.name || 'Untitled Event'}
                </h1>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  event.running 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {event.running ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <p className="text-gray-600 mb-4">
                Event Code: <code className="bg-gray-100 px-2 py-1 rounded font-mono">{event.code}</code>
              </p>

              {event.description && (
                <p className="text-gray-700 text-lg mb-4">{event.description}</p>
              )}

              <div className="space-y-3 text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>Start: {formatDate(event.start_date_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>End: {formatDate(event.end_date_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>Created: {formatDate(event.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href={`/event/${event.code}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview App
                </Link>
              </Button>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteEvent}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code */}
          <div>
            <QRCodeDisplay
              eventCode={event.code}
              eventName={event.name}
              qrCodeImageUrl={event.qr_code_image_url}
            />
          </div>

          {/* Event Stats & Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-800">Photos Uploaded</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-green-800">Participants</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-purple-800">Face Clusters</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">0</div>
                  <div className="text-sm text-amber-800">Downloads</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link href={`/event/${event.code}`} target="_blank">
                    <Camera className="w-4 h-4 mr-2" />
                    Test Camera App
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" disabled>
                  <Users className="w-4 h-4 mr-2" />
                  View Photos (Coming Soon)
                </Button>
                <Button className="w-full justify-start" variant="outline" disabled>
                  <Users className="w-4 h-4 mr-2" />
                  Manage Participants (Coming Soon)
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Share Your Event</h3>
              <p className="text-blue-800 text-sm mb-4">
                Share the QR code or direct link with your guests so they can start uploading photos to your event.
              </p>
              <div className="space-y-2">
                <p className="text-xs text-blue-700">Direct link:</p>
                <code className="block text-sm bg-white p-2 rounded border text-blue-900 break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/event/${event.code}` : ''}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Loading Overlay */}
      {deleteLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
            <p className="text-gray-700">Deleting event...</p>
          </div>
        </div>
      )}
    </div>
  );
}