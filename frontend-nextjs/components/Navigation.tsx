import Link from 'next/link';
import { Button } from './ui/button';
import { Camera } from 'lucide-react';

export function Navigation() {
  return (
    <nav className="bg-white border-b sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Kanta</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/events">
                View Events
              </Link>
            </Button>
            <Button asChild>
              <Link href="/events/new">
                Create Event
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}