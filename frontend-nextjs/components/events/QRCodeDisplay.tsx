'use client';

import { useEffect, useState } from 'react';
import { QrCode, Download, Share, Copy, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import qrcode from 'qrcode';

interface QRCodeDisplayProps {
  eventCode: string;
  eventName?: string;
  qrCodeImageUrl?: string;
}

export function QRCodeDisplay({ eventCode, eventName, qrCodeImageUrl }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  const eventUrl = `${window.location.origin}/event/${eventCode}`;

  useEffect(() => {
    // If backend provides QR code, use it; otherwise generate client-side
    if (qrCodeImageUrl) {
      setQrDataUrl(qrCodeImageUrl);
    } else {
      // Generate QR code client-side as fallback
      qrcode.toDataURL(eventUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate QR code:', err));
    }
  }, [eventUrl, qrCodeImageUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${eventCode}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${eventName || eventCode}`,
          text: `Scan this QR code to join the event and upload photos!`,
          url: eventUrl,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      // Fallback to copying link
      handleCopyLink();
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <QrCode className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Event QR Code</h3>
        </div>
        <p className="text-gray-600 text-sm">
          Share this QR code with guests so they can easily join your event
        </p>
      </div>

      <div className="flex flex-col items-center space-y-6">
        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg border-2 border-gray-100 shadow-sm">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code for event ${eventCode}`}
              className="w-64 h-64 object-contain"
            />
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <QrCode className="w-12 h-12 mx-auto mb-2" />
                <p>Loading QR Code...</p>
              </div>
            </div>
          )}
        </div>

        {/* Event URL */}
        <div className="w-full bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Event URL:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-white px-3 py-2 rounded border font-mono">
              {eventUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <Button
            onClick={handleDownloadQR}
            variant="outline"
            className="flex-1"
            disabled={!qrDataUrl}
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR
          </Button>
          <Button
            onClick={handleShareQR}
            variant="outline"
            className="flex-1"
          >
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}