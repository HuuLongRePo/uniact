'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  targetDate: string;
  label?: string;
}

const EXPIRED_STATE = '__expired__';

export default function Countdown({
  targetDate,
  label = 'Thời gian còn lại để đăng ký',
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft(EXPIRED_STATE);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days} ngày ${hours} giờ ${minutes} phút`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} giờ ${minutes} phút ${seconds} giây`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes} phút ${seconds} giây`);
      } else {
        setTimeLeft(`${seconds} giây`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft === EXPIRED_STATE) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <Clock className="w-5 h-5 text-red-600" />
        <div>
          <p className="text-sm font-medium text-red-900">{label}</p>
          <p className="text-lg font-bold text-red-700">Đã đóng đăng ký</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
      <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
      <div>
        <p className="text-sm font-medium text-blue-900">{label}</p>
        <p className="text-2xl font-bold text-blue-700">{timeLeft}</p>
      </div>
    </div>
  );
}
