import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type LoadingCtx = {
  activeCount: number;
  show: () => void;
  hide: () => void;
};

const Ctx = createContext<LoadingCtx | null>(null);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCount, setActiveCount] = useState(0);
  const lock = useRef(false);

  const show = useCallback(() => {
    // lagani “debounce” da spriječi treperenje na super brzim requestovima
    if (lock.current) return;
    lock.current = true;
    setTimeout(() => {
      setActiveCount((c) => c + 1);
      lock.current = false;
    }, 80);
  }, []);

  const hide = useCallback(() => {
    setActiveCount((c) => Math.max(0, c - 1));
  }, []);

  const value = useMemo(() => ({ activeCount, show, hide }), [activeCount, show, hide]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useLoading = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider");
  return ctx;
};
