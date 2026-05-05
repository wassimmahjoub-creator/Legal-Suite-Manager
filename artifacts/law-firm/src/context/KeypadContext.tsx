import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";

interface KeypadContextType {
  focusedInputId: string | null;
  setFocusedInputId: (id: string | null) => void;
  focusedInputRef: React.RefObject<HTMLInputElement | null>;
  handleKeypadPress: (key: string) => void;
}

const KeypadContext = createContext<KeypadContextType | undefined>(undefined);

export function KeypadProvider({ children }: { children: ReactNode }) {
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);
  const focusedInputRef = useRef<HTMLInputElement | null>(null);

  const handleKeypadPress = (key: string) => {
    if (!focusedInputRef.current) return;
    
    const input = focusedInputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = input.value;

    let newValue = currentValue;
    
    if (key === "backspace") {
      if (start > 0) {
        newValue = currentValue.substring(0, start - 1) + currentValue.substring(end);
        input.value = newValue;
        input.setSelectionRange(start - 1, start - 1);
      }
    } else {
      newValue = currentValue.substring(0, start) + key + currentValue.substring(end);
      input.value = newValue;
      input.setSelectionRange(start + 1, start + 1);
    }
    
    // Trigger React's onChange handler
    const event = new Event("input", { bubbles: true });
    input.dispatchEvent(event);
  };

  // Close keypad when clicking outside inputs
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" && (target.getAttribute("type") === "number" || target.classList.contains("use-keypad"));
      const isKeypad = target.closest(".numeric-keypad");
      
      if (!isInput && !isKeypad) {
        setFocusedInputId(null);
        focusedInputRef.current = null;
      }
    };
    
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, []);

  return (
    <KeypadContext.Provider value={{ focusedInputId, setFocusedInputId, focusedInputRef, handleKeypadPress }}>
      {children}
    </KeypadContext.Provider>
  );
}

export function useKeypad() {
  const context = useContext(KeypadContext);
  if (context === undefined) {
    throw new Error("useKeypad must be used within a KeypadProvider");
  }
  return context;
}

export function useKeypadInput(id: string) {
  const { setFocusedInputId, focusedInputRef } = useKeypad();
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocusedInputId(id);
    focusedInputRef.current = e.target;
  };
  
  return {
    onFocus: handleFocus,
    className: "use-keypad"
  };
}