import * as React from 'react';
import { LoginScreen } from "../pages/Login";

export function AccessGuard({ children }: { children: React.ReactNode }) {
  // Lê diretamente o token salvo no navegador pelo formulário de Login
  const token = localStorage.getItem("hercules_session_token");

  // Se o usuário não tiver um token ativo, exibe a tela de login bloqueando o resto do site
  if (!token) {
    return <LoginScreen />;
  }

  // Se tiver um token (comum ou admin), renderiza as páginas do site normalmente
  return <>{children}</>;
}
