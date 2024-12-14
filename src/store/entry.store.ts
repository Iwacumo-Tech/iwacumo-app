import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface State {
  activeForm: "SIGN_UP" | "LOGIN";
  step: number;
  phoneNumber?: string;
}

interface Actions {
  switchTo: (form: "SIGN_UP" | "LOGIN") => void;
  setPhoneNumber: (number: string) => void;
  changePhoneNumber: () => void;
}

export const useEntryStore = create<State & Actions>()(
  persist(
    (set, _get) => ({
      activeForm: "SIGN_UP",
      step: 1,
      switchTo: (form) => {
        set((state) => ({ ...state, step: 1, activeForm: form }));
      },
      setPhoneNumber: (number) => {
        set((state) => ({ ...state, phoneNumber: number, step: 2 }));
      },
      changePhoneNumber: () => {
        set((state) => ({ ...state, step: 1 }));
      },
    }),
    {
      name: "entry-storage",
      storage: createJSONStorage(() => localStorage),
    },
  )
);
