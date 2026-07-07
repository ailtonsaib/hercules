import * as React from 'react';
import { ClerkProvider, useAuth } from '@clerk/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';

// Busca as chaves direto do seu arquivo .env.local
const convexUrl = (import.meta as any).env.VITE_CONVEX_URL as string;
const clerkKey = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY as string;

const convex = new ConvexReactClient(convexUrl);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!clerkKey) {
    return (
      <div style={{ padding: '20px', color: 'red', fontFamily: 'sans-serif' }}>
        <strong>Erro de Configuração:</strong> Variável VITE_CLERK_PUBLISHABLE_KEY não encontrada no seu arquivo .env.local.
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
