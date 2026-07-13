import axios from 'axios';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/*const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});*/

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('noc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor de refresh token automático ──────────────────
let refreshingToken = false;
let refreshQueue    = [];

const procesarQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  refreshQueue = [];
};

api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;
    const esLogin         = originalRequest?.url?.includes('/auth/login');
    const esRefresh       = originalRequest?.url?.includes('/auth/refresh');

    if (err.response?.status === 401 && !esLogin && !esRefresh && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('noc_refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('noc_token');
        localStorage.removeItem('noc_usuario');
        localStorage.removeItem('noc_refresh_token');
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (refreshingToken) {
        // Encolar mientras se está renovando
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      refreshingToken        = true;

      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        const nuevoToken = data.token;

        localStorage.setItem('noc_token', nuevoToken);
        api.defaults.headers.common.Authorization = `Bearer ${nuevoToken}`;
        originalRequest.headers.Authorization     = `Bearer ${nuevoToken}`;

        procesarQueue(null, nuevoToken);
        return api(originalRequest);
      } catch (refreshErr) {
        procesarQueue(refreshErr, null);
        localStorage.removeItem('noc_token');
        localStorage.removeItem('noc_usuario');
        localStorage.removeItem('noc_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        refreshingToken = false;
      }
    }

    return Promise.reject(err);
  }
);

export const authApi = {
  login:           (data)          => api.post('/auth/login', data),
  login2fa:        (data)          => api.post('/auth/login', data),
  logout:          ()              => api.post('/auth/logout'),
  refresh:         (refreshToken)  => api.post('/auth/refresh', { refreshToken }),
  generar2fa:      ()              => api.post('/auth/2fa/generar'),
  activar2fa:      (codigo)        => api.post('/auth/2fa/activar', { codigo }),
  desactivar2fa:   (codigo)        => api.post('/auth/2fa/desactivar', { codigo }),
  cambiarPassword: (data)          => api.patch('/auth/cambiar-password', data),
  solicitarReset:  (email)         => api.post('/auth/solicitar-reset', { email }),
  resetPassword:   (data)          => api.post('/auth/reset-password', data),
};

export const ordenesApi = {
  listar:       (params)         => api.get('/ordenes', { params }),
  obtener:      (id)             => api.get(`/ordenes/${id}`),
  stats:        (params)         => api.get('/ordenes/stats', { params }),
  notificaciones: (params)       => api.get('/ordenes/notificaciones', { params }),
  ponerWan:     (id, data)       => api.patch(`/ordenes/${id}/datos-wan`, data),
  actualizar:   (id, data)       => api.patch(`/ordenes/${id}/datos`, data),
  historialWan: (usuarioId)      => api.get(`/ordenes/historial-wan?nocUsuarioId=${usuarioId}`),
  asignar:      (id, tecnicoId)  => api.patch(`/ordenes/${id}/asignar`, { tecnicoId }),
  cambiarEstado:(id, estado)     => api.patch(`/ordenes/${id}/estado`, { estado }),
  nocCompletar: (id, comentario) => api.patch(`/ordenes/${id}/noc-completar`, { comentario }),
};

export const tecnicosApi = {
  listar: (params) => api.get('/tecnicos', { params }),
};

export const usuariosApi = {
  listar:       (params)     => api.get('/usuarios', { params }),
  crear:        (data)       => api.post('/usuarios', data),
  actualizar:   (id, d)      => api.patch(`/usuarios/${id}`, d),
  password:     (id, d)      => api.patch(`/usuarios/${id}/password`, d),
  toggleActivo: (id, activo) => api.patch(`/usuarios/${id}/activar`, { activo }),
  cerrarSesion:    (id)         => api.patch(`/usuarios/${id}/cerrar-sesion`),
  actualizarPerfil:(data)       => api.patch('/usuarios/perfil', data),
  desactivar2fa:   (id)         => api.patch(`/usuarios/${id}/desactivar-2fa`),
};

export const sedesApi = {
  listar:     ()      => api.get('/sedes'),
  obtener:    (id)    => api.get(`/sedes/${id}`),
  crear:      (data)  => api.post('/sedes', data),
  actualizar: (id, d) => api.put(`/sedes/${id}`, d),
};

// OLTs — SUPERADMIN gestiona, ADMIN ve las de su sede
export const oltApi = {
  fabricantes:   ()         => api.get('/olt/fabricantes'),
  listar:        ()         => api.get('/olt'),
  listarPorSede: (sedeId)   => api.get(`/olt/sede/${sedeId}`),
  crear:         (data)     => api.post('/olt', data),
  actualizar:    (id, data) => api.put(`/olt/${id}`, data),
  eliminar:      (id)       => api.delete(`/olt/${id}`),
  test:          (id)       => api.post(`/olt/${id}/test`),
};

export const equiposCabeceraApi = {
  listarPorSede: (sedeId)   => api.get(`/equipos-cabecera/sede/${sedeId}`),
  crear:         (data)     => api.post('/equipos-cabecera', data),
  actualizar:    (id, data) => api.put(`/equipos-cabecera/${id}`, data),
  eliminar:      (id)       => api.delete(`/equipos-cabecera/${id}`),
  verContrasena: (id)       => api.get(`/equipos-cabecera/${id}/contrasena`),
};

