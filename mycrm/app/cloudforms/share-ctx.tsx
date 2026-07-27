"use client";
import { createContext, useContext } from "react";

export type ShareForm = { id: string; name: string } | null;

export const CFShareCtx = createContext<{
  shareForm: ShareForm;
  setShareForm: (f: ShareForm) => void;
}>({ shareForm: null, setShareForm: () => {} });

export function useCFShare() { return useContext(CFShareCtx); }
