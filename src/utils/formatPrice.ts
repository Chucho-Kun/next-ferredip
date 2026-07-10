export const totalxcantidad = ( precio: string, cantidad: number ) => {
        if (!precio) return "0.00";
        // Limpiar el precio: eliminar $ , y espacios
        const precioLimpio = precio
            .replace(/[\$,]/g, '')   // Elimina dólares y comas
            .trim();
        const precioNumerico = parseFloat(precioLimpio);
        if (isNaN(precioNumerico)) return "0.00";
        return (precioNumerico * cantidad).toFixed(2);
    }