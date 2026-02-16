import { useState, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import type { TourId } from "@/types/tour";

export function useTour(tourId: TourId, autoStart: boolean = false) {
  const [run, setRun] = useState(false);
  const [completedTours, setCompletedTours] = useLocalStorage<string[]>(
    "completed-tours",
    [],
  );

  const isCompleted = completedTours.includes(tourId);

  useEffect(() => {
    if (autoStart && !isCompleted) {
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isCompleted]);

  const startTour = () => setRun(true);

  const resetTour = () => {
    setCompletedTours(completedTours.filter((id) => id !== tourId));
    setRun(true);
  };

  const skipTour = () => {
    if (!completedTours.includes(tourId)) {
      setCompletedTours([...completedTours, tourId]);
    }
    setRun(false);
  };

  return {
    run,
    isCompleted,
    startTour,
    resetTour,
    skipTour,
    setRun,
  };
}
