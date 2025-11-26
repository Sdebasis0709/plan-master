// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

// Zustand
import { useAuth } from "./store/authStore";

// WebSocket hook
import { useManagerWS } from "./services/wsManager";
import { wsClient } from "./services/wsClient";

// Toast
import Toast from "./components/Toast";

// Auth
import Login from "./pages/Login";

// Operator pages
import OperatorHome from "./pages/operator/Home";
import OperatorStart from "./pages/operator/Start";
import OperatorActive from "./pages/operator/Active";
import OperatorHistory from "./pages/operator/History";

// Manager pages
import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerStats from "./pages/manager/Stats";
import ManagerDowntimeList from "./pages/manager/DowntimeList";
import ManagerDowntimeDetails from "./pages/manager/DowntimeDetails";
import ManagerAlerts from "./pages/manager/Alerts";
import ManagerReports from "./pages/manager/Reports";
import AIInsights from "./pages/manager/AIInsights";
import MachineDetail from "./pages/manager/MachineDetail";

/* --------------------------------------------------
   🔊 Inside-App Sound Unlocker
-------------------------------------------------- */
function SoundUnlocker() {
  useEffect(() => {
    const unlock = () => {
      wsClient.setSoundEnabled(true);
      document.removeEventListener("click", unlock);
    };

    document.addEventListener("click", unlock);
    return () => document.removeEventListener("click", unlock);
  }, []);

  return null;
}

/* --------------------------------------------------
   🔥 Inside-App Manager WS Wrapper
   - Safe: hooks used at top level
   - WS connects only for manager role
-------------------------------------------------- */
function ManagerWSWrapper() {
  const { user } = useAuth();

  // hook always mounted → safe
  useManagerWS();

  // but WS will only connect if role === manager
  if (user?.role !== "manager") return null;

  return null;
}

/* --------------------------------------------------
   MAIN APP
-------------------------------------------------- */
export default function App() {
  const { user } = useAuth(); // ensures re-render on login/logout

  return (
    <BrowserRouter>
      {/* 🔊 Enable sound on first click */}
      <SoundUnlocker />

      {/* 🔥 Manager-only WebSocket */}
      <ManagerWSWrapper />

      {/* Global toast */}
      <Toast />

      <Routes>
        {/* Auth */}
        <Route path="/" element={<Login />} />

        {/* Operator */}
        <Route path="/operator" element={<OperatorHome />} />
        <Route path="/operator/start" element={<OperatorStart />} />
        <Route path="/operator/active" element={<OperatorActive />} />
        <Route path="/operator/history" element={<OperatorHistory />} />

        {/* Manager */}
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/stats" element={<ManagerStats />} />
        <Route path="/manager/downtimes" element={<ManagerDowntimeList />} />
        <Route path="/manager/downtimes/:id" element={<ManagerDowntimeDetails />} />
        <Route path="/manager/alerts" element={<ManagerAlerts />} />
        <Route path="/manager/reports" element={<ManagerReports />} />
        <Route path="/manager/ai" element={<AIInsights />} />
        <Route path="/manager/machines/:machineId" element={<MachineDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
