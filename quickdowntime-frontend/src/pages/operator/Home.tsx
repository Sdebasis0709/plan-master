import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/authStore";

export default function OperatorHome() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0f1724] text-white p-5 flex flex-col">
      {/* Header with logout */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Operator Panel</h1>

        <button
          onClick={logout}
          className="bg-red-600 px-4 py-2 rounded-lg text-white"
        >
          Logout
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="space-y-4">
        <Link
          to="/operator/start"
          className="block p-4 rounded-lg bg-blue-600 text-white font-semibold text-center"
        >
          Record Downtime
        </Link>

        <Link
          to="/operator/active"
          className="block p-4 rounded-lg bg-amber-500 text-black font-semibold text-center"
        >
          Active Downtime
        </Link>

        <Link
          to="/operator/history"
          className="block p-4 rounded-lg bg-gray-700 text-white font-semibold text-center"
        >
          History
        </Link>
      </div>
    </div>
  );
}
