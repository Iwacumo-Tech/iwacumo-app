import { create } from "zustand";

interface BookStore {
  content: string;
  setContent: (newContent: string) => void;
}

export const useBookStore = create<BookStore>((set) => ({
  content: "", // initial content
  setContent: (newContent: string) => set({ content: newContent }),
}));
