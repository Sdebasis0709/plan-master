// src/components/ManagerWSWrapper.tsx
import React from "react";
import { useAuth } from "../store/authStore";
import { useManagerWS } from "../services/wsManager";

export default function ManagerWSWrapper() {
  // Calling hook at top-level
  useManagerWS();

  // optionally you can return null — this component exists only to mount the hook
  return null;
}