export const instalacionesApi = {
  obtener:        (id)      => api.get(`/instalaciones/${id}`),
  pendientesOlt:  (sedeId)  => api.get('/instalaciones/pendientes-olt', { params: sedeId ? { sedeId } : {} }),
  autorizarOlt:   (id, data) => api.post(`/instalaciones/${id}/autorizar-olt`, data),
};

export const contratosApi = {
  listar:    (params)         => api.get('/contratos', { params }),
  obtener:   (numero, params) => api.get(`/contratos/${numero}`, { params }),
  guardarWan: (numero, data, sedeId)  => api.patch(`/contratos/${numero}/wan`, data, { params: sedeId ? { sedeId } : {} }),
};

export const notificacionesApi = {
  listar:              (params)  => api.get('/notificaciones', { params }),
  marcarLeida:         (id)      => api.patch(`/notificaciones/${id}/leida`),
  marcarTodasLeidas:   (sedeId)  => api.patch('/notificaciones/marcar-todas-leidas', sedeId ? { sedeId } : {}),
};

// ─── Inventario ────────────────────────────────────────────────
 
export const productosApi = {
  listar:             (params)      => api.get('/productos', { params }),
  catalogo:           (params)      => api.get('/productos', { params: { ...params, catalogo: true } }),
  categorias:         ()            => api.get('/productos/categorias'),
  crear:              (data)        => api.post('/productos', data),
  actualizar:         (id, data)    => api.put(`/productos/${id}`, data),
  stockPorSede:       (sedeId)      => api.get(`/productos/stock-sede/${sedeId}`),
  entrada:            (data)        => api.post('/productos/entrada', data),
  variantes:          (id, params)  => api.get(`/productos/${id}/variantes`, { params }),
  crearVariante:      (id, data)    => api.post(`/productos/${id}/variantes`, data),
  actualizarVariante: (id, data)    => api.put(`/productos/variantes/${id}`, data),
  eliminarVariante:   (id)          => api.delete(`/productos/variantes/${id}`),
};
 
export const stockApi = {
  listar:          (params) => api.get('/stock', { params }),
  stats:           (params) => api.get('/stock/stats', { params }),
  auditoria:       (params) => api.get('/stock/auditoria', { params }),
  entrada:         (data)   => api.post('/stock/entrada', data),
  salidaMultiple:  (data)   => api.post('/stock/salida-multiple', data),
  salidaDirecta:   (data)   => api.post('/stock/salida-directa', data),
  asignarCompleto: (data)   => api.post('/stock/asignar-completo', data),
  enviarSede:             (data)   => api.post('/stock/enviar-sede', data),
  listarEnviosOrigen:     (params) => api.get('/stock/envios/origen', { params }),
  listarEnviosPendientes: (params) => api.get('/stock/envios/pendientes', { params }),
  confirmarEnvio:         (id)     => api.post(`/stock/envios/${id}/confirmar`),
  cancelarEnvio:          (id, data) => api.post(`/stock/envios/${id}/cancelar`, data),
};
 
export const activosApi = {
  listar:             (params) => api.get('/activos', { params }),
  enviarDesdeAlmacen: (data)   => api.post('/activos/desde-almacen', data),
};
 
export const onusInventarioApi = {
  listar:          (params)   => api.get('/onus', { params }),
  disponibles:     (params)   => api.get('/onus', { params: { ...params, solo_disponibles: true } }),
  // Incluye también las ONUs sin código (stock numérico puro) — usado para
  // calcular cuántas unidades sin código hay disponibles antes de decidir
  // si hace falta pedir códigos específicos para completar una cantidad.
  disponiblesTodas:(params)   => api.get('/onus', { params: { ...params, solo_disponibles: true, incluir_sin_codigo: true } }),
  crear:           (data)     => api.post('/onus', data),
  actualizarCodigo:(id, data) => api.patch(`/onus/${id}/codigo`, data),
};

export const siscadreApi = {
  listarConexiones: (sedeId)       => api.get(`/siscadre/${sedeId}/conexiones`),
  guardarConexion:  (sedeId, data) => api.post(`/siscadre/${sedeId}/conexiones`, data),
  eliminarConexion: (id)           => api.delete(`/siscadre/conexiones/${id}`),
  probarConexion:   (id, data)     => api.post(`/siscadre/conexiones/${id}/probar`, data),
  sincronizar:      (sedeId)       => api.post(`/siscadre/${sedeId}/sync`),
};

export const tiposOrdenApi = {
  listar:     () => api.get('/tipos-orden'),
  obtener:    (codigo) => api.get(`/tipos-orden/${codigo}`),
  crear:      (data)   => api.post('/tipos-orden', data),
  actualizar: (codigo, data) => api.put(`/tipos-orden/${codigo}`, data),
};

export const logsApi = {
  listar: (params) => api.get('/logs', { params }),
  stats:  ()       => api.get('/logs/stats'),
};



export default api;