'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import { AuthProviderButtonList } from '@/components/auth-provider-buttons';
import type { InternalAuthProvider } from '@/lib/auth-providers';

interface InviteDetails {
  org_name: string;
  email: string;
  role: string;
  invited_by_name: string;
  expires_at: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { data: session, status: authStatus } = useSession();
  const { refreshOrgs } = useOrg();
  const router = useRouter();
  const userId = session?.user?.id;
  const [authProviders, setAuthProviders] = useState<InternalAuthProvider[]>([]);
  const [showDevLogin, setShowDevLogin] = useState(false);

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  // Treat "logged in but no userId" as needing re-auth
  const needsSignIn = authStatus === 'unauthenticated' || (authStatus === 'authenticated' && !userId);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/provider-config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        setAuthProviders((payload.providers as InternalAuthProvider[]) || []);
        setShowDevLogin(Boolean(payload.showDevLogin));
      })
      .catch(() => {
        if (!active) return;
        setAuthProviders([]);
        setShowDevLogin(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: InviteDetails }>(`/api/invitations/${token}`)
      .then((res) => setInvite(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const acceptInvite = async () => {
    if (!userId) return;
    setAccepting(true);
    setError('');
    try {
      await apiFetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: JSON.stringify({ token }),
      });
      await refreshOrgs();
      router.push('/home');
    } catch (err: any) {
      if (err.message === 'User not found') {
        setError('Session expired. Please sign in again.');
        signOut({ redirect: false });
      } else {
        setError(err.message);
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--border-primary)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center max-w-sm p-8">
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Invalid Invitation
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-sm w-full p-8">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{
              background: 'var(--accent-muted)',
              border: '1px solid rgba(199, 148, 74, 0.2)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Join {invite?.org_name}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {invite?.invited_by_name} invited you as {invite?.role}
          </p>
        </div>

        {error && (
          <p className="text-xs text-center mb-4" style={{ color: 'var(--red)' }}>{error}</p>
        )}

        {needsSignIn ? (
          <div className="space-y-3">
            <AuthProviderButtonList providers={authProviders} callbackUrl={`/invite/${token}`} />

            {!showDevLogin && authProviders.length === 0 ? (
              <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
                No sign-in provider is configured. Set at least one internal provider (GitLab or Authentik) in your environment.
              </p>
            ) : null}

            {showDevLogin && (
              <DevLoginForm callbackUrl={`/invite/${token}`} inviteEmail={invite?.email} />
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={acceptInvite}
              disabled={accepting}
              className="w-full px-4 py-3 rounded-lg font-medium text-sm transition-all duration-150 disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
            >
              {accepting ? 'Joining...' : 'Accept Invitation'}
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              Signed in as {session?.user?.email}
              {' \u00b7 '}
              <button
                onClick={() => signOut({ redirect: false })}
                className="underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                use a different account
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DevLoginForm({ callbackUrl, inviteEmail }: { callbackUrl: string; inviteEmail?: string }) {
  const [email, setEmail] = useState(inviteEmail || '');

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid var(--border-primary)' }} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3" style={{ background: 'var(--bg-base)', color: 'var(--text-tertiary)' }}>
            local developer credentials
          </span>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn('credentials', { email, callbackUrl });
        }}
        className="space-y-3"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full px-4 py-3 text-sm rounded-lg"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-3 rounded-lg font-medium text-sm transition-all duration-150"
          style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
        >
          Dev Sign In
        </button>
      </form>
    </>
  );
}
