// hooks/useAttendance.ts

import { useState, useEffect, useCallback } from "react";
import type {
  Attendance,
  ClockInResponse,
  ClockOutResponse,
} from "@/types/attendance";

interface UseAttendanceReturn {
  attendance: Attendance | null;
  isClockedIn: boolean;
  isLoading: boolean;
  error: string | null;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useAttendance(): UseAttendanceReturn {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/attendance/status");
      const data = await response.json();

      if (data.success) {
        setAttendance(data.attendance);
        setIsClockedIn(data.isClockedIn);
      } else {
        setError(data.message || "Failed to fetch attendance status");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Fetch status error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clockIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/attendance/clock-in", {
        method: "POST",
      });

      const data: ClockInResponse = await response.json();

      if (data.success && data.attendance) {
        setAttendance(data.attendance);
        setIsClockedIn(true);
      } else {
        setError(data.message || "Failed to clock in");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Clock in error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clockOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/attendance/clock-out", {
        method: "POST",
      });

      const data: ClockOutResponse = await response.json();

      if (data.success && data.attendance) {
        setAttendance(data.attendance);
      } else {
        setError(data.message || "Failed to clock out");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Clock out error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    attendance,
    isClockedIn,
    isLoading,
    error,
    clockIn,
    clockOut,
    refreshStatus: fetchStatus,
  };
}
