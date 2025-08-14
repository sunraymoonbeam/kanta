import { QrCode, Brain, Download, Shield, Clock, Heart } from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'QR Code Access',
    description: 'Generate unique QR codes for each event. Guests simply scan to join and start uploading photos instantly.',
    color: 'text-blue-600 bg-blue-100'
  },
  {
    icon: Brain,
    title: 'AI Face Recognition',
    description: 'Advanced AI automatically identifies and groups photos by the people in them, creating personalized albums.',
    color: 'text-purple-600 bg-purple-100'
  },
  {
    icon: Download,
    title: 'Easy Downloads',
    description: 'Download individual photos or entire albums with one click. All photos are available in full resolution.',
    color: 'text-green-600 bg-green-100'
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your photos are secure and private. Only event participants can access photos from your event.',
    color: 'text-red-600 bg-red-100'
  },
  {
    icon: Clock,
    title: 'Real-time Updates',
    description: 'Photos appear instantly as they are uploaded. Watch your event gallery grow in real-time.',
    color: 'text-amber-600 bg-amber-100'
  },
  {
    icon: Heart,
    title: 'Memorable Moments',
    description: 'Never miss a moment. Capture every angle of your special events with collaborative photo sharing.',
    color: 'text-pink-600 bg-pink-100'
  }
];

export function Features() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything you need for perfect event photos
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From setup to sharing, Kanta handles every aspect of event photography 
            collaboration with cutting-edge AI technology.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="group hover:shadow-lg transition-shadow p-6 rounded-xl border border-gray-100">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${feature.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}