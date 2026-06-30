'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { ClawHuddleLogo } from '@/components/logo';
import { AuthProviderButtonList } from '@/components/auth-provider-buttons';
import type { InternalAuthProvider } from '@/lib/auth-providers';

type AuthProviderConfig = {
  providers: InternalAuthProvider[];
  showDevLogin: boolean;
};

const defaultConfig: AuthProviderConfig = {
  providers: [],
  showDevLogin: false,
};

async function getAuthProviderConfig(): Promise<AuthProviderConfig> {
  const res = await fetch('/api/auth/provider-config', { cache: 'no-store' });
  if (!res.ok) return defaultConfig;

  return res.json();
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [providerConfig, setProviderConfig] = useState<AuthProviderConfig>(defaultConfig);

  useEffect(() => {
    let active = true;
    getAuthProviderConfig()
      .then((config) => {
        if (active) {
          setProviderConfig(config);
        }
      })
      .catch(() => {
        if (active) {
          setProviderConfig(defaultConfig);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const providers = providerConfig.providers;
  const showDevLogin = providerConfig.showDevLogin;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255, 77, 77, 0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-sm w-full space-y-8 p-8">
        {/* Brand */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{
              background: 'var(--accent-muted)',
              border: '1px solid rgba(255, 77, 77, 0.2)',
            }}
          >
            <ClawHuddleLogo size={28} />
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            ClawHuddle
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Sign in to your AI assistant
          </p>
        </div>

        <AuthProviderButtonList providers={providers} callbackUrl="/home" />

        {!showDevLogin && providers.length === 0 ? (
          <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
            No sign-in provider is configured. Set at least one internal provider (GitLab or Authentik) in your environment.
          </p>
        ) : null}

        {/* Dev Login */}
        {showDevLogin && (
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
              onSubmit={async (e) => {
                e.preventDefault();
                await signIn('credentials', { email, callbackUrl: '/home' });
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
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-hover)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 77, 77, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Dev Sign In
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
