import * as React from 'react';
import { ConvexReactClient, ConvexProvider } from 'convex/react';

// Inicializa o cliente buscando direto do seu .env.local
const convexUrl = (import.meta as any).env.VITE_CONVEX_URL as string;
const convex = new ConvexReactClient(convexUrl);

export function ConvexProviderWithHerculesAuth({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}

export { ConvexProviderWithHerculesAuth as ConvexProvider };
