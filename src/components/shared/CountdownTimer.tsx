"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft <= 0) return null;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const dayStr = days === 1 ? "day" : "days";
  const hourStr = hours === 1 ? "hour" : "hours";
  const minStr = minutes === 1 ? "min" : "mins";

  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
      <span>Wait time:</span>
      <span className="text-accent">
        {days} {dayStr}, {hours} {hourStr} {minutes} {minStr}
      </span>
    </div>
  );
}
