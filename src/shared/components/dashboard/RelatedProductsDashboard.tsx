'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';
import { Producto } from './types/producto';

export default function RelatedProductsDashboard() {
  const [isClient, setIsClient] = useState(false);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [relacionados, setRelacionados] = useState<Producto[]>([]);
  const [relacionadosIds, setRelacionadosIds] = useState<string[]>([]);

  // Soluciona problemas de hidratación
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cargar todos los productos
  useEffect(() => {
    fetch('/api/admin/productos')
      .then(res => res.json())
      .then(data => setProductos(data));
  }, []);

  // Cuando cambie el producto seleccionado, actualizar relacionados y sus IDs
  useEffect(() => {
    if (!productoSeleccionado) {
      setRelacionados([]);
      setRelacionadosIds([]);
      return;
    }

    const ids = productoSeleccionado.related_products || [];
    setRelacionadosIds(ids);

    const relacionadosFiltrados = productos.filter(p => ids.includes(p.id));
    setRelacionados(relacionadosFiltrados);
  }, [productoSeleccionado, productos]);

  const actualizarRelacionados = async (productoId: string, nuevosRelacionados: string[]) => {
    const res = await fetch(`/api/admin/productos/${productoId}/relacionados`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ related_products: nuevosRelacionados })
    });

    if (res.ok) {
      toast.success("Productos relacionados actualizados");
    } else {
      toast.error("Error al actualizar");
    }
  };

  const agregarRelacionado = async (productoRelacionado: Producto) => {
    if (!productoSeleccionado) return;

    const relacionadosActuales = relacionados.map(rel => rel.id);
    if (relacionadosActuales.includes(productoRelacionado.id)) {
      toast.error("Este producto ya está relacionado");
      return;
    }

    const nuevosIds = [...relacionadosActuales, productoRelacionado.id];

    await actualizarRelacionados(productoSeleccionado.id, nuevosIds);

    setRelacionados(prev => [...prev, productoRelacionado]);
    setRelacionadosIds(nuevosIds);
  };

  const eliminarRelacionado = async (idToRemove: string) => {
    if (!productoSeleccionado) return;

    const nuevosIds = relacionados
      .filter(rel => rel.id !== idToRemove)
      .map(rel => rel.id);

    await actualizarRelacionados(productoSeleccionado.id, nuevosIds);

    setRelacionados(prev => prev.filter(rel => rel.id !== idToRemove));
    setRelacionadosIds(nuevosIds);
  };

  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Cargando dashboard de productos relacionados...
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <LeftPanel
        productos={productos}
        productoSeleccionado={productoSeleccionado}
        setProductoSeleccionado={setProductoSeleccionado}
      />

      <CenterPanel
        productoSeleccionado={productoSeleccionado}
        relacionados={relacionados}
        eliminarRelacionado={eliminarRelacionado}
        relacionadosIds={relacionadosIds}
      />

      <RightPanel
        productos={productos}
        productoSeleccionado={productoSeleccionado}
        relacionados={relacionados}
        agregarRelacionado={agregarRelacionado}
      />
    </div>
  );
}