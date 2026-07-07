import * as React from "react";
import { BrowserRouter, Routes, Route, useParams, Navigate, Outlet } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import { AccessGuard } from "./components/AccessGuard";

// Importações das páginas operacionais do sistema
import PaginaEventosGeral from "./pages/events/page";
import GerenciadorLotes from "./pages/batches/page";
import ImpressaoLotePage from "./pages/dashboard/ImpressaoLotePage";
import MesaSorteioPage from "./pages/dashboard/MesaSorteioPage";
import ValidationPage from "./pages/validate/ValidationPage";
import PainelCartelasMestre from "./pages/cartelas/page";
import GiroSortePage from "./pages/giro/page";
import GerenciadorCambistasMestre from "./pages/vendors/page";
import ModuloRifasMestre from "./pages/rifas/page";
// 👑 WRAPPERS DE REDIRECIONAMENTO: Capturam o eventId da URL e injetam nas páginas de forma limpa
function MesaSorteioPageWrapper() {
  const { eventId } = useParams<{ eventId: string }>();
  return <MesaSorteioPage eventId={eventId || ""} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Raiz redireciona direto para a tela de Eventos */}
        <Route path="/" element={<Navigate to="/events" replace />} />

        {/* 🔒 CONFIGURAÇÃO DE ROTAS INTEGRADA: 
            Renderiza a verificação de acesso e o menu lateral diretamente na rota pai, 
            garantindo que o ConvexProvider (que está no seu index.tsx/main.tsx) cubra tudo perfeitamente! */}
        <Route 
          element={
            <AccessGuard>
              <AppLayout>
                <Outlet />
              </AppLayout>
            </AccessGuard>
          }
        >
          {/* Páginas Internas do Painel Administrativo */}
          <Route path="/events" element={<PaginaEventosGeral />} />
          <Route path="/batches" element={<GerenciadorLotes />} />
          <Route path="/impressao-lote/:eventId/:batchId" element={<ImpressaoLotePage />} />
          <Route path="/sorteio/:eventId" element={<MesaSorteioPageWrapper />} />
          <Route path="/validar/:eventId" element={<ValidationPage />} />

          {/* Placeholders temporários para as demais telas do menu lateral */}
          <Route path="/cartelas" element={<PainelCartelasMestre />} />
          <Route path="/giro" element={<GiroSortePage />} />
          <Route path="/vendors" element={<GerenciadorCambistasMestre />} />
          <Route path="/rifas" element={<ModuloRifasMestre />} />
          <Route path="/design-cartela" element={<div className="p-6 text-slate-400 font-bold">Estilização e Cores do Bilhete</div>} />
          <Route path="/reports" element={<div className="p-6 text-slate-400 font-bold">Relatórios Financeiros e Auditorias</div>} />
          <Route path="/dashboard" element={<div className="p-6 text-slate-400 font-bold">Dashboard Estatística Antiga</div>} />
          <Route path="/info" element={<div className="p-6 text-slate-400 font-bold">Informações Gerais do Sistema Hercules</div>} />
        </Route>

        {/* Rota de segurança para caminhos inválidos ou inexistentes */}
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
