import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth
import Login from "./pages/Login";
import Toast from "./components/Toast";

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
import MachineDetail from './pages/manager/MachineDetail';

export default function App() {
  return (
    <BrowserRouter>
      {/* 🔥 Toast must sit OUTSIDE <Routes> */}
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
