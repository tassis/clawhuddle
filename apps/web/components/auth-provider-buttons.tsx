import { signIn } from 'next-auth/react';
import type { InternalAuthProvider } from '@/lib/auth-providers';

type AuthProviderButtonListProps = {
  providers: InternalAuthProvider[];
  callbackUrl: string;
  className?: string;
};

const providerStyles: Record<string, { bg: string; border: string; icon: string }> = {
  gitlab: {
    bg: 'linear-gradient(90deg, #fc6d26, #e24329)',
    border: '1px solid rgba(252, 109, 38, 0.4)',
    icon: '🦊',
  },
  authentik: {
    bg: 'var(--bg-secondary)',
    border: 'var(--border-primary)',
    icon: '🔐',
  },
};

export function AuthProviderButtonList({ providers, callbackUrl, className = '' }: AuthProviderButtonListProps) {
  if (providers.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {providers.map((provider) => {
        const style = providerStyles[provider.id] ?? {
          bg: 'var(--bg-secondary)',
          border: 'var(--border-primary)',
          icon: '•',
        };

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() =>
              signIn(provider.authProviderId, {
                callbackUrl,
                redirect: true,
                redirectTo: callbackUrl,
                ...(provider.signInOptions as Record<string, unknown>),
              })
            }
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: style.bg,
              border: style.border,
              color: provider.id === 'gitlab' ? '#fff' : 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              if (provider.id === 'gitlab') {
                e.currentTarget.style.background = '#fc6d26';
              }
            }}
            onMouseLeave={(e) => {
              if (provider.id === 'gitlab') {
                e.currentTarget.style.background = style.bg;
              }
            }}
          >
            <span aria-hidden className="inline-block w-4 h-4 text-center leading-4 text-sm">
              {style.icon}
            </span>
            {`Sign in with ${provider.label}`}
          </button>
        );
      })}
    </div>
  );
}
