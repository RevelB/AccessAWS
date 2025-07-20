
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateLastActive } from '@/lib/userPrefs';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const DB_UPDATE_THROTTLE_MS = 60 * 1000; // 1 minute

export function useInactivityTimeout() {
  const { user, logout } = useAuth();

  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDbUpdateRef = useRef<number>(0);

  const handleLogout = useCallback(() => {
    // Check if there's a user session before attempting to log out.
    if (user) {
        logout().catch(error => {
            console.error("Failed to auto-logout due to inactivity:", error);
        });
    }
  }, [logout, user]);

  const updateUserLastActive = useCallback(async () => {
    if (!user) return;
    
    const now = Date.now();
    // Throttle database updates to avoid excessive writes.
    if (now - lastDbUpdateRef.current < DB_UPDATE_THROTTLE_MS) {
      return;
    }

    lastDbUpdateRef.current = now;
    
    try {
      await updateLastActive(user.userId);
    } catch (error) {
      console.error("Failed to update user last active time:", error);
    }
  }, [user]);

  const resetTimer = useCallback(() => {
    // Clear the previous timer
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    // Set a new timer
    logoutTimerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
    
    // Update the last active time in the database (throttled)
    updateUserLastActive();

  }, [handleLogout, updateUserLastActive]);

  useEffect(() => {
    // If there's no user, we don't need to do anything.
    if (!user) {
      return;
    }

    // List of events that indicate user activity
    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize the timer when the component mounts
    resetTimer();

    // Cleanup function to remove event listeners and clear the timer
    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, resetTimer]);
}
