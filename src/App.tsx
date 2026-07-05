import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import AppLayout from "./components/layout/AppLayout.tsx";
import AccessGuard from "./components/AccessGuard.tsx";
import EventsPage from "./pages/events/page.tsx";
import CardsPage from "./pages/cards/page.tsx";
import DrawPage from "./pages/draw/page.tsx";
import ValidatePage from "./pages/validate/page.tsx";
import DashboardPage from "./pages/dashboard/page.tsx";
import TelaoPage from "./pages/draw/telao.tsx";
import VendorPage from "./pages/vendor/page.tsx";
import VendorsPage from "./pages/vendors/page.tsx";
import ReportsPage from "./pages/reports/page.tsx";
import AdminPage from "./pages/admin/page.tsx";
import InfoPage from "./pages/info/page.tsx";
import GiroPage from "./pages/giro/page.tsx";
import BatchesPage from "./pages/batches/page.tsx";
import RifasPage from "./pages/rifas/page.tsx";
import DesignCartelaPage from "./pages/design-cartela/page.tsx";
import MeuPainelPage from "./pages/meu-painel/page.tsx";
import MinhasCartelasPage from "./pages/minhas-cartelas/page.tsx";
import ConvitePage from "./pages/convite/page.tsx";
import ValidadorPage from "./pages/validador/page.tsx";
import ValidarCartelaPage from "./pages/validar-cartela/page.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import { PwaInstallBanner } from "@/components/pwa-install-banner.tsx";

export default function App() {
  useServiceWorker();
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/telao" element={<TelaoPage />} />
          <Route path="/convite" element={<ConvitePage />} />
          <Route path="/validador" element={<ValidadorPage />} />
          <Route path="/validar-cartela" element={<ValidarCartelaPage />} />
          <Route path="/vendedor" element={<VendorPage />} />
          <Route path="/minhas-cartelas" element={<MinhasCartelasPage />} />
          <Route
            element={
              <AccessGuard>
                <AppLayout />
              </AccessGuard>
            }
          >
            <Route path="/" element={<EventsPage />} />
            <Route path="/cartelas" element={<CardsPage />} />
            <Route path="/sorteio" element={<DrawPage />} />
            <Route path="/validar" element={<ValidatePage />} />
            <Route path="/vendedores" element={<VendorsPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/informacoes" element={<InfoPage />} />
            <Route path="/giro" element={<GiroPage />} />
            <Route path="/lotes" element={<BatchesPage />} />
            <Route path="/rifas" element={<RifasPage />} />
            <Route path="/design-cartela" element={<DesignCartelaPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/meu-painel" element={<MeuPainelPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <PwaInstallBanner />
      </BrowserRouter>
    </DefaultProviders>
  );
}
