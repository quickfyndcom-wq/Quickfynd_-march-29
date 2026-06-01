'use client'
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ expiresAt, onExpire }) {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true
        });
        
        if (onExpire) {
          onExpire();
        }
        
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        expired: false
      });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (timeRemaining.expired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
        <div className="text-red-600 font-semibold">Offer expired</div>
      </div>
    );
  }

  const hh = String(timeRemaining.hours).padStart(2, '0');
  const mm = String(timeRemaining.minutes).padStart(2, '0');
  const ss = String(timeRemaining.seconds).padStart(2, '0');
  const showDays = timeRemaining.days > 0;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-orange-700 font-semibold">
          <Clock size={18} />
          <span>Limited time offer</span>
        </div>
        <div className="text-orange-900 font-bold tabular-nums">
          {showDays ? `${timeRemaining.days}d ` : ''}{hh}:{mm}:{ss}
        </div>
      </div>
      <div className="text-xs text-orange-700 mt-1">
        Special price ends soon
      </div>
    </div>
  );
}
