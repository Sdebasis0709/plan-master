import { useEffect, useState } from "react";
import ManagerLayout from "../../components/layout/ManagerLayout";
import client from "../../api/axiosClient";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function ManagerStats() {
  const [hourly, setHourly] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [rootCauses, setRootCauses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const h = await client.get("/api/management/stats/hourly");
      const d = await client.get("/api/management/stats/daily");
      const w = await client.get("/api/management/stats/weekly");
      const rc = await client.get("/api/management/stats/root-causes");

      // Convert hourly object → array
      const hourlyArr = Object.keys(h.data).map((hr) => ({
        hour: Number(hr),
        count: h.data[hr],
      }));

      setHourly(hourlyArr || []);
      setDaily(d.data || []);
      setWeekly(w.data || []);
      setRootCauses(rc.data || []); // backend already returns array
    } catch (err) {
      console.log("Stats load error:", err);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="text-gray-400 animate-pulse">Loading stats...</div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <h1 className="text-2xl font-semibold mb-6">Statistics</h1>

      <div className="space-y-10">

        {/* Hourly */}
        <StatCard title="Hourly Breakdown (Today)">
          <ChartWrapper>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </StatCard>

        {/* Daily */}
        <StatCard title="Daily Trend (Last 30 Days)">
          <ChartWrapper>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={daily || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </StatCard>

        {/* Weekly */}
        <StatCard title="Weekly Breakdown (Last 12 Weeks)">
          <ChartWrapper>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week_start" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Bar dataKey="count" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </StatCard>

        {/* Root Causes */}
        <StatCard title="Top Root Causes">
          <ChartWrapper>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rootCauses || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="root_cause" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </StatCard>

      </div>
    </ManagerLayout>
  );
}

function StatCard({ title, children }: any) {
  return (
    <div className="bg-[#07121a] p-6 rounded-lg border border-gray-800">
      <h2 className="text-lg mb-4 font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function ChartWrapper({ children }: any) {
  return <div className="w-full h-[300px]">{children}</div>;
}
