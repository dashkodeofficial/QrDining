"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AdminContextValue {
  isAdmin: boolean;
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  selectedTableId: null,
  setSelectedTableId: () => {},
});

export function AdminProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  return (
    <AdminContext.Provider value={{ isAdmin, selectedTableId, setSelectedTableId }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
