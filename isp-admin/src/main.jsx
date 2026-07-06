import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';

import { useAuthStore }  from './store/auth.store';
import Layout            from './components/layout/Layout';
import LoginPage         from './pages/Login';
import Dashboard         from './pages/Dashboard';
import OrdenesPage       from './pages/Ordenes';
import OrdenDetalle      from './pages/OrdenDetalle';
import Clientes          from './pages/Clientes';
import ClienteDetalle    from './pages/ClienteDetalle';
import TecnicosPage      from './pages/Tecnicos';
import SecretariosPage   from './pages/Secretarios';
import ReportesPage      from './pages/Reportes';
import PerfilPage        from './pages/Perfil';
import ResetPasswordPage from './pages/ResetPassword';
import MapaPage          from './pages/Mapa';
import ProgramarPage     from './pages/Programar'; //SE AGREGO
import PlanesPage        from './pages/Planes';
import PlantaExternaPage from './pages/PlantaExterna';
// Nota: La página Usuarios.jsx ya no se usa en el panel admin.
// El admin solo gestiona técnicos (desde /tecnicos).
// La creación de admins y operadores NOC es exclusiva del SUPERADMIN (panel NOC).
// ─── Almacén ───────────────────────────────────────────────────
import AdminAlmacenDashboard  from './pages/almacen/Dashboard';
import AdminAlmacenInventario from './pages/almacen/Inventario';
import AdminAlmacenReportes   from './pages/almacen/Reportes';
import DevolucionesPage from './pages/Devoluciones';
 

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  const token = useAuthStore(s => s.token);
  return (
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login"          element={token ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/"                  element={<Dashboard />}    />
                <Route path="/ordenes"           element={<OrdenesPage />}  />
                <Route path="/ordenes/:id"       element={<OrdenDetalle />} />
                <Route path="/clientes"         element={<Clientes />} />
                <Route path="/clientes/:numero" element={<ClienteDetalle />} />
                <Route path="/tecnicos"          element={<TecnicosPage />} />
                <Route path="/secretarios"       element={<SecretariosPage />} />
                <Route path="/reportes"          element={<ReportesPage />} />
                <Route path="/perfil"            element={<PerfilPage />}   />
                <Route path="/mapa"              element={<MapaPage />} />
                <Route path="/programar"         element={<ProgramarPage />} />
                <Route path="/almacen"               element={<AdminAlmacenDashboard />} />
                <Route path="/almacen/inventario"    element={<AdminAlmacenInventario />}/>
                <Route path="/almacen/reportes"      element={<AdminAlmacenReportes />}  />
                <Route path="/planes"                element={<PlanesPage />} />
                <Route path="/almacen/devoluciones"  element={<DevolucionesPage />} />
                <Route path="/planta-externa"        element={<PlantaExternaPage />} />

                <Route path="*"                  element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={qc}>
    <App />
    <Toaster position="top-right" toastOptions={{
      style: { background: 'var(--bg-2)', color: 'var(--txt)', border: '1px solid var(--border-2)', fontSize: 13, borderRadius: 10 },
      success: { iconTheme: { primary: '#22c55e', secondary: 'transparent' } },
      error:   { iconTheme: { primary: '#ef4444', secondary: 'transparent' } },
    }} />
  </QueryClientProvider>
);