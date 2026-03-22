import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseAuthClient, isSupabaseAuthConfigured } from '../lib/supabaseClient';

const PROFILE_TABLE = 'command_center_profiles';

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export default function CommandCenterAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const redirectIfAuthenticatedCommandCenter = async () => {
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

      if (profile?.role === 'command_center') {
        navigate('/dashboard/home', { replace: true });
      }
    };

    void redirectIfAuthenticatedCommandCenter();

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
        role: 'command_center',
      },
      { onConflict: 'id' },
    );

    if (error) {
      throw new Error('Authenticated, but profile save failed. Please check command_center_profiles table and RLS policies.');
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
            data: { role: 'command_center' },
          },
        });

        if (error) {
          throw error;
        }

        if (data.user && data.session) {
          await createOrUpdateProfile(data.user.id, normalizedEmail);
          navigate('/dashboard/home');
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

      navigate('/dashboard/home');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="command-auth-page">
      <div className="command-auth-card">
        <div className="command-auth-header">
          <div className="command-auth-chip">Command Center Access</div>
          <h1>{mode === 'signin' ? 'Login' : 'Create Command Center Account'}</h1>
          <p>
            {mode === 'signin'
              ? 'Use your login ID and password to access the Command Center dashboard.'
              : 'Create a new Command Center account with email-based authentication.'}
          </p>
        </div>

        <form className="command-auth-form" onSubmit={handleSubmit}>
          <label>
            Login ID (Email)
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="command@example.com"
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

          {errorMessage && <div className="command-auth-message error">{errorMessage}</div>}
          {successMessage && <div className="command-auth-message success">{successMessage}</div>}

          <button type="submit" className="command-auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="command-auth-actions">
          {mode === 'signin' ? (
            <button type="button" className="command-auth-secondary" onClick={() => setMode('signup')}>
              Create New Account
            </button>
          ) : (
            <button type="button" className="command-auth-secondary" onClick={() => setMode('signin')}>
              Back to Login
            </button>
          )}
          <button type="button" className="command-auth-link" onClick={() => navigate('/')}>
            Back to Public Report Page
          </button>
        </div>
      </div>
    </div>
  );
}
