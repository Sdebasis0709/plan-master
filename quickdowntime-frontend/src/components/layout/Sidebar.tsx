import React from "react";
import clsx from "clsx";

type Props = {
  open: boolean;
  onClose: () => void;
};

const NavItem = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
  >
    {children}
  </a>
);

export default function Sidebar({ open, onClose }: Props) {
  // basic user info (replace with real context if you add it)
  const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "Manager" : "Manager";
  const role = typeof window !== "undefined" ? localStorage.getItem("user_role") || "manager" : "manager";

  return (
    <>
      {/* Off-canvas backdrop for mobile */}
      <div
        className={clsx(
          "fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={clsx(
          "fixed z-40 inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-full flex flex-col">
          {/* Brand */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold">
              QD
            </div>
            <div>
              <div className="text-sm font-semibold">QuickDowntime</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Management</div>
            </div>
          </div>

          {/* Profile */}
          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 uppercase">
                {userName?.slice(0,1) || "M"}
              </div>
              <div>
                <div className="text-sm font-medium">{userName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{role}</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-2 py-4 space-y-1 overflow-y-auto">
            <NavItem href="/manager/alerts">Alerts</NavItem>
            <NavItem href="/manager">Dashboard</NavItem>
            <NavItem href="/manager/machines">Machines</NavItem>
            
            <NavItem href="/manager/records">Records</NavItem>
            <NavItem href="/manager/reports">Reports</NavItem>
            <NavItem href="/manager/settings">Settings</NavItem>

            <hr className="my-2 border-gray-100 dark:border-gray-700" />

            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user_role");
                localStorage.removeItem("user_name");
                // navigate to login
                window.location.href = "/login";
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
            >
              Logout
            </button>
          </nav>

          <div className="mt-auto px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
            <div>Version 0.1</div>
            <div className="mt-1">Last sync: just now</div>
          </div>
        </div>
      </aside>

      {/* Permanent desktop sidebar placeholder to keep layout spacing */}
      <div className="hidden md:block md:fixed md:inset-y-0 md:left-0 md:w-64" aria-hidden />
    </>
  );
}
