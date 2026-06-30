export type ProductAuthProviderId = 'gitlab' | 'authentik';

export type InternalAuthProvider = {
  /** Internal provider identifier used in app-level logic. */
  id: ProductAuthProviderId;

  /** Provider id expected by NextAuth signIn(providerId). */
  authProviderId: string;

  /** Human-readable label for buttons and copy. */
  label: string;

  /** Optional icon token so UI can render provider-specific branding without hardcoding. */
  icon?: string;

  /** Additional provider-specific sign-in option overrides. */
  signInOptions?: Record<string, unknown>;
};

const isEnvValueSet = (value?: string) => Boolean(value && value.trim().length > 0);

export const PRODUCT_AUTH_PROVIDERS: ReadonlyArray<InternalAuthProvider> = [
  {
    id: 'gitlab',
    authProviderId: 'gitlab',
    label: 'GitLab',
    icon: 'gitlab',
    signInOptions: {
      prompt: 'select_account',
    },
  },
  {
    id: 'authentik',
    authProviderId: 'authentik',
    label: 'Authentik',
    icon: 'authentik',
  },
];

export const isGitLabProviderEnabled = (): boolean =>
  isEnvValueSet(process.env.GITLAB_CLIENT_ID) && isEnvValueSet(process.env.GITLAB_CLIENT_SECRET);

export const isAuthentikProviderEnabled = (): boolean =>
  isEnvValueSet(process.env.AUTHENTIK_CLIENT_ID) &&
  isEnvValueSet(process.env.AUTHENTIK_CLIENT_SECRET) &&
  isEnvValueSet(process.env.AUTHENTIK_ISSUER);

const INTERNAL_PROVIDER_ENABLED_PREDICATES: Record<ProductAuthProviderId, () => boolean> = {
  gitlab: isGitLabProviderEnabled,
  authentik: isAuthentikProviderEnabled,
};

export const isProviderEnabled = (providerId: ProductAuthProviderId): boolean =>
  INTERNAL_PROVIDER_ENABLED_PREDICATES[providerId]();

export const getEnabledProductProviders = (): InternalAuthProvider[] =>
  PRODUCT_AUTH_PROVIDERS.filter((provider) => isProviderEnabled(provider.id));

export const hasAnyProductProviderConfigured = (): boolean =>
  getEnabledProductProviders().length > 0;

export const getProductProviderByAuthId = (
  authProviderId: string,
): InternalAuthProvider | undefined =>
  PRODUCT_AUTH_PROVIDERS.find((provider) => provider.authProviderId === authProviderId);

/**
 * Dev-login is intentionally kept separate from product providers and remains a local helper.
 */
export const isDevCredentialsEnabled = (): boolean =>
  process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_ENABLE_DEV_CREDENTIALS === 'true';
