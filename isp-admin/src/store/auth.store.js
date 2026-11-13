import { create } from 'zustand';
import { authApi } from '../services/api';
import { queryClient } from '../queryClient';
import { useVistaStore } from './vista.store';

const cargarUsuarioInicial = () => {
  try {
    const stored = localStorage.getItem('admin_usuario');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    localStorage.removeItem('admin_usuario');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    return null;
  }
};

const invalidarTokenHuerfano = async (token) => {
  try {
    localStorage.setItem('admin_token', token);
    await authApi.logout();
  } catch {
  } finally {
    localStorage.removeItem('admin_token');
  }
};

export const useAuthStore = create((set, get) => ({
  usuario:        cargarUsuarioInicial(),
  token:          localStorage.getItem('admin_token')         || null,
  refreshToken:   localStorage.getItem('admin_refresh_token') || null,
  loading:        false,
  requiere2FA:    false,
  emailPendiente: '',
  _passwordTemp:  '',

  // ── Login paso 1: email + password ──────────────────────────
  login: async (email, password) => {
    set({ loading: true, requiere2FA: false });
    try {
      const { data } = await authApi.login({ email, password, dispositivo: 'Panel Admin' });

      // Backend pide código 2FA
      if (data.requiere2FA) {
        set({ loading: false, requiere2FA: true, emailPendiente: email });
        return { ok: false, requiere2FA: true };
      }

      if (!['ADMIN', 'SECRETARIA', 'SUPERVISOR', 'GERENTE'].includes(data.usuario.rol)) {
        await invalidarTokenHuerfano(data.token);
        set({ loading: false });
        return { ok: false, error: 'No tienes acceso al panel de administrador' };
      }

      // El gerente no tiene sede propia: ve todas y elige una arriba
      if (!data.usuario.sedeId && data.usuario.rol !== 'GERENTE') {
        await invalidarTokenHuerfano(data.token);
        set({ loading: false });
        return { ok: false, error: 'Tu usuario no tiene sede asignada. Contacta al administrador.' };
      }

      localStorage.setItem('admin_token',         data.token);
      localStorage.setItem('admin_refresh_token', data.refreshToken || '');
      localStorage.setItem('admin_usuario',        JSON.stringify(data.usuario));
      set({ token: data.token, refreshToken: data.refreshToken || null, usuario: data.usuario, loading: false, requiere2FA: false });
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return { ok: false, error: err.response?.data?.error || 'Error al iniciar sesión' };
    }
  },

  // ── Login paso 2: código TOTP ────────────────────────────────
  login2FA: async (totpCodigo) => {
    const { emailPendiente, _passwordTemp } = get();
    set({ loading: true });
    try {
      const { data } = await authApi.login({
        email:       emailPendiente,
        password:    _passwordTemp,
        totpCodigo,
        dispositivo: 'Panel Admin',
      });

      if (!['ADMIN', 'SECRETARIA', 'SUPERVISOR', 'GERENTE'].includes(data.usuario.rol)) {
        await invalidarTokenHuerfano(data.token);
        set({ loading: false });
        return { ok: false, error: 'No tienes acceso al panel de administrador' };
      }

      localStorage.setItem('admin_token',         data.token);
      localStorage.setItem('admin_refresh_token', data.refreshToken || '');
      localStorage.setItem('admin_usuario',        JSON.stringify(data.usuario));
      set({
        token:         data.token,
        refreshToken:  data.refreshToken || null,
        usuario:       data.usuario,
        loading:       false,
        requiere2FA:   false,
        emailPendiente: '',
        _passwordTemp: '',
      });
      return { ok: true };
    } catch (err) {
      set({ loading: false });
      return { ok: false, error: err.response?.data?.error || 'Código incorrecto' };
    }
  },

  guardarPasswordTemp: (password) => set({ _passwordTemp: password }),

  logout: async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_usuario');
    set({ token: null, refreshToken: null, usuario: null, requiere2FA: false });
    useVistaStore.getState().reset();
    queryClient.clear();
},

  updateUsuario: (cambios) => {
    set((state) => {
      const nuevoUsuario = { ...state.usuario, ...cambios };
      localStorage.setItem('admin_usuario', JSON.stringify(nuevoUsuario));
      return { usuario: nuevoUsuario };
    });
  },
}));