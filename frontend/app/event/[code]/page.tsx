'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface Props {
  params: Promise<{
    code: string;
  }>;
}

export default function EventRedirect({ params }: Props) {
  const router = useRouter();
  const { code } = use(params);

  useEffect(() => {
    // Redirect to the landing page
    router.replace(`/event/${code}/landing`);
  }, [code, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-600 text-lg">Redirecting to event...</p>
      </div>
    </div>
  );
}