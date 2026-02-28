"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface SupplierChatContextType {
  isOpen: boolean;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  pendingMessage: string | null;
  openChatWithMessage: (message: string) => void;
  clearPendingMessage: () => void;
}

const SupplierChatContext = createContext<SupplierChatContextType | null>(null);

export function SupplierChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);
  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const openChatWithMessage = useCallback((message: string) => {
    setPendingMessage(message);
    setIsOpen(true);
  }, []);
  const clearPendingMessage = useCallback(() => setPendingMessage(null), []);

  return (
    <SupplierChatContext.Provider
      value={{
        isOpen,
        toggleChat,
        openChat,
        closeChat,
        pendingMessage,
        openChatWithMessage,
        clearPendingMessage,
      }}
    >
      {children}
    </SupplierChatContext.Provider>
  );
}

export function useSupplierChat() {
  const context = useContext(SupplierChatContext);
  if (!context) {
    throw new Error("useSupplierChat must be used within a SupplierChatProvider");
  }
  return context;
}
