// hooks/useAuth.ts
import { auth } from '@/lib/auth';
import { useEffect, useState } from 'react';

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const sessionData = await auth.api.getSession({
          headers: new Headers({
            'Content-Type': 'application/json',
          }),
        });
        setSession(sessionData);
      } catch (error) {
        console.error('Failed to get session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  return { session, loading };
}