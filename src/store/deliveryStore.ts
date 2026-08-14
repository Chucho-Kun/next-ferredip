import { create } from 'zustand';

type DeliveryForm = {
  nombre: string;
  apellidos: string;
  direccion: string;
  entreCalles: string;
  ciudad: string;
  cp: string;
  telefono: string;
  email: string;
};

type DeliveryErrors = Partial<Record<keyof DeliveryForm, string>>;

type DeliveryStore = {
  formData: DeliveryForm;
  errors: DeliveryErrors;
  setFormData: (data: Partial<DeliveryForm>) => void;
  setError: (field: keyof DeliveryForm, message: string) => void;
  clearErrors: () => void;
  validateForm: () => boolean;
};

const formularioVacio = {
    nombre: '',
    apellidos: '',
    direccion: '',
    entreCalles: '',
    ciudad: '',
    cp: '',
    telefono: '',
    email: '',
  }

export const useDeliveryStore = create<DeliveryStore>((set, get) => ({
  formData: formularioVacio,
  errors: {},

  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
      errors: { ...state.errors, [Object.keys(data)[0] as keyof DeliveryForm]: undefined }
    })),

  setError: (field, message) =>
    set((state) => ({
      errors: { ...state.errors, [field]: message }
    })),

  clearErrors: () => set({ errors: {} }),

  validateForm: () => {
    const { formData } = get();
    const newErrors: DeliveryErrors = {};
    let isValid = true;

    if (!formData.nombre.trim()) {
      newErrors.nombre = "Favor de colocar Nombre";
      isValid = false;
    }
    if (!formData.apellidos.trim()) {
      newErrors.apellidos = "Favor de colocar Apellidos";
      isValid = false;
    }
    if (!formData.direccion.trim()) {
      newErrors.direccion = "Favor de colocar una Dirección";
      isValid = false;
    }
    if (!formData.ciudad.trim()) {
      newErrors.ciudad = "Falta Ciudad / Municipio";
      isValid = false;
    }
    if (!formData.cp.trim()) {
      newErrors.cp = "Falta el Código Postal";
      isValid = false;
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = "Favor de colocar un Teléfono";
      isValid = false;
    }
  
    set({ errors: newErrors });
    return isValid;
  },
}));