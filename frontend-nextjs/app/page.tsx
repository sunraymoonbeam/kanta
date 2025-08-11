import Link from 'next/link';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { Button } from '../components/ui/button';
import { Camera, Heart, Github } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Kanta</span>
            </div>
            
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

      {/* Main Content */}
      <main>
        <Hero />
        <Features />
        
        {/* Call to Action */}
        <section className="bg-gradient-to-br from-blue-600 to-purple-600 py-20 px-4 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Create your first event and experience the magic of AI-powered photo organization.
            </p>
            <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-3">
              <Link href="/events/new">
                <Camera className="w-5 h-5 mr-2" />
                Create Your First Event
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Kanta</span>
              </div>
              <p className="text-gray-600 mb-4">
                AI-powered photo sharing for events. Automatically organize and share your memories 
                with intelligent face clustering technology.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Heart className="w-4 h-4 text-red-500" />
                <span>Made with love for memorable moments</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/events" className="hover:text-gray-900">Events</Link></li>
                <li><Link href="/events/new" className="hover:text-gray-900">Create Event</Link></li>
                <li><span className="text-gray-400">Features</span></li>
                <li><span className="text-gray-400">Pricing (Coming Soon)</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-gray-600">
                <li><span className="text-gray-400">Documentation</span></li>
                <li><span className="text-gray-400">Help Center</span></li>
                <li><span className="text-gray-400">Contact</span></li>
                <li>
                  <a 
                    href="https://github.com" 
                    className="flex items-center gap-1 hover:text-gray-900"
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 mt-8 text-center text-gray-500 text-sm">
            <p>&copy; 2024 Kanta. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
