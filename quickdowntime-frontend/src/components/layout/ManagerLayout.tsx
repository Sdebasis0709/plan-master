import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../store/authStore";
import { useAlertStore } from "../../store/alertStore";
import client from "../../api/axiosClient";

// Icons
import {
  LayoutDashboard,
  Bell,
  BarChart,
  ListOrdered,
  BotIcon,
} from "lucide-react";

interface Props {
  children: ReactNode;
}

export default function ManagerLayout({ children }: Props) {
  const { logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Real-time alert count from Zustand
  const alertCount = useAlertStore((s) => s.count);
  const setCount = useAlertStore((s) => s.setCount);

  // 🔥 Fetch alert count from API
  const fetchAlertCount = async () => {
    try {
      const response = await client.get("/dashboard/alerts/unseen-count");
      setCount(response.data.count || 0);
    } catch (error) {
      console.error("Error fetching alert count:", error);
    }
  };

  // 🔥 Fetch count on mount and when route changes
  useEffect(() => {
    fetchAlertCount();
  }, [location.pathname]);

  // 🔥 Optional: Poll for new alerts every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAlertCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: "Alerts", path: "/manager/alerts", icon: Bell, badge: alertCount },
    { label: "Dashboard", path: "/manager", icon: LayoutDashboard },
    { label: "Downtimes", path: "/manager/downtimes", icon: ListOrdered },
    { label: "Statistics", path: "/manager/stats", icon: BarChart },
    { label: "AI Insights", path: "/manager/ai", icon: BotIcon },
  ];

  return (
    <div className="flex min-h-screen bg-[#0f1724] text-white">
      
      {/* ================================
             DESKTOP SIDEBAR
         ================================ */}
      <div className="hidden md:block w-64 bg-[#07121a] p-5 border-r border-gray-800">
        <h1 className="text-2xl font-bold mb-8 text-primary">Manager</h1>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between p-3 rounded-lg group relative
                  ${
                    active
                      ? "bg-primary text-black font-semibold"
                      : "hover:bg-[#0d1c29]"
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    size={18}
                    className={
                      active ? "text-black" : "text-gray-300 group-hover:text-white"
                    }
                  />
                  <span>{item.label}</span>
                </div>

                {/* 🔥 Alert Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="text-xs px-2 py-1 bg-red-600 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}

                {active && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-blue-400 rounded-r"></div>
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="mt-10 px-4 py-2 bg-red-600 w-full rounded-lg"
        >
          Logout
        </button>
      </div>

      {/* ================================
             MOBILE SIDEBAR
         ================================ */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute left-0 top-0 w-64 h-full bg-[#07121a] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="text-2xl font-bold mb-8 text-primary">Manager</h1>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-lg group relative
                      ${
                        active
                          ? "bg-primary text-black font-semibold"
                          : "hover:bg-[#0d1c29]"
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        size={18}
                        className={
                          active
                            ? "text-black"
                            : "text-gray-300 group-hover:text-white"
                        }
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-xs px-2 py-1 bg-red-600 rounded-full animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={logout}
              className="mt-10 px-4 py-2 bg-red-600 w-full rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* ================================
             MAIN CONTENT
         ================================ */}
      <div className="flex-1 flex flex-col">
        <div className="bg-[#07121a] p-4 flex items-center justify-between md:justify-end shadow">
          <button
            className="md:hidden bg-primary text-black px-3 py-1 rounded"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>

          <button
            onClick={logout}
            className="hidden md:block bg-red-600 px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}