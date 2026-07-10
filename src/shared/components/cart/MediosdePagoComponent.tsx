'use client';

import { useState } from 'react';
import { useCartStore } from '@/src/store/cartStore';
import { useDeliveryStore } from '@/src/store/deliveryStore';
import MercadoPagoBrick from './MercadoPagoBrick';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import MercadoPagoButton from './MercadoPagoButton';

export default function MediosdePagoComponent() {
  const { items, totalPrice, subTotal, shippingCost } = useCartStore();
  const { formData, validateForm } = useDeliveryStore();
  
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { formData:{ nombre, apellidos, direccion, entreCalles, ciudad, cp, telefono } } = useDeliveryStore()

  const crearPreferencia = async () => {
    if (items.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    const isDeliveryValid = validateForm();
    if (!isDeliveryValid) {
      return; // El toast de errores ya se muestra en validateForm
    }

    setLoading(true);

    try {
      console.log('🧭 CrearPreferencia: enviando items al backend', items);

      const controller = new AbortController();
      const timeoutMs = 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            title: ( item.titulo || (`Producto Dipemsa ${item.id || ''}`)).toString().trim(),
            currency_id: 'MXN',
            picture_url: `/fotos/${item.id}.jpg`,
            description: item.descripcion || '',
            category_id: item.marca,
            quantity: item.cantidad,
            unit_price: parseFloat(String(item.precio).replace(/[$,]/g, '')) || 0,
          })),
          payer: {
            name: formData.nombre,
            surname: formData.apellidos,
            email: '',                    // Puedes agregar un campo de email después
            phone: {
              area_code: "52",
              number: formData.telefono.replace(/\D/g, '')
            },
            address: {
              street_name: formData.direccion,
              street_number: "",           // Puedes agregar campo si quieres
              zip_code: formData.cp
            }
          },
          // Datos adicionales útiles
            // ==================== ADDITIONAL_INFO ====================
          additional_info: {
            items: items.map(item => ({
              id: item.id,
              title: ( item.titulo || (`Producto Dipemsa ${item.id || ''}`)).toString().trim(),
              description: item.descripcion,
              quantity: item.cantidad,
              unit_price: parseFloat(item.precio.replace(/[$,]/g, '')) || 0,
            })),
            shipments: {
              receiver_address: {
                zip_code: formData.cp,
                street_name: formData.direccion,
              }
            },
            payer: {
              first_name: formData.nombre,
              last_name: formData.apellidos,
              phone: {
                area_code: "52",
                number: formData.telefono.replace(/\D/g, '')
              }
            }
          },
          metadata: {
            ciudad: formData.ciudad,
            entre_calles: formData.entreCalles,
            telefono: formData.telefono,
            // Enviar una versión reducida del carrito para depuración en backend
            carrito_completo: items.map(i => ({
              id: i.id,
              titulo: i.titulo,
              descripcion: i.descripcion,
              cantidad: i.cantidad,
              precio: i.precio
            }))
          }
        }),
      });

      // ← NUEVO: Mejor manejo de respuesta
      clearTimeout(timeoutId);
      const text = await res.text(); // Primero leemos como texto

      if (!res.ok) {
        console.error('Error del servidor:', res.status, text);
        alert(`Error del servidor: ${res.status} - Revisa la consola`);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Respuesta inválida al crear preferencia:', text);
        alert('Respuesta inválida del servidor de pagos. Revisa la consola.');
        return;
      }

      if (data.preferenceId) {
        setPreferenceId(data.preferenceId);
      } else {
        console.error('No se recibió preferenceId:', data);
        alert('Error: No se recibió preferenceId');
      }
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        console.error('❌ CrearPreferencia: fetch aborted (timeout)');
        alert('Tiempo de conexión agotado al crear preferencia. Intenta de nuevo.');
      } else {
        console.error('Error completo:', error);
        alert('Error al conectar con el servidor de pagos');
      }
    } finally {
      setLoading(false);
    }

  };

  return (
    <MercadoPagoButton 
      preferenceId={preferenceId} 
      crearPreferencia={crearPreferencia} 
      loading={loading} 
      items={items} 
      totalPrice={ totalPrice } 
    />
  );
}