import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Lock, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, usuariosApi } from '../services/api';
import { ETIQUETA_ROL } from '../utils/permisos';
import { Card, Btn, Input, Spinner } from '../components/ui';
import { useAuthStore } from '../store/auth.store';

export default function PerfilPage() {
  const qc      = useQueryClient();
  const usuario = useAuthStore(s => s.usuario);
  const updateUsuario = useAuthStore(s => s.updateUsuario);

  const [form, setForm] = useState({
    nombre:   usuario?.nombre   || '',
    apellido: usuario?.apellido || '',
    telefono: usuario?.telefono || '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const setP = (k, v) => setPassForm(p => ({ ...p, [k]: v }));
  const [passError, setPassError] = useState('');

  // ── 2FA ──────────────────────────────────────────────────────
  const [paso2FA,  setPaso2FA]  = useState('info'); // info | qr | desactivar
  const [qrData,   setQrData]   = useState(null);
  const [manual,   setManual]   = useState('');
  const [totp,     setTotp]     = useState('');
  const [totp2FAError, setTotp2FAError] = useState('');
  const [totp2FAOk,    setTotp2FAOk]    = useState('');
  const activo2FA = usuario?.totpActivo;

  const updateMut = useMutation({
    mutationFn: () => usuariosApi.actualizarPerfil({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono }),
    onSuccess: () => {
      toast.success('Perfil actualizado');
      updateUsuario({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono });
    },
    onError: e => toast.error(e.response?.data?.error || 'Error al actualizar'),
  });

  const passMut = useMutation({
    mutationFn: () => authApi.cambiarPassword({ passwordActual: passForm.actual, passwordNueva: passForm.nueva }),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setPassForm({ actual: '', nueva: '', confirmar: '' });
      setPassError('');
    },
    onError: e => toast.error(e.response?.data?.error || 'Contraseña actual incorrecta'),
  });

  const handleGuardarPerfil = () => {
    if (!form.nombre || !form.apellido) { toast.error('Nombre y apellido son requeridos'); return; }
    updateMut.mutate();
  };

  const handleCambiarPass = () => {
    if (!passForm.actual)                      { setPassError('Ingresa tu contraseña actual'); return; }
    if (passForm.nueva.length < 8)             { setPassError('Mínimo 8 caracteres'); return; }
    if (!/[A-Z]/.test(passForm.nueva))         { setPassError('Debe contener al menos una mayúscula'); return; }
    if (!/[0-9]/.test(passForm.nueva))         { setPassError('Debe contener al menos un número'); return; }
    if (passForm.nueva !== passForm.confirmar) { setPassError('Las contraseñas no coinciden'); return; }
    setPassError('');
    passMut.mutate();
  };

  // ── Handlers 2FA ─────────────────────────────────────────────
  const handleGenerar2FA = async () => {
    setTotp2FAError(''); setTotp2FAOk('');
    try {
      const { data } = await authApi.generar2fa();
      setQrData(data.qr);
      setManual(data.manual);
      setPaso2FA('qr');
    } catch (e) { setTotp2FAError(e.response?.data?.error || 'Error al generar QR'); }
  };

  const handleActivar2FA = async () => {
    if (totp.length !== 6) { setTotp2FAError('Ingresa el código de 6 dígitos'); return; }
    setTotp2FAError('');
    try {
      await authApi.activar2fa(totp);
      setTotp2FAOk('✅ 2FA activado correctamente');
      updateUsuario({ totpActivo: true });
      setTotp(''); setPaso2FA('info');
    } catch (e) { setTotp2FAError(e.response?.data?.error || 'Código incorrecto'); }
  };

  const handleDesactivar2FA = async () => {
    if (totp.length !== 6) { setTotp2FAError('Ingresa el código de 6 dígitos'); return; }
    setTotp2FAError('');
    try {
      await authApi.desactivar2fa(totp);
      setTotp2FAOk('2FA desactivado');
      updateUsuario({ totpActivo: false });
      setTotp(''); setPaso2FA('info');
    } catch (e) { setTotp2FAError(e.response?.data?.error || 'Código incorrecto'); }
  };

  const inputStyle2FA = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-3)',
    fontSize: 13, color: 'var(--txt)', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: 28, maxWidth: 640, margin: '0 auto' }} className="animate-fade">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Mi Perfil</h1>
        <p style={{ color: 'var(--txt-3)', fontSize: 12, marginTop: 4 }}>Gestiona tu información personal y seguridad</p>
      </div>

      {/* Avatar + info */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #1E3A8A, #3B9FD4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--txt)' }}>
              {usuario?.nombre} {usuario?.apellido}
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 3 }}>{usuario?.email}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(30,58,138,0.1)', color: '#1E3A8A', border: '1px solid rgba(30,58,138,0.2)' }}>
                {ETIQUETA_ROL[usuario?.rol] && usuario?.rol === 'GERENTE' ? ETIQUETA_ROL.GERENTE : usuario?.rol}
              </span>
              {activo2FA && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(22,163,74,0.1)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.2)' }}>
                  🔐 2FA activo
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Datos personales */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(30,58,138,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={15} color="#1E3A8A"/>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>Datos personales</div>
            <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>Actualiza tu información de contacto</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <Input label="Nombre *"   value={form.nombre}   onChange={e => set('nombre', e.target.value)}   placeholder="Juan" />
          <Input label="Apellido *" value={form.apellido} onChange={e => set('apellido', e.target.value)} placeholder="Pérez" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="9XXXXXXXX" />
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8, fontSize: 12, color: 'var(--txt-3)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={13} color="var(--txt-3)"/>
          {usuario?.email} — el email no es editable
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="primary" icon={<Save size={13}/>} onClick={handleGuardarPerfil} loading={updateMut.isPending}>
            Guardar cambios
          </Btn>
        </div>
      </Card>

      {/* Cambiar contraseña */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(30,58,138,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={15} color="#1E3A8A"/>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>Cambiar contraseña</div>
            <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>Mínimo 8 caracteres, una mayúscula y un número</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          <Input label="Contraseña actual" type="password" value={passForm.actual}    onChange={e => setP('actual', e.target.value)}    placeholder="••••••••" />
          <Input label="Nueva contraseña"  type="password" value={passForm.nueva}     onChange={e => setP('nueva', e.target.value)}     placeholder="Mín. 8 chars, mayúscula y número" />
          <Input label="Confirmar"         type="password" value={passForm.confirmar} onChange={e => setP('confirmar', e.target.value)} placeholder="Repite la nueva contraseña" />
        </div>
        {passError && (
          <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 8, borderLeft: '3px solid var(--red)', marginBottom: 14 }}>
            {passError}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn variant="primary" icon={<Lock size={13}/>} onClick={handleCambiarPass} loading={passMut.isPending}>
            Cambiar contraseña
          </Btn>
        </div>
      </Card>

      {/* Autenticación 2FA */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: activo2FA ? 'rgba(22,163,74,0.1)' : 'rgba(30,58,138,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={15} color={activo2FA ? '#16A34A' : '#1E3A8A'}/>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>Autenticación en dos pasos (2FA)</div>
            <div style={{ fontSize: 11, color: 'var(--txt-3)' }}>
              {activo2FA ? '✅ Activado — tu cuenta está protegida' : 'Agrega una capa extra de seguridad con Google Authenticator'}
            </div>
          </div>
        </div>

        {totp2FAOk && <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, color: '#16A34A', fontSize: 13, marginBottom: 14 }}>{totp2FAOk}</div>}
        {totp2FAError && <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 14 }}>{totp2FAError}</div>}

        {/* Info */}
        {paso2FA === 'info' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!activo2FA && (
              <Btn variant="primary" icon={<Shield size={13}/>} onClick={handleGenerar2FA}>
                Activar 2FA
              </Btn>
            )}
            {activo2FA && (
              <Btn variant="danger" onClick={() => { setPaso2FA('desactivar'); setTotp(''); setTotp2FAError(''); }}>
                Desactivar 2FA
              </Btn>
            )}
          </div>
        )}

        {/* QR */}
        {paso2FA === 'qr' && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--txt-2)', marginBottom: 14 }}>
              1. Abre Google Authenticator<br/>
              2. Toca "+" → "Escanear código QR"<br/>
              3. Ingresa el código de 6 dígitos para confirmar
            </p>
            {qrData && <img src={qrData} alt="QR 2FA" style={{ width: 180, height: 180, display: 'block', margin: '0 auto 14px', borderRadius: 8 }} />}
            {manual && (
              <div style={{ padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 8, fontFamily: 'monospace', fontSize: 12, color: '#1E3A8A', marginBottom: 14, wordBreak: 'break-all', textAlign: 'center' }}>
                {manual}
              </div>
            )}
            <input type="text" inputMode="numeric" maxLength={6} value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
              placeholder="Código de 6 dígitos"
              style={{ ...inputStyle2FA, textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 8, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" onClick={handleActivar2FA} disabled={totp.length !== 6}>
                Confirmar y activar
              </Btn>
              <Btn variant="ghost" onClick={() => { setPaso2FA('info'); setTotp(''); setTotp2FAError(''); }}>
                Cancelar
              </Btn>
            </div>
          </div>
        )}

        {/* Desactivar */}
        {paso2FA === 'desactivar' && (
          <div>
            <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 14 }}>
              ⚠ Para desactivar el 2FA debes confirmar con un código válido de tu app autenticadora.
            </p>
            <input type="text" inputMode="numeric" maxLength={6} value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
              placeholder="Código de 6 dígitos"
              style={{ ...inputStyle2FA, textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: 8, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="danger" onClick={handleDesactivar2FA} disabled={totp.length !== 6}>
                Desactivar 2FA
              </Btn>
              <Btn variant="ghost" onClick={() => { setPaso2FA('info'); setTotp(''); setTotp2FAError(''); }}>
                Cancelar
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

