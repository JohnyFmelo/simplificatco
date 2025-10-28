
import React, { useState, useEffect } from "react";

export interface TCOTimerProps {
  startTime: Date | null;
  isRunning: boolean;
}

const TCOTimer: React.FC<TCOTimerProps> = ({ startTime, isRunning }) => {
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  useEffect(() => {
    if (!startTime || !isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - startTime.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');
      
      setElapsedTime(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [startTime, isRunning]);

  return (
    <div className="bg-green-100 rounded-md p-2 flex items-center">
      <div className="text-xs text-green-800 font-medium mr-1">Tempo:</div>
      <div className="text-sm font-semibold text-green-700">{elapsedTime}</div>
    </div>
  );
};

export default TCOTimer;
