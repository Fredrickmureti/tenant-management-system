import { useState, useEffect } from 'react';

// Custom hook for real-time clock that updates every second
export const useRealTimeClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return currentTime;
};

// Get appropriate greeting based on time of day
export const getTimeGreeting = (time: Date) => {
  const hour = time.getHours();
  if (hour < 12) return '🌅 Good morning';
  if (hour < 17) return '☀️ Good afternoon';
  if (hour < 21) return '🌆 Good evening';
  return '🌙 Good night';
};

// Format time for different locales
export const formatTime = (time: Date, locale = 'en-KE') => {
  return time.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Format date for different locales
export const formatDate = (time: Date, locale = 'en-KE') => {
  return time.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
