import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { DashboardView } from "@/features/dashboard/DashboardView";
import { PatientsList } from "@/features/patients/PatientsList";
import { PatientDetail } from "@/features/patients/PatientDetail";
import { ServicesView } from "@/features/services/ServicesView";
import { PackagesView } from "@/features/packages/PackagesView";
import { InventoryView } from "@/features/inventory/InventoryView";
import { AgendaView } from "@/features/agenda/AgendaView";
import { PaymentsView } from "@/features/payments/PaymentsView";
import { BillingView } from "@/features/billing/BillingView";
import { AdminView } from "@/features/admin/AdminView";
import { StubView } from "@/features/_stubs/StubView";
import { PlatformView } from "@/features/platform/PlatformView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function Shell() {
  const { profile, loading } = useAuth();
  if (loading) return <div className="app-loader">Cargando sesión…</div>;
  if (!profile) return <LoginScreen />;
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/patients" element={<PatientsList />} />
            <Route path="/patients/:id" element={<Navigate to="antecedentes" replace />} />
            <Route path="/patients/:id/:tab" element={<PatientDetail />} />
            <Route path="/agenda" element={<AgendaView />} />
            <Route path="/services" element={<ServicesView />} />
            <Route path="/procedures" element={<StubView mod="Procedimientos" />} />
            <Route path="/packages" element={<PackagesView />} />
            <Route path="/payments" element={<PaymentsView />} />
            <Route path="/billing" element={<BillingView />} />
            <Route path="/inventory" element={<InventoryView />} />
            <Route path="/admin" element={<AdminView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/platform" element={<PlatformView />} />
          <Route path="/*" element={<AuthProvider><Shell /></AuthProvider>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
