export const parsePrecio = (precio: string | null | undefined): number => {
    if (!precio) return 0;
    const precioNumerico = parseFloat(precio.replace(/[\$,]/g, '').trim());
    return isNaN(precioNumerico) ? 0 : precioNumerico;
}

export const formatMoney = (valor: number): string => {
    return valor.toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export const formatPrecio = (precio: string | null | undefined): string => {
    return formatMoney(parsePrecio(precio));
}

export const totalxcantidad = ( precio: string, cantidad: number ) => {
        return formatMoney(parsePrecio(precio) * cantidad);
    }