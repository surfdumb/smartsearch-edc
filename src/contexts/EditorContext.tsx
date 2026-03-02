"use client";

import { createContext, useContext } from "react";

interface EditorContextValue {
  isEditable: boolean;
}

export const EditorContext = createContext<EditorContextValue>({ isEditable: false });

export function useEditorContext() {
  return useContext(EditorContext);
}
