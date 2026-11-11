import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import { useAuthStore }    from './store/auth.store';
import Layout              from './components/layout/Layout';
import LoginPage           from './pages/Login';
import MonitorPage         from './pages/Monitor';
import PendientesPage      from './pages/Pendientes';
import SeguimientoPage     from './pages/Seguimiento';
import OrdenDetallePage    from './pages/OrdenDetalle';
import UsuariosPage        from './pages/Usuarios';
import SedesPage           from './pages/Sedes';
import OnusPendientesPage  from './pages/OnusPendientes';
import Clientes            from './pages/Clientes';
import ClienteDetalle      from './pages/ClienteDetalle';
import LogsPage            from './pages/Logs';
import ConfigTiposOrden    from './pages/ConfigTiposOrden';
// ── Almacén ──────────────────────────────────────────────────
import AlmacenDashboard    from './pages/almacen/AlmacenDashboard';
import AlmacenInventario   from './pages/almacen/AlmacenInventario';
import AlmacenCatalogo     from './pages/almacen/AlmacenCatalogo';
import AlmacenReportes     from './pages/almacen/AlmacenReportes';
import BuscarEquipoPage    from './pages/almacen/BuscarEquipo';
import PerfilPage           from './pages/PerfilPage';
import ResetPasswordPage    from './pages/ResetPassword';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

// Ruta solo para SUPERADMIN — redirige al monitor si no tiene permiso
function SuperAdminRoute({ children }) {
  const usuario = useAuthStore(s => s.usuario);
  return usuario?.rol === 'SUPERADMIN' ? children : <Navigate to="/" replace />;
}

function App() {
  const token = useAuthStore(s => s.token);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"          element={token ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/"                  element={<MonitorPage />}     />
                <Route path="/pendientes"         element={<PendientesPage />}  />
                <Route path="/seguimiento"        element={<SeguimientoPage />} />
                <Route path="/seguimiento/:id"    element={<OrdenDetallePage />}/>
                <Route path="/onus-pendientes"    element={<OnusPendientesPage />} />
                <Route path="/clientes"           element={<Clientes />}        />
                <Route path="/clientes/:numero"   element={<ClienteDetalle />}  />

                {/* ── Almacén ── */}
                <Route path="/almacen"            element={<AlmacenDashboard />}  />
                <Route path="/almacen/inventario" element={<AlmacenInventario />} />
                <Route path="/almacen/catalogo"   element={<AlmacenCatalogo />}   />
                <Route path="/almacen/reportes"   element={<AlmacenReportes />}   />
                <Route path="/almacen/equipo"     element={<BuscarEquipoPage />}  />

                {/* Solo SUPERADMIN */}
                <Route path="/sedes"    element={<SuperAdminRoute><SedesPage /></SuperAdminRoute>}    />
                <Route path="/usuarios" element={<SuperAdminRoute><UsuariosPage /></SuperAdminRoute>} />
                <Route path="/logs"     element={<SuperAdminRoute><LogsPage /></SuperAdminRoute>}     />
                <Route path="/tipos-orden" element={<SuperAdminRoute><ConfigTiposOrden /></SuperAdminRoute>} />
                <Route path="/perfil"   element={<PerfilPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
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
      style: {
        background: 'var(--bg-2)', color: 'var(--txt)',
        border: '1px solid var(--border-2)', fontSize: 12,
        borderRadius: 8, fontFamily: 'var(--font-mono)',
      },
      success: { iconTheme: { primary: '#3fb950', secondary: 'transparent' } },
      error:   { iconTheme: { primary: '#f85149', secondary: 'transparent' } },
    }} />
  </QueryClientProvider>
);