import { NextResponse } from 'next/server';
import { PRODUCT_AUTH_PROVIDERS, isProviderEnabled, isDevCredentialsEnabled } from '@/lib/auth-providers';

export const GET = () => {
  const enabledProviders = PRODUCT_AUTH_PROVIDERS.filter((provider) => isProviderEnabled(provider.id)).map((provider) => ({
    id: provider.id,
    authProviderId: provider.authProviderId,
    label: provider.label,
    icon: provider.icon,
    signInOptions: provider.signInOptions,
  }));

  return NextResponse.json({
    providers: enabledProviders,
    showDevLogin: isDevCredentialsEnabled(),
  });
};
