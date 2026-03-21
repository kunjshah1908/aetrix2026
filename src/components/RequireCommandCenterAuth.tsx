import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSupabaseAuthClient, isSupabaseAuthConfigured } from '../lib/supabaseClient';

interface RequireCommandCenterAuthProps {
  children: ReactNode;
}

export default function RequireCommandCenterAuth({ children }: RequireCommandCenterAuthProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseAuthConfigured) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseAuthClient();

    const verifyCommandCenterUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!mounted) return;
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('command_center_profiles')
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (!mounted) return;

      if (error || profile?.role !== 'command_center') {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setIsLoading(false);
    };

    void verifyCommandCenterUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      void verifyCommandCenterUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-page)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
