import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type Props = {
  children: React.ReactNode;
  title?: string;
};

export default function DashboardLayout({ children, title }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex flex-col min-h-screen md:pl-64">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-full mx-auto">
            {title && (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  {title}
                </h1>
              </div>
            )}

            <div className="space-y-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
