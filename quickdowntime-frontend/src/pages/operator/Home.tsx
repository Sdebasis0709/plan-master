import React from "react";
import { Link } from "react-router-dom";

export default function OperatorHome() {
  return (
    <div className="min-h-screen bg-[#0f1724] text-white p-5 flex flex-col">
      <h1 className="text-2xl font-bold mb-6">Operator Panel</h1>

      <div className="space-y-4">
        <Link
          to="/operator/start"
          className="block p-4 rounded-lg bg-blue-600 text-white font-semibold text-center"
        >
          Start Downtime
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
