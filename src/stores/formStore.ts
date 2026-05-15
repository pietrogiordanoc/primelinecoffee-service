import { create } from 'zustand';
import type { DynamicForm, FormField } from '@/types';

interface FormState {
  forms: DynamicForm[];
  currentForm: DynamicForm | null;
  formFields: FormField[];
  loading: boolean;
  error: string | null;
  setForms: (forms: DynamicForm[]) => void;
  setCurrentForm: (form: DynamicForm | null) => void;
  setFormFields: (fields: FormField[]) => void;
  addForm: (form: DynamicForm) => void;
  updateForm: (id: string, form: Partial<DynamicForm>) => void;
  removeForm: (id: string) => void;
  addField: (field: FormField) => void;
  updateField: (id: string, field: Partial<FormField>) => void;
  removeField: (id: string) => void;
  reorderFields: (fields: FormField[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useFormStore = create<FormState>((set) => ({
  forms: [],
  currentForm: null,
  formFields: [],
  loading: false,
  error: null,

  setForms: (forms) => set({ forms }),

  setCurrentForm: (form) => set({ currentForm: form }),

  setFormFields: (fields) => set({ formFields: fields }),

  addForm: (form) =>
    set((state) => ({ forms: [...state.forms, form] })),

  updateForm: (id, updatedData) =>
    set((state) => ({
      forms: state.forms.map((form) =>
        form.id === id ? { ...form, ...updatedData } : form
      ),
    })),

  removeForm: (id) =>
    set((state) => ({
      forms: state.forms.filter((form) => form.id !== id),
    })),

  addField: (field) =>
    set((state) => ({ formFields: [...state.formFields, field] })),

  updateField: (id, updatedData) =>
    set((state) => ({
      formFields: state.formFields.map((field) =>
        field.id === id ? { ...field, ...updatedData } : field
      ),
    })),

  removeField: (id) =>
    set((state) => ({
      formFields: state.formFields.filter((field) => field.id !== id),
    })),

  reorderFields: (fields) => set({ formFields: fields }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),
}));
