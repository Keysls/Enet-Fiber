import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronLeft, ChevronRight, Package, Pencil, Plus, Search, Tags, Trash2, Warehouse } from 'lucide-react';
import { productosApi } from '../../services/api';
import { Btn, Badge, Input, Modal, Select, Table, Tr, Td } from '../../components/ui';

// ─── CSS responsivo ───────────────────────────────────────────────────────────
const CSS = `
  .cat-cards      { display: none; }
  .cat-table-wrap { display: block; }
  .cat-header     { flex-direction: row; align-items: center; }
  .cat-filtros    { grid-template-columns: minmax(260px, 1fr) 200px; }

  @media (max-width: 1080px) {
    .cat-cards      { display: flex; flex-direction: column; gap: 10px; }
    .cat-table-wrap { display: none; }
    .cat-header     { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
    .cat-header > *:last-child { width: 100%; }
    .cat-header > *:last-child button { width: 100%; justify-content: center; }
    .cat-filtros    { grid-template-columns: 1fr !important; }
  }

  .cat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cat-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }
  .cat-card-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--txt-3);
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('cat-responsive-css')) {
  const s = document.createElement('style');
  s.id = 'cat-responsive-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const inputStyle = { width: '100%', height: 36, padding: '0 12px', background: 'var(--bg-3)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--txt)', fontSize: 13, outline: 'none' };

// ─── Debounce hook ────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Header({ title, subtitle, icon: Icon = Warehouse, right }) {
  return (
    <div className="cat-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-bg)', border: '1px solid var(--border)', flexShrink: 0 }}>
          <Icon size={19} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--txt)' }}>{title}</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--txt-3)' }}>{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

// ─── Paginación ───────────────────────────────────────────────
function Paginacion({ page, totalPages, total, limit, onChange }) {
  if (totalPages <= 1) return null;
  const desde = (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--txt-3)' }}>
        {desde}–{hasta} de <strong>{total}</strong> productos
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <Btn variant="ghost" size="sm" icon={<ChevronLeft size={14}/>} disabled={page <= 1}         onClick={() => onChange(page - 1)} />
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          // Ventana deslizante de 5 páginas centrada en la actual
          let p;
          if (totalPages <= 5) p = i + 1;
          else if (page <= 3)  p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else p = page - 2 + i;
          return (
            <button key={p} onClick={() => onChange(p)} style={{
              width: 30, height: 30, borderRadius: 6, border: page === p ? 'none' : '1px solid var(--border)',
              background: page === p ? 'var(--accent)' : 'transparent',
              color: page === p ? '#fff' : 'var(--txt)', cursor: 'pointer', fontSize: 12, fontWeight: page === p ? 700 : 400,
            }}>{p}</button>
          );
        })}
        <Btn variant="ghost" size="sm" icon={<ChevronRight size={14}/>} disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  );
}

// ─── Card individual (móvil) ──────────────────────────────────
function ProductoCard({ p, onEditar, onToggleVariantes, expandido, variantesMap, setVarianteModal, eliminarVarianteM }) {
  return (
    <div className="cat-card">
      <div className="cat-card-top">
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)' }}>{p.nombre}</div>
          {p.descripcion && <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2 }}>{p.descripcion}</div>}
        </div>
        <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => onEditar(p)} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {p.codigo && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)', background: 'var(--bg-3)', padding: '2px 7px', borderRadius: 4 }}>{p.codigo}</span>}
        {p.categoria && <Badge color="blue">{p.categoria}</Badge>}
        {p.unidad && <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{p.unidad}</span>}
      </div>
      {(p.categoria === 'EPP' || p.tiene_variantes) && (
        <div>
          <Btn variant="ghost" size="sm" icon={<Tags size={13} />} onClick={() => onToggleVariantes(p)}>
            Variantes <ChevronDown size={13} style={{ transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </Btn>
          {expandido && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(variantesMap[p.id] || []).map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{[v.genero, v.talla].filter(Boolean).join(' — ') || 'Variante'}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{v.codigo || '—'}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => setVarianteModal({ ...v, productoId: p.id })} />
                    <Btn variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => eliminarVarianteM.mutate({ ...v, productoId: p.id })} />
                  </div>
                </div>
              ))}
              <Btn variant="ghost" size="sm" icon={<Plus size={13} />} style={{ alignSelf: 'flex-start' }} onClick={() => setVarianteModal({ productoId: p.id, talla: '', genero: '', codigo: '' })}>Agregar variante</Btn>
            </div>
          )}
        </div>
      )}
      {p.categoria === 'Rollo' && p.metros_por_unidad && (
        <div className="cat-card-row"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.metros_por_unidad}m/rollo</span></div>
      )}
    </div>
  );
}

export default function AlmacenCatalogo() {
  const qc        = useQueryClient();
  const emptyForm = { id: null, nombre: '', codigo: '', categoria: '', unidad: '', descripcion: '' };

  const [modalProducto,   setModalProducto]   = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [variantesMap,    setVariantesMap]    = useState({});
  const [varianteModal,   setVarianteModal]   = useState(null);
  const [q,               setQ]               = useState('');
  const [categoria,       setCategoria]       = useState('todas');
  const [page,            setPage]            = useState(1);

  const qDebounced = useDebounce(q, 400);

  // Resetear página cuando cambia el filtro
  useEffect(() => { setPage(1); }, [qDebounced, categoria]);

  const productosQ = useQuery({
    queryKey: ['productos-catalogo', qDebounced, categoria, page],
    queryFn:  () => productosApi.catalogo({
      q:         qDebounced || undefined,
      categoria: categoria !== 'todas' ? categoria : undefined,
      page,
      limit: 20,
    }).then(r => r.data),
    keepPreviousData: true,  // evita flicker al cambiar página
  });

  const categoriasQ = useQuery({
    queryKey: ['categorias-catalogo'],
    queryFn:  () => productosApi.categorias().then(r => r.data),
  });

  const refreshProductos = () => {
    qc.invalidateQueries({ queryKey: ['productos'] });
    qc.invalidateQueries({ queryKey: ['productos-catalogo'] });
    qc.invalidateQueries({ queryKey: ['stock-sede'] });
  };

  const guardarM = useMutation({
    mutationFn: () => {
      const payload = {
        nombre:            modalProducto.nombre.trim(),
        codigo:            modalProducto.codigo            || null,
        categoria:         modalProducto.categoria         || null,
        unidad:            modalProducto.unidad            || null,
        descripcion:       modalProducto.descripcion       || null,
        es_medible:        modalProducto.categoria === 'Rollo',
        metros_por_unidad: modalProducto.metros_por_unidad || null,
        tiene_variantes:   modalProducto.categoria === 'EPP',
      };
      return modalProducto.id
        ? productosApi.actualizar(modalProducto.id, payload)
        : productosApi.crear(payload);
    },
    onSuccess: () => { toast.success(modalProducto.id ? 'Producto actualizado' : 'Producto creado'); setModalProducto(null); refreshProductos(); },
    onError:   e => toast.error(e.response?.data?.error || 'No se pudo guardar el producto'),
  });

  const guardarVarianteM = useMutation({
    mutationFn: () => varianteModal.id
      ? productosApi.actualizarVariante(varianteModal.id, varianteModal)
      : productosApi.crearVariante(varianteModal.productoId, varianteModal),
    onSuccess: async () => {
      const productoId = varianteModal.productoId;
      const { data }   = await productosApi.variantes(productoId);
      setVariantesMap(prev => ({ ...prev, [productoId]: data }));
      setVarianteModal(null);
      toast.success('Variante guardada');
      refreshProductos();
    },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo guardar la variante'),
  });

  const eliminarVarianteM = useMutation({
    mutationFn: (v) => productosApi.eliminarVariante(v.id),
    onSuccess: async (_, v) => {
      const { data } = await productosApi.variantes(v.productoId);
      setVariantesMap(prev => ({ ...prev, [v.productoId]: data }));
      toast.success('Variante eliminada');
      refreshProductos();
    },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo eliminar la variante'),
  });

  const categorias = categoriasQ.data || [];
  const result     = productosQ.data || { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  const productos  = result.data || [];

  const abrirEditar = (p) => setModalProducto({
    id: p.id, nombre: p.nombre || '', codigo: p.codigo || '',
    categoria: p.categoria || '', unidad: p.unidad || '',
    descripcion: p.descripcion || '', metros_por_unidad: p.metros_por_unidad || '',
  });

  const toggleVariantes = async (producto) => {
    if (expandedProduct === producto.id) { setExpandedProduct(null); return; }
    setExpandedProduct(producto.id);
    if (!variantesMap[producto.id]) {
      const { data } = await productosApi.variantes(producto.id);
      setVariantesMap(prev => ({ ...prev, [producto.id]: data }));
    }
  };

  return (
    <div style={{ padding: 24 }} className="animate-fade">
      <Header
        title="Catálogo global"
        subtitle="Nombres y referencias comunes para todas las sedes"
        icon={Package}
        right={<Btn variant="primary" icon={<Plus size={14} />} onClick={() => setModalProducto(emptyForm)}>Nuevo producto</Btn>}
      />

      {/* Filtros */}
      <div className="cat-filtros" style={{ display: 'grid', gap: 10, marginBottom: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '10px 14px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, código o descripción..." style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} style={inputStyle}>
          <option value="todas">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Vista MÓVIL: cards ── */}
      <div className="cat-cards">
        {productosQ.isLoading ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--txt-3)' }}>Cargando...</div>
        ) : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--txt-3)', fontSize: 13 }}>Sin productos en el catálogo</div>
        ) : productos.map(p => (
          <ProductoCard key={p.id} p={p} onEditar={abrirEditar} onToggleVariantes={toggleVariantes}
            expandido={expandedProduct === p.id} variantesMap={variantesMap}
            setVarianteModal={setVarianteModal} eliminarVarianteM={eliminarVarianteM} />
        ))}
        <Paginacion page={result.page} totalPages={result.totalPages} total={result.total} limit={result.limit} onChange={setPage} />
      </div>

      {/* ── Vista DESKTOP: tabla ── */}
      <div className="cat-table-wrap" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <Table loading={productosQ.isLoading} headers={['Código', 'Producto', 'Categoría', 'Unidad', 'Detalles', '']}>
          {productos.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--txt-3)', fontSize: 13 }}>Sin productos en el catálogo</td></tr>
          ) : productos.map(p => (
            <React.Fragment key={p.id}>
              <Tr>
                <Td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt-3)' }}>{p.codigo || '—'}</Td>
                <Td>
                  <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                  {p.descripcion && <div style={{ fontSize: 11, color: 'var(--txt-3)', marginTop: 2 }}>{p.descripcion}</div>}
                </Td>
                <Td>{p.categoria ? <Badge color="blue">{p.categoria}</Badge> : '—'}</Td>
                <Td style={{ color: 'var(--txt-3)', fontSize: 12 }}>{p.unidad || '—'}</Td>
                <Td>
                  {p.categoria === 'EPP' || p.tiene_variantes ? (
                    <Btn variant="ghost" size="sm" icon={<Tags size={13} />} onClick={() => toggleVariantes(p)}>
                      Variantes <ChevronDown size={13} />
                    </Btn>
                  ) : p.categoria === 'Rollo' && p.metros_por_unidad
                    ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--txt-3)' }}>{p.metros_por_unidad}m/rollo</span>
                    : '—'}
                </Td>
                <Td><Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => abrirEditar(p)} /></Td>
              </Tr>
              {expandedProduct === p.id && (
                <tr>
                  <td colSpan={6} style={{ padding: 12, background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(variantesMap[p.id] || []).map(v => (
                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{[v.genero, v.talla].filter(Boolean).join(' — ') || 'Variante'}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--txt-3)' }}>{v.codigo || '—'}</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            <Btn variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => setVarianteModal({ ...v, productoId: p.id })} />
                            <Btn variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => eliminarVarianteM.mutate({ ...v, productoId: p.id })} />
                          </div>
                        </div>
                      ))}
                      <Btn variant="ghost" size="sm" icon={<Plus size={13} />} style={{ alignSelf: 'flex-start' }} onClick={() => setVarianteModal({ productoId: p.id, talla: '', genero: '', codigo: '' })}>Agregar variante</Btn>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </Table>
        <Paginacion page={result.page} totalPages={result.totalPages} total={result.total} limit={result.limit} onChange={setPage} />
      </div>

      {/* Modal producto */}
      <Modal open={Boolean(modalProducto)} onClose={() => setModalProducto(null)} title={modalProducto?.id ? 'Editar producto del catálogo' : 'Nuevo producto al catálogo'} width={520}>
        {modalProducto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Input label="Código" value={modalProducto.codigo} onChange={e => setModalProducto({ ...modalProducto, codigo: e.target.value })} />
              <Select label="Categoría" value={modalProducto.categoria} onChange={e => setModalProducto({ ...modalProducto, categoria: e.target.value })}>
                <option value="">Seleccionar...</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <Input label="Nombre del producto" value={modalProducto.nombre} onChange={e => setModalProducto({ ...modalProducto, nombre: e.target.value })} />
            <Input label="Descripción" value={modalProducto.descripcion} onChange={e => setModalProducto({ ...modalProducto, descripcion: e.target.value })} />
            <Input label="Unidad" value={modalProducto.unidad} onChange={e => setModalProducto({ ...modalProducto, unidad: e.target.value })} />
            {modalProducto.categoria === 'Rollo' && (
              <Input label="Metros por unidad / rollo" type="number" value={modalProducto.metros_por_unidad || ''} onChange={e => setModalProducto({ ...modalProducto, metros_por_unidad: e.target.value })} />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setModalProducto(null)}>Cancelar</Btn>
              <Btn variant="primary" disabled={!modalProducto.nombre?.trim() || guardarM.isPending} loading={guardarM.isPending} onClick={() => guardarM.mutate()}>
                {modalProducto.id ? 'Guardar cambios' : 'Crear producto'}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal variante */}
      <Modal open={Boolean(varianteModal)} onClose={() => setVarianteModal(null)} title={varianteModal?.id ? 'Editar variante' : 'Nueva variante'} width={400}>
        {varianteModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Género"             value={varianteModal.genero  || ''} onChange={e => setVarianteModal({ ...varianteModal, genero:  e.target.value })} />
            <Input label="Talla"              value={varianteModal.talla   || ''} onChange={e => setVarianteModal({ ...varianteModal, talla:   e.target.value })} />
            <Input label="Código de variante" value={varianteModal.codigo  || ''} onChange={e => setVarianteModal({ ...varianteModal, codigo:  e.target.value })} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
              <Btn variant="ghost" onClick={() => setVarianteModal(null)}>Cancelar</Btn>
              <Btn variant="primary" disabled={guardarVarianteM.isPending} loading={guardarVarianteM.isPending} onClick={() => guardarVarianteM.mutate()}>
                {varianteModal.id ? 'Guardar cambios' : 'Agregar'}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}