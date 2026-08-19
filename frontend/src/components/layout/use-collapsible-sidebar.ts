"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "portal-sidebar-collapsed";

export function useCollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--portal-sidebar-width",
      collapsed ? "4.5rem" : "16rem",
    );
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return { collapsed, toggleCollapsed: () => setCollapsed((value) => !value) };
}
