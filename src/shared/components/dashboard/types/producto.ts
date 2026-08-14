export type Producto = {
  id: string;
  clave: string;
  descripcion: string;
  precioant?: string;
  precio?: string;
  marca?: string;
  categoria?: string;
  related_products?: string[];
  // Agrega aquí todos los campos que uses
};