import { useEffect, useState } from "react";
import ManagerLayout from "../../components/layout/ManagerLayout";
import client from "../../api/axiosClient";

export default function AIInsights() {
  const [daily, setDaily] = useState<any>(null);
  const [weekly, setWeekly] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        client.get("/api/ai/analysis/daily"),
        client.get("/api/ai/analysis/weekly")
      ]);

      setDaily(dailyRes.data);
      setWeekly(weeklyRes.data);
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="text-gray-400 text-lg">Analyzing downtime data with AI...</div>
          </div>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Insights Dashboard
          </h1>
          <p className="text-gray-400 mt-2">AI-powered analysis of downtime patterns and recommendations</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard 
            title="Today's Incidents" 
            value={daily?.total_incidents || 0}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard 
            title="Weekly Incidents" 
            value={weekly?.total_incidents || 0}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        </div>

        {/* Analysis Sections */}
        <Section 
          title="Today's Analysis" 
          data={daily} 
          icon="📊"
          color="blue"
        />
        
        <Section 
          title="Weekly Trends & Patterns" 
          data={weekly} 
          icon="📈"
          color="purple"
        />
      </div>
    </ManagerLayout>
  );
}

function StatCard({ title, value, color, icon }: any) {
  const colorClasses = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-400"
  };

  return (
    <div className={`${colorClasses[color]} border-2 rounded-xl p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-4xl font-bold text-white">{value}</p>
        </div>
        <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Section({ title, data, icon, color }: any) {
  const colorClasses = {
    blue: "border-blue-500/30 bg-blue-500/5",
    purple: "border-purple-500/30 bg-purple-500/5"
  };

  return (
    <div className={`bg-[#07121a] p-6 rounded-xl border-2 ${colorClasses[color]} mb-6 shadow-xl`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
        <span className="text-3xl">{icon}</span>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      
      {/* AI Analysis */}
      <div className="bg-[#0f1724] p-5 rounded-lg mb-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-400">AI Analysis</h3>
        </div>
        <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
          {data?.analysis || "No analysis available"}
        </div>
      </div>

      {/* Statistics Grid */}
      {data?.machine_stats && Object.keys(data.machine_stats).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Machines */}
          <div className="bg-[#0f1724] p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Top Affected Machines
            </h4>
            <div className="space-y-2">
              {Object.entries(data.machine_stats)
                .sort(([,a]: any, [,b]: any) => b - a)
                .slice(0, 5)
                .map(([machine, count]: any) => (
                  <div key={machine} className="flex justify-between items-center py-2 border-b border-gray-800/50">
                    <span className="text-gray-300">{machine}</span>
                    <span className="bg-red-600/20 text-red-400 px-3 py-1 rounded-full text-sm font-semibold">
                      {count} incidents
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Causes */}
          <div className="bg-[#0f1724] p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Top Root Causes
            </h4>
            <div className="space-y-2">
              {Object.entries(data.cause_stats)
                .sort(([,a]: any, [,b]: any) => b - a)
                .slice(0, 5)
                .map(([cause, count]: any) => (
                  <div key={cause} className="flex justify-between items-center py-2 border-b border-gray-800/50">
                    <span className="text-gray-300">{cause}</span>
                    <span className="bg-orange-600/20 text-orange-400 px-3 py-1 rounded-full text-sm font-semibold">
                      {count} times
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}