"use client";

import { createContext, useContext } from "react";

export type FamilyMember = { id: string; display_name: string };

type FamilyContextValue = {
  members: FamilyMember[];
  isParent: boolean;
  currentId: string;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({
  members,
  isParent,
  currentId,
  children,
}: FamilyContextValue & { children: React.ReactNode }) {
  return (
    <FamilyContext.Provider value={{ members, isParent, currentId }}>
      {children}
    </FamilyContext.Provider>
  );
}

/** Family roster + role of the signed-in user, for components rendered deep
 * under (app)/layout.tsx (e.g. TaskDetailDrawer) without prop-drilling
 * through every page that opens it. */
export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be used within FamilyProvider");
  return ctx;
}
