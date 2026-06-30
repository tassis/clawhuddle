import NextAuth from 'next-auth';
import GitLab from 'next-auth/providers/gitlab';
import Authentik from 'next-auth/providers/authentik';
import Credentials from 'next-auth/providers/credentials';
import {
  getEnabledProductProviders,
  isDevCredentialsEnabled,
  type InternalAuthProvider,
} from './auth-providers';

const enabledProductProviders = getEnabledProductProviders();

const buildAuthentikProvider = () =>
  Authentik({
    id: 'authentik',
    clientId: process.env.AUTHENTIK_CLIENT_ID!,
    clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
    issuer: process.env.AUTHENTIK_ISSUER!,
  });

const buildGitLabProvider = () =>
  GitLab({
    clientId: process.env.GITLAB_CLIENT_ID!,
    clientSecret: process.env.GITLAB_CLIENT_SECRET!,
    ...(process.env.GITLAB_BASE_URL
      ? {
          baseUrl: process.env.GITLAB_BASE_URL,
        }
      : {}),
  });

const buildProductProvider = (provider: InternalAuthProvider) => {
  switch (provider.id) {
    case 'gitlab':
      return buildGitLabProvider();
    case 'authentik':
      return buildAuthentikProvider();
    default:
      return undefined;
  }
};

const providers = [
  ...enabledProductProviders
    .map(buildProductProvider)
    .filter((provider): provider is NonNullable<ReturnType<typeof buildProductProvider>> => Boolean(provider)),
  ...(isDevCredentialsEnabled()
    ? [
        Credentials({
          name: 'Dev Login',
          credentials: {
            email: { label: 'Email', type: 'email' },
          },
          async authorize(credentials) {
            const email = credentials?.email as string;
            if (!email) return null;
            return { id: email, email, name: email.split('@')[0] };
          },
        }),
      ]
    : []),
];
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return true;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000';
        const res = await fetch(`${apiUrl}/api/auth/check-access?email=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          return data.allowed;
        }
        // If API is unreachable, allow sign-in to avoid lockout
        return true;
      } catch {
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000'}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              avatar_url: (user as any).image || null,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            token.userId = data.data.id;
          }
        } catch (err) {
          console.error('Failed to sync user with API:', err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
});
