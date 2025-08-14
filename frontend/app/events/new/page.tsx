'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EventForm } from '../../../components/events/EventForm';
import { Button } from '../../../components/ui/button';
import { Navigation } from '../../../components/Navigation';
import { eventsApi, handleApiError, type CreateEventInput } from '../../../lib/api';
import { ArrowLeft, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [createdEventCode, setCreatedEventCode] = useState<string>('');

  const handleSubmit = async (data: CreateEventInput) => {
    try {
      setLoading(true);
      setError('');
      
      const newEvent = await eventsApi.createEvent(data);
      setCreatedEventCode(newEvent.code);
      setSuccess(true);
      
      // Redirect to event details after a short delay
      setTimeout(() => {
        router.push(`/events/${newEvent.code}`);
      }, 2000);
      
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Created!</h2>
            <p className="text-gray-600">
              Your event has been created successfully. You'll be redirected to the event details shortly.
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 mb-1">Event Code:</p>
            <code className="font-mono text-lg font-bold text-green-900">
              {createdEventCode}
            </code>
          </div>

          <Button asChild className="w-full">
            <Link href={`/events/${createdEventCode}`}>
              View Event Details
            </Link>
          </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" asChild>
              <Link href="/events">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Events
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
              <p className="text-gray-600">Set up a new photo sharing event with AI-powered organization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Event Details</h2>
              
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Error Creating Event</span>
                  </div>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              )}

              <EventForm
                onSubmit={handleSubmit}
                loading={loading}
              />
            </div>
          </div>

          {/* Tips & Info */}
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="font-semibold text-blue-900 mb-3">How it works</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p>Create your event with a unique code</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p>Share the QR code with your guests</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p>Guests scan and upload photos instantly</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <p>AI organizes photos by faces automatically</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
              <h3 className="font-semibold text-amber-900 mb-3">Tips for Event Codes</h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li>• Keep it simple and memorable</li>
                <li>• Use lowercase letters and numbers</li>
                <li>• Include the event date (e.g., wedding-2024)</li>
                <li>• Avoid special characters except hyphens</li>
                <li>• Make it 3-63 characters long</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <h3 className="font-semibold text-green-900 mb-3">Privacy & Security</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Only people with the QR code can access your event</li>
                <li>• Photos are securely stored in the cloud</li>
                <li>• Face clustering happens privately</li>
                <li>• You control who can see what</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}