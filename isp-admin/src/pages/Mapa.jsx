import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Link } from 'react-router-dom';
import { Search, Plus, X, Trash2, Pencil, Crosshair, Radar, Navigation, Upload, SlidersHorizontal, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { contratosApi, puntosRedApi, sedesApi, tecnicosApi } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import { soloLectura } from '../utils/permisos';

const ESTADO_CFG = {
  ACTIVO:         { label: 'Activo',         color: '#3fb950' },
  EN_INSTALACION: { label: 'En instalación', color: '#e3b341' },
  CORTADO:        { label: 'Cortado',        color: '#ef4444' },
  BAJA:           { label: 'Baja',           color: '#5a7a9a' },
  SIN_ACTIVIDAD:  { label: 'Sin actividad',  color: '#768999' },
};
const PUNTO_CFG = {
  NAP: { label: 'Caja NAP', color: '#1E3A8A' },
  CTO: { label: 'CTO',      color: '#7c3aed' },
};
const ESTADO_PUNTO_CFG = {
  ACTIVA:        { label: 'Activa',        color: '#3fb950' },
  SATURADA:      { label: 'Saturada',      color: '#ef4444' },
  MANTENIMIENTO: { label: 'Mantenimiento', color: '#e3b341' },
};

const RADIO_COBERTURA = 150; // metros

// ─────────────────────────────────────────────────────────────
// BREAKPOINT móvil para los controles del mapa.
// Más angosto que esto → controles compactos (solo íconos) + paneles
// tipo "hoja" anclados abajo. Más ancho → diseño de escritorio.
const BREAKPOINT_MOVIL = 768;
// ─────────────────────────────────────────────────────────────

function useEsMovil() {
  const [esMovil, setEsMovil] = useState(
    typeof window !== 'undefined' && window.innerWidth < BREAKPOINT_MOVIL
  );
  useEffect(() => {
    const onResize = () => setEsMovil(window.innerWidth < BREAKPOINT_MOVIL);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return esMovil;
}

function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parsearUbicacion(texto) {
  if (!texto || !texto.trim()) return null;
  const t = texto.trim();
  const directo = t.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (directo) return { lat: parseFloat(directo[1]), lng: parseFloat(directo[2]) };
  const arroba = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (arroba) return { lat: parseFloat(arroba[1]), lng: parseFloat(arroba[2]) };
  const q = t.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  const d3d4 = t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (d3d4) return { lat: parseFloat(d3d4[1]), lng: parseFloat(d3d4[2]) };
  return null;
}

function iconoConsulta() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;background:#f59e0b;
      border:3px solid #fff;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

function iconoTecnico(activo, iniciales) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;
      background:${activo ? '#3fb950' : '#94a3b8'};
      border:3px solid #fff;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
      color:#fff;font-weight:800;font-size:11px;font-family:sans-serif;
      ${activo ? 'animation: pulse-tecnico 2s infinite;' : ''}
    ">${iniciales}</div>
    <style>
      @keyframes pulse-tecnico {
        0%   { box-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 0 0 0 rgba(63,185,80,0.5); }
        70%  { box-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 0 0 10px rgba(63,185,80,0); }
        100% { box-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 0 0 0 rgba(63,185,80,0); }
      }
    </style>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

function iconoPunto(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;
      background:${color};border:2.5px solid #fff;border-radius:3px;
      box-shadow:0 1px 5px rgba(0,0,0,0.45);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
}

function iconoCluster(cluster) {
  const count = cluster.getChildCount();
  let color = '#3fb950';
  if (count >= 10) color = '#e3b341';
  if (count >= 25) color = '#ef4444';
  const size = count >= 25 ? 44 : count >= 10 ? 38 : 32;
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};border:3px solid #fff;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:800;font-size:13px;
      box-shadow:0 2px 8px rgba(0,0,0,0.45);
    ">${count}</div>`,
    iconSize: [size, size],
  });
}

function AutoCentrar({ coords, activo }) {
  const map = useMap();
  React.useEffect(() => {
    if (!activo || coords.length === 0) return;
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [50, 50], maxZoom: 16 }
    );
  }, [coords, map, activo]);
  return null;
}

