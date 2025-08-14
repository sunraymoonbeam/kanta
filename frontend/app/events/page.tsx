'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EventCard } from '../../components/events/EventCard';
import { Button } from '../../components/ui/button';
import { Navigation } from '../../components/Navigation';
import { eventsApi, handleApiError, type EventInfo } from '../../lib/api';
import { Plus, Calendar, Search, AlertCircle, Loader2 } from 'lucide-react';

export default function EventsPage() {
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string>(''); // Event code being deleted

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await eventsApi.getEvents();
      setEvents(response.events);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventCode: string) => {
    if (!confirm(`Are you sure you want to delete the event "${eventCode}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(eventCode);
      await eventsApi.deleteEvent(eventCode);
      setEvents(prev => prev.filter(event => event.code !== eventCode));
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setDeleteLoading('');
    }
  };

  const filteredEvents = events.filter(event => {
    const query = searchQuery.toLowerCase();
    return (
      event.code.toLowerCase().includes(query) ||
      event.name?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query)
    );
  });

  const activeEvents = filteredEvents.filter(event => event.running);
  const inactiveEvents = filteredEvents.filter(event => !event.running);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Events</h1>
              <p className="text-gray-600">Manage your photo sharing events</p>
            </div>
            <Button asChild size="lg">
              <Link href="/events/new">
                <Plus className="w-5 h-5 mr-2" />
                Create New Event
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadEvents}
              className="mt-3 text-red-700 border-red-300 hover:bg-red-50"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading your events...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && events.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-6">Create your first event to start collecting and organizing photos</p>
            <Button asChild>
              <Link href="/events/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Event
              </Link>
            </Button>
          </div>
        )}

        {/* Events List */}
        {!loading && filteredEvents.length > 0 && (
          <div className="space-y-8">
            {/* Active Events */}
            {activeEvents.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  Active Events ({activeEvents.length})
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {activeEvents.map((event) => (
                    <EventCard
                      key={event.code}
                      event={event}
                      onDelete={handleDeleteEvent}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Events */}
            {inactiveEvents.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  Past Events ({inactiveEvents.length})
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {inactiveEvents.map((event) => (
                    <EventCard
                      key={event.code}
                      event={event}
                      onDelete={handleDeleteEvent}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search No Results */}
        {!loading && searchQuery && filteredEvents.length === 0 && events.length > 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">Try adjusting your search terms</p>
          </div>
        )}
      </div>

      {/* Delete Loading Overlay */}
      {deleteLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-700">Deleting event...</p>
          </div>
        </div>
      )}
    </div>
  );
}