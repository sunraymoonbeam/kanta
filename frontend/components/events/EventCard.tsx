import Link from 'next/link';
import { EventInfo } from '../../lib/api';
import { Calendar, Users, Eye, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

interface EventCardProps {
  event: EventInfo;
  onDelete?: (code: string) => void;
}

export function EventCard({ event, onDelete }: EventCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {event.name || 'Untitled Event'}
            </h3>
            <span className={`px-2 py-1 text-xs rounded-full ${
              event.running 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {event.running ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <p className="text-sm text-gray-500 mb-3">
            Code: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{event.code}</span>
          </p>

          {event.description && (
            <p className="text-gray-600 mb-3 text-sm line-clamp-2">{event.description}</p>
          )}

          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Start: {formatDate(event.start_date_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>End: {formatDate(event.end_date_time)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/events/${event.code}`}>
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Link>
          </Button>
        </div>

        {onDelete && (
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => onDelete(event.code)}
            className="opacity-70 hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}