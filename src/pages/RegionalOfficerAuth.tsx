import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseAuthClient, isSupabaseAuthConfigured } from '../lib/supabaseClient';

const PROFILE_TABLE = 'regional_officer_profiles';

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function RegionalOfficerAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const redirectIfAuthenticatedRegionalOfficer = async () => {
      if (!isSupabaseAuthConfigured) {
        return;
      }

      const supabase = getSupabaseAuthClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!mounted || !user) {
        return;
      }

      const { data: profile } = await supabase
        .from(PROFILE_TABLE)
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (!mounted) {
        return;
      }

      if (profile?.role === 'regional_officer') {
        navigate('/regional/dashboard', { replace: true });
      }
    };

    void redirectIfAuthenticatedRegionalOfficer();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const createOrUpdateProfile = async (userId: string, userEmail: string) => {
    const supabase = getSupabaseAuthClient();
    const { error } = await supabase.from(PROFILE_TABLE).upsert(
      {
        id: userId,
        email: userEmail,
        role: 'regional_officer',
      },
      { onConflict: 'id' },
    );

    if (error) {
      throw new Error('Authenticated, but profile save failed. Please check regional_officer_profiles table and RLS policies.');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password) {
      setErrorMessage('Please enter login ID (email) and password.');
      return;
    }

    if (!isSupabaseAuthConfigured) {
      setErrorMessage('Supabase auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const supabase = getSupabaseAuthClient();

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { role: 'regional_officer' },
          },
        });

        if (error) {
          throw error;
        }

        if (data.user && data.session) {
          await createOrUpdateProfile(data.user.id, normalizedEmail);
          navigate('/regional/dashboard');
          return;
        }

        setSuccessMessage('Account created. Check your email for verification, then login.');
        setMode('signin');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        await createOrUpdateProfile(data.user.id, normalizedEmail);
      }

      navigate('/regional/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="regional-auth-page">
      <div className="regional-auth-card">
        <div className="regional-auth-header">
          <div className="regional-auth-chip">Regional Officer Access</div>
          <h1>{mode === 'signin' ? 'Login' : 'Create Regional Officer Account'}</h1>
          <p>
            {mode === 'signin'
              ? 'Use your login ID and password to access the Regional Officer dashboard.'
              : 'Create a new officer account with email-based authentication.'}
          </p>
        </div>

        <form className="regional-auth-form" onSubmit={handleSubmit}>
          <label>
            Login ID (Email)
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="officer@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </label>

          {errorMessage && <div className="regional-auth-message error">{errorMessage}</div>}
          {successMessage && <div className="regional-auth-message success">{successMessage}</div>}

          <button type="submit" className="regional-auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="regional-auth-actions">
          {mode === 'signin' ? (
            <button type="button" className="regional-auth-secondary" onClick={() => setMode('signup')}>
              Create New Account
            </button>
          ) : (
            <button type="button" className="regional-auth-secondary" onClick={() => setMode('signin')}>
              Back to Login
            </button>
          )}
          <button type="button" className="regional-auth-link" onClick={() => navigate('/')}>
            Back to Public Report Page
          </button>
        </div>
      </div>
    </div>
  );
}
