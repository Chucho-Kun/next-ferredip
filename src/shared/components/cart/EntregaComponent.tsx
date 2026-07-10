'use client'

import { useDeliveryStore } from "@/src/store/deliveryStore"

export default function EntregaComponent() {

  const {formData, setFormData, errors  } = useDeliveryStore();

  return (
     <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-2xl font-bold mb-6">Datos de entrega</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <input
              type="text" 
              placeholder="Nombre:" 
              value={formData.nombre}
              onChange={(e) => setFormData({ nombre: e.target.value })}
              className={`border rounded-xl px-4 py-3 focus:outline-none w-full transition
                ${errors.nombre 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-orange-500'}`}
            />
            <p className={`${ errors.nombre ? 'text-red-500' : 'text-white' } text-sm ml-1 min-h-5`}>{ errors.nombre }</p>

          </div>

          <div className="space-y-1">
            <input
              type="text" 
              placeholder="Apellidos:" 
              value={formData.apellidos}
              onChange={(e) => setFormData({ apellidos: e.target.value })}
              className={`border rounded-xl px-4 py-3 focus:outline-none w-full transition
                ${errors.apellidos 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-orange-500'}`}
            />
            
            <p className={`${ errors.apellidos ? 'text-red-500' : 'text-white' } text-sm ml-1 min-h-5`}>{ errors.apellidos }</p>

          </div>
        </div>

         <div className="space-y-1">
          <input
            type="text" 
            placeholder="Dirección de entrega:" 
            value={formData.direccion}
            onChange={(e) => setFormData({ direccion: e.target.value })}
            className={`border rounded-xl px-4 py-3 focus:outline-none w-full transition
              ${errors.direccion 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-orange-500'}`}
          />
          <p  className={`${ errors.direccion ? 'text-red-500' : 'text-white' } text-sm ml-1 min-h-5`}>{ errors.direccion }</p>

        </div>

          <div className="space-y-1">
          <input
            type="text" 
            placeholder="Entre calles:" 
            value={formData.entreCalles}
            onChange={(e) => setFormData({ entreCalles: e.target.value })}
            className={`border rounded-xl px-4 py-3 focus:outline-none w-full transition
              ${errors.entreCalles 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-orange-500'}`}
          />
          

        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-1">
            <input
              type="text" 
              placeholder="Ciudad / Municipio" 
              value={formData.ciudad}
              onChange={(e) => setFormData({ ciudad: e.target.value })}
              className={`border rounded-xl px-4 py-3 focus:outline-none w-full transition
                ${errors.ciudad 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-orange-500'}`}
            />
            <p  className={`${ errors.ciudad ? 'text-red-500' : 'text-white' } text-sm ml-1 min-h-5`}>{ errors.ciudad }</p>

          </div>
      
        <div className="space-y-1">
            <input
              type="text" 
              placeholder="CP:" 
              value={formData.cp}
              onChange={(e) => setFormData({ cp: e.target.value })}
              className={`border rounded-xl px-4 py-3 focus:outline-none w-full transition
                ${errors.cp 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:border-orange-500'}`}
            />
            <p  className={`${ errors.cp ? 'text-red-500' : 'text-white' } text-sm ml-1 min-h-5`}>{ errors.cp }</p>

          </div>
      
      </div>
        
        <div className="space-y-1">
          <input
            type="text" 
            placeholder="Teléfono:" 
            value={formData.telefono}
            onChange={(e) => setFormData({ telefono: e.target.value })}
            className={`border rounded-xl px-4 py-3 focus:outline-none w-full transition
              ${errors.telefono 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:border-orange-500'}`}
          />
          <p  className={`${ errors.telefono ? 'text-red-500' : 'text-white' } text-sm ml-1 min-h-5`}>{ errors.telefono }</p>

        </div>
        
    </div>
  )}
