import Link from 'next/link';
import { Button } from '../ui/button';
import { Camera, Users, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <div className="mb-8 inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-blue-800 text-sm font-medium">
          <Sparkles className="w-4 h-4 mr-2" />
          AI-Powered Photo Sharing
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Share Event Photos
          <span className="block text-blue-600">Intelligently</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          Kanta uses advanced AI face clustering to automatically organize and share photos 
          from your events. No more hunting through hundreds of photos to find yourself!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button asChild size="lg" className="text-lg px-8 py-3">
            <Link href="/events/new">
              <Camera className="w-5 h-5 mr-2" />
              Create Event
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
            <Link href="/events">
              <Users className="w-5 h-5 mr-2" />
              Manage Events
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Easy Photo Upload</h3>
            <p className="text-gray-600">
              Guests scan a QR code to instantly access your event and upload photos from their phones
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI Face Clustering</h3>
            <p className="text-gray-600">
              Our AI automatically groups photos by the people in them, making it easy to find photos of specific guests
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Smart Sharing</h3>
            <p className="text-gray-600">
              Everyone gets access to photos they appear in, automatically organized and ready to download
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}