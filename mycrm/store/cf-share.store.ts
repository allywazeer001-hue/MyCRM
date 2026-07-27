"use client";
import { create } from "zustand";

interface CFShareState {
  shareForm: { id: string; name: string } | null;
  setShareForm: (form: { id: string; name: string } | null) => void;
}

export const useCFShareStore = create<CFShareState>()((set) => ({
  shareForm: null,
  setShareForm: (form) => set({ shareForm: form }),
}));