function CapturarClick({ activo, onPick }) {
  useMapEvents({
    click(e) { if (activo) onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Estilo base de las cajas flotantes
const cajaFlotante = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow: '0 4px 16px rgba(13,27,42,0.15)',
};

// ─────────────────────────────────────────────────────────────
// Panel responsivo: en escritorio es un popover anclado al botón;
// en móvil es una "hoja" que ocupa el ancho de la pantalla, anclada
// arriba o abajo según el origen.
// ─────────────────────────────────────────────────────────────
function PanelFlotante({ esMovil, anclaje, onCerrar, children }) {
  if (esMovil) {
    // anclaje: 'top' | 'bottom'  → de qué borde de pantalla cuelga
    const base = {
      ...cajaFlotante,
      position: 'fixed',
      left: 8,
      right: 8,
      width: 'auto',
      maxHeight: '60vh',
      overflowY: 'auto',
      zIndex: 701,            // por encima del backdrop
      padding: 14,
    };
    const pos = anclaje === 'bottom' ? { bottom: 64 } : { top: 64 };
    // IMPORTANTE: se renderiza con portal en document.body.
    // Si se renderizara dentro de los contenedores de control (que tienen
    // position:absolute + zIndex), quedaría atrapado en su contexto de
    // apilamiento y los botones de OTRO contenedor se le pondrían encima
    // aunque su zIndex fuera mayor. El portal lo saca a nivel global.
    return createPortal(
      <>
        {/* Backdrop invisible: tocar fuera del panel lo cierra */}
        <div
          onClick={onCerrar}
          style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'transparent' }}
        />
        <div style={{ ...base, ...pos }}>{children}</div>
      </>,
      document.body
    );
  }
  // Escritorio: el contenedor padre define top/left/right
  return children;
}

export default function MapaPage() {
  const qc = useQueryClient();
  const usuario = useAuthStore(s => s.usuario);
  const lectura = soloLectura(usuario);  // gerente: ve todo, no cambia nada
  const soloVer = usuario?.rol === 'SUPERVISOR' || lectura;
  const esMovil = useEsMovil();

  const [estadoFiltro,   setEstadoFiltro]   = useState('');
  const [servicioFiltro, setServicioFiltro] = useState('');
  const [search,         setSearch]         = useState('');
  const [verClientes,    setVerClientes]    = useState(true);
  const [verPuntos,      setVerPuntos]      = useState(true);
  const [verTecnicos,    setVerTecnicos]    = useState(true);

  const { data: dataTecnicos } = useQuery({
    queryKey: ['tecnicos-ubicaciones'],
    queryFn:  () => tecnicosApi.ubicaciones().then(r => r.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  const tecnicosUbicacion = (dataTecnicos || []).filter(t => t.ultimaLat && t.ultimaLng);

  const [modoAgregar, setModoAgregar] = useState(false);
  const [modalForm,   setModalForm]   = useState(null);
  const [centrar,     setCentrar]     = useState(true);

  const [consultaTexto,  setConsultaTexto]  = useState('');
  const [consultaPunto,  setConsultaPunto]  = useState(null);

  const [resultadoImport, setResultadoImport] = useState(null);

  // Estado de los paneles flotantes
  const [panelFiltros,   setPanelFiltros]   = useState(false);
  const [panelCobertura, setPanelCobertura] = useState(false);
  const [panelCapas,     setPanelCapas]     = useState(false);
  // En móvil, búsqueda desplegable (para no ocupar la barra entera)
  const [buscarAbierto,  setBuscarAbierto]  = useState(false);

  const cerrarPaneles = () => {
    setPanelFiltros(false);
    setPanelCobertura(false);
    setPanelCapas(false);
    setBuscarAbierto(false);
  };

  const { data: dataClientes, isLoading: loadClientes } = useQuery({
    queryKey: ['contratos-mapa', estadoFiltro, servicioFiltro],
    queryFn:  () => contratosApi.mapa({
      ...(estadoFiltro   ? { estado: estadoFiltro }     : {}),
      ...(servicioFiltro ? { servicio: servicioFiltro } : {}),
    }).then(r => r.data),
    staleTime: 60_000,
  });

  const { data: dataPuntos, isLoading: loadPuntos } = useQuery({
    queryKey: ['puntos-red-mapa'],
    queryFn:  () => puntosRedApi.listar().then(r => r.data),
    staleTime: 60_000,
  });

  const { data: sedes = [] } = useQuery({
    queryKey: ['sedes'],
    queryFn:  () => sedesApi.listar().then(r => r.data),
    enabled:  usuario?.rol !== 'ADMIN',
  });

  const guardarMut = useMutation({
    mutationFn: (form) => form.id
      ? puntosRedApi.actualizar(form.id, form)
      : puntosRedApi.crear(form),
    onSuccess: () => {
      qc.invalidateQueries(['puntos-red-mapa']);
      setModalForm(null);
      toast.success('Punto guardado');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al guardar'),
  });

  const eliminarMut = useMutation({
    mutationFn: (id) => puntosRedApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries(['puntos-red-mapa']);
      toast.success('Punto eliminado');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al eliminar'),
  });

  const importarMut = useMutation({
    mutationFn: (archivo) => {
      const fd = new FormData();
      fd.append('archivo', archivo);
      if (usuario?.rol !== 'ADMIN' && usuario?.sede?.id) {
        fd.append('sedeId', usuario.sede.id);
      }
      return puntosRedApi.importar(fd).then(r => r.data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries(['puntos-red-mapa']);
      setResultadoImport(data);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al importar el archivo'),
  });

  const clientes = useMemo(() => {
    const lista = dataClientes?.puntos || [];
    if (!search.trim()) return lista;
    const q = search.trim().toLowerCase();
    return lista.filter(p =>
      p.abonado?.toLowerCase().includes(q) ||
      p.numero?.toLowerCase().includes(q) ||
      p.direccion?.toLowerCase().includes(q)
    );
  }, [dataClientes, search]);

  const puntos = dataPuntos?.puntos || [];

  const coordsCentrado = useMemo(() => {
    const c = [];
    if (verClientes) clientes.forEach(p => c.push([p.latitud, p.longitud]));
    if (verPuntos)   puntos.forEach(p => c.push([p.latitud, p.longitud]));
    return c;
  }, [clientes, puntos, verClientes, verPuntos]);

  const centroDefault = [-8.0859, -78.9610];
  const isLoading = loadClientes || loadPuntos;

  const handlePickEnMapa = (lat, lng) => {
    setModoAgregar(false);
    setCentrar(false);
    abrirFormNuevo(lat, lng);
  };

  const abrirFormNuevo = (lat = '', lng = '') => {
    setModalForm({
      id: null, tipo: 'NAP', codigo: '',
      latitud: lat, longitud: lng,
      capacidad: '', ocupados: '', estado: 'ACTIVA',
      sedeId: usuario?.sede?.id || '', direccion: '', notas: '',
    });
  };

  const abrirFormEditar = (pt) => {
    setCentrar(false);
    setModalForm({
      id: pt.id, tipo: pt.tipo, codigo: pt.codigo,
      latitud: pt.latitud, longitud: pt.longitud,
      capacidad: pt.capacidad ?? '', ocupados: pt.ocupados ?? '',
      estado: pt.estado, sedeId: pt.sede?.id || '',
      direccion: pt.direccion || '', notas: pt.notas || '',
    });
  };

  const buscarCobertura = () => {
    const ubic = parsearUbicacion(consultaTexto);
    if (!ubic) {
      toast.error('No se pudo leer la ubicación. Pegá "lat, lng" o un link de Google Maps.');
      return;
    }
    setConsultaPunto(ubic);
    setCentrar(false);
  };

  const cobertura = useMemo(() => {
    if (!consultaPunto) return null;
    const conDist = puntos.map(pt => ({
      ...pt,
      distancia: distanciaMetros(consultaPunto.lat, consultaPunto.lng, pt.latitud, pt.longitud),
    })).sort((a, b) => a.distancia - b.distancia);

    const masCercana = conDist[0] || null;
    const dentroRadio = conDist.filter(p => p.distancia <= RADIO_COBERTURA);

    let veredicto;
    if (!masCercana) {
      veredicto = { nivel: 'sin', color: '#ef4444', texto: 'No hay puntos de red cargados' };
    } else if (masCercana.distancia > RADIO_COBERTURA) {
      veredicto = { nivel: 'sin', color: '#ef4444',
        texto: `Sin cobertura — la NAP más cercana está a ${Math.round(masCercana.distancia)}m` };
    } else {
      const conPuertos = dentroRadio.find(p =>
        p.capacidad == null || (p.capacidad - p.ocupados) > 0
      );
      if (conPuertos) {
        veredicto = { nivel: 'ok', color: '#3fb950',
          texto: `Hay cobertura — ${conPuertos.codigo} a ${Math.round(conPuertos.distancia)}m` };
      } else {
        veredicto = { nivel: 'limitada', color: '#e3b341',
          texto: 'Cobertura limitada — hay NAP cerca pero sin puertos libres' };
      }
    }
    return { lista: conDist.slice(0, 5), masCercana, dentroRadio, veredicto };
  }, [consultaPunto, puntos]);

  // Estilo de botón de control: en móvil, cuadrado de solo ícono
  const btnControl = (activo, colorActivo) => ({
    ...cajaFlotante,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700,
    padding: esMovil ? 10 : '9px 12px',
    width: esMovil ? 40 : 'auto', height: esMovil ? 40 : 'auto',
    color: activo ? (colorActivo || 'var(--accent)') : 'var(--txt-2)',
  });

  return (
    // En móvil: pantalla completa sin margen ni bordes redondeados.
    // En escritorio: margen 16px y esquinas redondeadas, como antes.
    <div style={{
      position: 'relative',
      height: esMovil ? 'calc(100vh - 56px)' : 'calc(100vh - 56px - 32px)',
      margin: esMovil ? 0 : 16,
      borderRadius: esMovil ? 0 : 12,
      overflow: 'hidden',
    }}>

      {/* ════════ MAPA a pantalla completa ════════ */}
      <div style={{ position: 'absolute', inset: 0, cursor: modoAgregar ? 'crosshair' : 'grab' }}>
        <MapContainer center={centroDefault} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          <AutoCentrar coords={coordsCentrado} activo={centrar}/>
          <CapturarClick activo={modoAgregar} onPick={handlePickEnMapa}/>

          {consultaPunto && (
            <>
              <Circle
                center={[consultaPunto.lat, consultaPunto.lng]}
                radius={RADIO_COBERTURA}
                pathOptions={{ color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.1 }}
              />
              <Marker position={[consultaPunto.lat, consultaPunto.lng]} icon={iconoConsulta()}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Ubicación consultada</div>
                    {cobertura?.veredicto && (
                      <div style={{ fontSize: 11, color: cobertura.veredicto.color, fontWeight: 600 }}>
                        {cobertura.veredicto.texto}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {verClientes && (
            <MarkerClusterGroup
              iconCreateFunction={iconoCluster}
              showCoverageOnHover={false}
              maxClusterRadius={50}
              spiderfyOnMaxZoom={true}
            >
              {clientes.map(p => {
                const cfg = ESTADO_CFG[p.estado] || ESTADO_CFG.SIN_ACTIVIDAD;
                return (
                  <CircleMarker key={`c-${p.numero}`} center={[p.latitud, p.longitud]} radius={8}
                    pathOptions={{ color: '#fff', weight: 2, fillColor: cfg.color, fillOpacity: 0.9 }}>
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.abonado}</div>
                        <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Contrato: <strong>{p.numero}</strong></div>
                        <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{p.direccion}</div>
                        {p.sector && <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Sector: {p.sector}</div>}
                        {p.servicio && <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Servicio: <strong>{p.servicio}</strong></div>}
                        <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: cfg.color + '22', color: cfg.color, marginBottom: 8 }}>
                          {cfg.label}
                        </div>
                        {(!soloVer || lectura) && <div><Link to={`/clientes/${p.numero}?sede=${p.sede?.id || ''}`} style={{ fontSize: 11, color: '#3b9fd4', fontWeight: 700 }}>Ver detalle →</Link></div>}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MarkerClusterGroup>
          )}

          {verPuntos && puntos.map(pt => {
            const tipoCfg   = PUNTO_CFG[pt.tipo] || { label: pt.tipo, color: '#666' };
            const estadoCfg = ESTADO_PUNTO_CFG[pt.estado] || { label: pt.estado, color: '#666' };
            return (
              <Marker key={`p-${pt.id}`} position={[pt.latitud, pt.longitud]} icon={iconoPunto(tipoCfg.color)}>
                <Popup>
                  <div style={{ minWidth: 190 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: tipoCfg.color, display: 'inline-block' }}/>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{pt.codigo}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Tipo: <strong>{tipoCfg.label}</strong></div>
                    {pt.capacidad != null && (
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Puertos: <strong>{pt.ocupados}/{pt.capacidad}</strong></div>
                    )}
                    {pt.direccion && <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{pt.direccion}</div>}
                    {pt.notas && <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontStyle: 'italic' }}>{pt.notas}</div>}
                    <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: estadoCfg.color + '22', color: estadoCfg.color, marginBottom: 8 }}>
                      {estadoCfg.label}
                    </div>
                    {!soloVer && <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => abrirFormEditar(pt)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid #1E3A8A', background: 'transparent', color: '#1E3A8A', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        <Pencil size={11}/> Editar
                      </button>
                      <button onClick={() => { if (confirm(`¿Eliminar el punto ${pt.codigo}?`)) eliminarMut.mutate(pt.id); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        <Trash2 size={11}/> Eliminar
                      </button>
                    </div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {verTecnicos && tecnicosUbicacion.map(t => {
              const minutosDesdeUltima = (Date.now() - new Date(t.ultimaUbicacionAt).getTime()) / 60000;
              const activo = minutosDesdeUltima < 5;
              const iniciales = `${t.usuario.nombre?.[0] || ''}${t.usuario.apellido?.[0] || ''}`.toUpperCase();

              return (
                <Marker key={`t-${t.id}`} position={[t.ultimaLat, t.ultimaLng]} icon={iconoTecnico(activo, iniciales)}>
                  <Popup>
                  <div style={{ minWidth: 170 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                      👷 {t.usuario.nombre} {t.usuario.apellido}
                    </div>
                    <div style={{ fontSize: 11, color: activo ? '#3fb950' : '#94a3b8', fontWeight: 600, marginBottom: 4 }}>
                      {activo ? '● En línea' : '○ Sin señal reciente'}
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>
                      Últ. actualización: {Math.round(minutosDesdeUltima)} min
                    </div>
                    {t.usuario.telefono && (
                      <div style={{ marginTop: 6 }}>
                        <a href={`tel:${t.usuario.telefono}`} style={{ fontSize: 11, color: '#3b9fd4', fontWeight: 700 }}>
                          📞 Llamar
                        </a>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* ════════ CONTROLES FLOTANTES ════════ */}

      {/* ── Arriba-izquierda: buscar + filtros ── */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 500, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {/* Buscar: caja con input en escritorio; botón que despliega en móvil */}
        {esMovil ? (
          <button
            onClick={() => { setBuscarAbierto(v => !v); setPanelFiltros(false); setPanelCobertura(false); setPanelCapas(false); }}
            style={btnControl(buscarAbierto || !!search.trim())}>
            <Search size={16}/>
          </button>
        ) : (
          <div style={{ ...cajaFlotante, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
            <Search size={14} color="var(--txt-3)"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
              style={{ border: 'none', background: 'transparent', padding: '9px 8px', fontSize: 12, color: 'var(--txt)', outline: 'none', width: 170 }}/>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <button onClick={() => { setPanelFiltros(v => !v); setPanelCobertura(false); setPanelCapas(false); setBuscarAbierto(false); }}
            style={esMovil
              ? btnControl(panelFiltros || estadoFiltro || servicioFiltro)
              : { ...cajaFlotante, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: (estadoFiltro || servicioFiltro) ? 'var(--accent)' : 'var(--txt-2)' }}>
            <SlidersHorizontal size={esMovil ? 16 : 14}/>
            {!esMovil && 'Filtros'}
            {(estadoFiltro || servicioFiltro) && (
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                ...(esMovil ? { position: 'absolute', top: 6, right: 6 } : {}),
              }}/>
            )}
          </button>
          {panelFiltros && (
            <PanelFlotante esMovil={esMovil} anclaje="top" onCerrar={() => setPanelFiltros(false)}>
              <div style={!esMovil ? { ...cajaFlotante, position: 'absolute', top: 44, left: 0, width: 230, padding: 14 } : undefined}>
                {esMovil && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt)' }}>Filtros</span>
                    <button onClick={() => setPanelFiltros(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}>
                      <X size={18}/>
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Servicio</div>
                <select value={servicioFiltro} onChange={e => setServicioFiltro(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12, marginBottom: 12 }}>
                  <option value="">Todos los servicios</option>
                  <option value="internet">Solo Internet</option>
                  <option value="cable">Solo Cable</option>
                  <option value="duo">Solo Dúo</option>
                </select>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Estado</div>
                <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12 }}>
                  <option value="">Todos los estados</option>
                  {Object.entries(ESTADO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {(estadoFiltro || servicioFiltro) && (
                  <button onClick={() => { setEstadoFiltro(''); setServicioFiltro(''); }}
                    style={{ marginTop: 12, width: '100%', padding: '7px 0', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--txt-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            </PanelFlotante>
          )}
        </div>

        {/* Hoja de búsqueda en móvil */}
        {esMovil && buscarAbierto && (
          <PanelFlotante esMovil={esMovil} anclaje="top" onCerrar={() => setBuscarAbierto(false)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={16} color="var(--txt-3)"/>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
                style={{ flex: 1, border: '1px solid var(--border-2)', background: 'var(--bg-3)', padding: '9px 10px', borderRadius: 8, fontSize: 13, color: 'var(--txt)', outline: 'none' }}/>
              <button onClick={() => setBuscarAbierto(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}>
                <X size={18}/>
              </button>
            </div>
          </PanelFlotante>
        )}
      </div>

      {/* ── Arriba-derecha: importar + agregar ── */}
      {!soloVer && <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 500, display: 'flex', gap: 8 }}>
        <label style={esMovil
          ? { ...btnControl(false), opacity: importarMut.isPending ? 0.6 : 1, position: 'relative' }
          : { ...cajaFlotante, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--txt-2)', opacity: importarMut.isPending ? 0.6 : 1 }}>
          <Upload size={esMovil ? 16 : 14}/>
          {!esMovil && (importarMut.isPending ? 'Importando...' : 'Importar KML')}
          <input type="file" accept=".kml" style={{ display: 'none' }} disabled={importarMut.isPending}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) importarMut.mutate(f);
              e.target.value = '';
            }}/>
        </label>
        <button onClick={() => setModoAgregar(m => !m)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 10, cursor: 'pointer', border: 'none', fontSize: 12, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(13,27,42,0.15)',
            background: modoAgregar ? '#ef4444' : '#1E3A8A', color: '#fff',
            padding: esMovil ? 0 : '9px 14px',
            width: esMovil ? 40 : 'auto', height: esMovil ? 40 : 'auto',
          }}>
          {modoAgregar
            ? <><X size={esMovil ? 18 : 14}/>{!esMovil && ' Cancelar'}</>
            : <><Plus size={esMovil ? 18 : 14}/>{!esMovil && ' Agregar punto'}</>}
        </button>
      </div>}

      {/* ── Derecha: botón Cobertura + panel ── */}
      <div style={{ position: 'absolute', top: 60, right: 12, zIndex: 500 }}>
        <button onClick={() => { setPanelCobertura(v => !v); setPanelFiltros(false); setPanelCapas(false); setBuscarAbierto(false); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            borderRadius: 10, cursor: 'pointer', border: 'none', fontSize: 12, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(13,27,42,0.15)',
            background: panelCobertura || consultaPunto ? '#f59e0b' : 'var(--bg-card)',
            color: panelCobertura || consultaPunto ? '#fff' : 'var(--txt-2)',
            padding: esMovil ? 0 : '9px 14px',
            width: esMovil ? 40 : 'auto', height: esMovil ? 40 : 'auto',
          }}>
          <Radar size={esMovil ? 16 : 14}/>{!esMovil && ' Cobertura'}
        </button>

        {panelCobertura && (
          <PanelFlotante esMovil={esMovil} anclaje="top" onCerrar={() => setPanelCobertura(false)}>
            <div style={!esMovil ? { ...cajaFlotante, position: 'absolute', top: 44, right: 0, width: 300, padding: 14 } : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Radar size={14} color="#f59e0b"/>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>Consultar cobertura</span>
                <span style={{ fontSize: 10, color: 'var(--txt-3)', marginLeft: 'auto' }}>radio {RADIO_COBERTURA}m</span>
                {esMovil && (
                  <button onClick={() => setPanelCobertura(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <X size={18}/>
                  </button>
                )}
              </div>
              <input
                value={consultaTexto}
                onChange={e => setConsultaTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarCobertura()}
                placeholder='"lat, lng" o link de Maps'
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--txt)', fontSize: 12, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={buscarCobertura}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  <Navigation size={13}/> Buscar
                </button>
                {consultaPunto && (
                  <button onClick={() => { setConsultaPunto(null); setConsultaTexto(''); }}
                    style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--txt-3)', fontSize: 12, fontWeight: 600 }}>
                    Limpiar
                  </button>
                )}
              </div>

              {cobertura && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: cobertura.veredicto.color + '18', border: `1px solid ${cobertura.veredicto.color}40`, marginBottom: cobertura.dentroRadio.length > 0 ? 10 : 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: cobertura.veredicto.color, flexShrink: 0 }}/>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cobertura.veredicto.color }}>
                      {cobertura.veredicto.texto}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cobertura.lista.map(pt => {
                      const dentro = pt.distancia <= RADIO_COBERTURA;
                      const libres = pt.capacidad != null ? pt.capacidad - pt.ocupados : null;
                      return (
                        <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: dentro ? 'rgba(63,185,80,0.08)' : 'var(--bg-3)', fontSize: 11 }}>
                          <span style={{ fontWeight: 700, color: 'var(--txt)', minWidth: 70 }}>{pt.codigo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: dentro ? '#3fb950' : 'var(--txt-3)' }}>
                            {Math.round(pt.distancia)}m
                          </span>
                          {libres != null && (
                            <span style={{ color: libres > 0 ? 'var(--txt-2)' : '#ef4444', marginLeft: 'auto', fontSize: 10 }}>
                              {libres > 0 ? `${libres} libre(s)` : 'Sin puertos'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </PanelFlotante>
        )}
      </div>

      {/* ── Abajo-izquierda: capas + leyenda ── */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 500 }}>
        <button onClick={() => { setPanelCapas(v => !v); setPanelFiltros(false); setPanelCobertura(false); setBuscarAbierto(false); }}
          style={esMovil
            ? btnControl(panelCapas)
            : { ...cajaFlotante, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--txt-2)' }}>
          <Layers size={esMovil ? 16 : 14}/>{!esMovil && ' Capas'}
        </button>

        {panelCapas && (
          <PanelFlotante esMovil={esMovil} anclaje="bottom" onCerrar={() => setPanelCapas(false)}>
            <div style={!esMovil ? { ...cajaFlotante, position: 'absolute', bottom: 44, left: 0, width: 200, padding: 14 } : undefined}>
              {esMovil && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt)' }}>Capas</span>
                  <button onClick={() => setPanelCapas(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}>
                    <X size={18}/>
                  </button>
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt-2)', cursor: 'pointer', marginBottom: 8 }}>
                <input type="checkbox" checked={verClientes} onChange={e => setVerClientes(e.target.checked)}/> Clientes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt-2)', cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={verPuntos} onChange={e => setVerPuntos(e.target.checked)}/> Puntos de red
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--txt-2)', cursor: 'pointer', marginBottom: 10 }}>
                <input type="checkbox" checked={verTecnicos} onChange={e => setVerTecnicos(e.target.checked)}/> Técnicos
              </label>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {verClientes && Object.entries(ESTADO_CFG).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--txt-3)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.color, border: '2px solid #fff' }}/> {v.label}
                  </div>
                ))}
                {verPuntos && Object.entries(PUNTO_CFG).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--txt-3)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: v.color, border: '2px solid #fff' }}/> {v.label}
                  </div>
                ))}

                {verTecnicos && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--txt-3)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3fb950', border: '2px solid #fff' }}/> Técnico en línea
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--txt-3)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', border: '2px solid #fff' }}/> Sin señal reciente
                    </div>
                  </>
                )}
              </div>
            </div>
          </PanelFlotante>
        )}
      </div>

      {/* ── Abajo-derecha: contador ── */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 500, ...cajaFlotante, padding: '7px 12px', fontSize: 11, color: 'var(--txt-3)' }}>
        {isLoading ? 'Cargando...' : `${clientes.length} cli. · ${puntos.length} pto. · ${tecnicosUbicacion.length} téc.`}
      </div>

      {/* ── Banner modo agregar (centrado abajo) ── */}
      {modoAgregar && (
        <div style={{
          position: 'absolute', bottom: esMovil ? 64 : 56, left: esMovil ? 8 : '50%',
          right: esMovil ? 8 : 'auto',
          transform: esMovil ? 'none' : 'translateX(-50%)',
          zIndex: 500, ...cajaFlotante,
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          fontSize: 12, color: '#1E3A8A', maxWidth: esMovil ? 'none' : 480,
        }}>
          <Crosshair size={15} style={{ flexShrink: 0 }}/>
          <span style={{ flex: 1 }}><strong>Tocá el mapa</strong> donde quieras el punto.</span>
          <button onClick={() => { setModoAgregar(false); abrirFormNuevo(); }}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #1E3A8A', background: 'transparent', color: '#1E3A8A', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            A mano
          </button>
        </div>
      )}

      {/* Resultado de importación */}
      {resultadoImport && (
        <div onClick={() => setResultadoImport(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-2)', borderRadius: 14, border: '1px solid var(--border-2)',
            width: 380, maxWidth: '100%', padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Upload size={18} color="#3fb950"/>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--txt)' }}>
                Importación completada
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--txt-2)' }}>
              <FilaResultado label="Puntos importados" valor={resultadoImport.importados} color="#3fb950"/>
              <FilaResultado label="· de tipo NAP" valor={resultadoImport.naps}/>
              <FilaResultado label="· de tipo CTO" valor={resultadoImport.ctos}/>
              {resultadoImport.salteados > 0 && (
                <FilaResultado label="Salteados (ya existían)" valor={resultadoImport.salteados} color="#e3b341"/>
              )}
              {resultadoImport.noReconocidos > 0 && (
                <FilaResultado label="No reconocidos" valor={resultadoImport.noReconocidos} color="#768999"/>
              )}
            </div>
            <button onClick={() => setResultadoImport(null)}
              style={{ marginTop: 20, width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: '#1E3A8A', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal formulario */}
      {modalForm && (
        <FormPunto
          form={modalForm}
          setForm={setModalForm}
          sedes={sedes}
          esAdmin={usuario?.rol === 'ADMIN'}
          esMovil={esMovil}
          onGuardar={() => {
            if (!modalForm.codigo.trim())   return toast.error('El código es obligatorio');
            if (modalForm.latitud === '' || modalForm.longitud === '')
              return toast.error('Faltan las coordenadas');
            if (!modalForm.sedeId)          return toast.error('Elegí una sede');
            guardarMut.mutate(modalForm);
          }}
          onCerrar={() => setModalForm(null)}
          guardando={guardarMut.isPending}
        />
      )}
    </div>
  );
}

// ── Al final de Mapa.jsx, después del cierre de MapaPage ──

function FormPunto({ form, setForm, sedes, esAdmin, esMovil, onGuardar, onCerrar, guardando }) {
  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));
  const inputStyle = {
    width: '100%', padding: '8px 11px', background: 'var(--bg-3)',
    border: '1px solid var(--border-2)', borderRadius: 8,
    color: 'var(--txt)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--txt-3)',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div onClick={onCerrar} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      // En móvil el modal se ancla abajo (tipo hoja); en escritorio, centrado.
      alignItems: esMovil ? 'flex-end' : 'center',
      justifyContent: 'center', zIndex: 1000,
      padding: esMovil ? 0 : 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-2)',
        borderRadius: esMovil ? '16px 16px 0 0' : 14,
        border: '1px solid var(--border-2)',
        width: esMovil ? '100%' : 460,
        maxWidth: '100%',
        maxHeight: esMovil ? '92vh' : '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-2)', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--txt)' }}>
            {form.id ? 'Editar punto de red' : 'Nuevo punto de red'}
          </h3>
          <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--txt-3)' }}>
            <X size={18}/>
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['NAP', 'CTO'].map(t => (
                <button key={t} onClick={() => set('tipo', t)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  border: `1px solid ${form.tipo === t ? '#1E3A8A' : 'var(--border-2)'}`,
                  background: form.tipo === t ? 'rgba(30,58,138,0.1)' : 'transparent',
                  color: form.tipo === t ? '#1E3A8A' : 'var(--txt-3)',
                }}>
                  {t === 'NAP' ? 'Caja NAP' : 'CTO'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Código *</label>
            <input value={form.codigo} onChange={e => set('codigo', e.target.value)}
              placeholder="NAP-LAR-011" style={{ ...inputStyle, textTransform: 'uppercase' }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Latitud *</label>
              <input value={form.latitud} onChange={e => set('latitud', e.target.value)}
                placeholder="-8.0834" style={{ ...inputStyle, fontFamily: 'monospace' }}/>
            </div>
            <div>
              <label style={labelStyle}>Longitud *</label>
              <input value={form.longitud} onChange={e => set('longitud', e.target.value)}
                placeholder="-78.9557" style={{ ...inputStyle, fontFamily: 'monospace' }}/>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Puertos totales</label>
              <input type="number" value={form.capacidad} onChange={e => set('capacidad', e.target.value)}
                placeholder="8" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Puertos usados</label>
              <input type="number" value={form.ocupados} onChange={e => set('ocupados', e.target.value)}
                placeholder="0" style={inputStyle}/>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Estado</label>
            <select value={form.estado} onChange={e => set('estado', e.target.value)} style={inputStyle}>
              <option value="ACTIVA">Activa</option>
              <option value="SATURADA">Saturada</option>
              <option value="MANTENIMIENTO">Mantenimiento</option>
            </select>
          </div>

          {!esAdmin && (
            <div>
              <label style={labelStyle}>Sede *</label>
              <select value={form.sedeId} onChange={e => set('sedeId', e.target.value)} style={inputStyle}>
                <option value="">Elegir sede...</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre} — {s.ciudad}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Dirección / referencia</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
              placeholder="Esquina Jr. Lima con Av. Grau" style={inputStyle}/>
          </div>

          <div>
            <label style={labelStyle}>Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
              rows={2} placeholder="Observaciones..."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}/>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 20px', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--bg-2)' }}>
          <button onClick={onCerrar} disabled={guardando}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--txt-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onGuardar} disabled={guardando}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1E3A8A', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
            {guardando ? 'Guardando...' : (form.id ? 'Guardar cambios' : 'Crear punto')}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilaResultado({ label, valor, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: color || 'var(--txt)' }}>
        {valor}
      </span>
    </div>
  );
}