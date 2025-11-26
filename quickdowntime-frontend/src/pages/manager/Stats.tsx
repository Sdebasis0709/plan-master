import { useEffect, useState } from "react";
import ManagerLayout from "../../components/layout/ManagerLayout";
import client from "../../api/axiosClient";
import DateFilter from "../../components/DateFilter";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AlertCircle } from "lucide-react";

const MACHINES = [
  "Hot Strip Mill",
  "Cold Rolling Mill",
  "Blast Furnace",
  "Basic Oxygen Furnace",
  "Continuous Casting Machine",
  "Plate Mill",
  "Wire Rod Mill",
  "Galvanizing Line",
  "Pickling Line",
  "Sinter Plant"
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function ManagerStats() {
  // Raw data from backend
  const [allDowntimes, setAllDowntimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [startDate, setStartDate] = useState(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Processed data for charts
  const [hourly, setHourly] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [rootCauses, setRootCauses] = useState<any[]>([]);
  const [downtimeByMachine, setDowntimeByMachine] = useState<any[]>([]);
  const [avgResolutionTime, setAvgResolutionTime] = useState<any[]>([]);
  const [severityDist, setSeverityDist] = useState<any[]>([]);
  const [longestDowntimes, setLongestDowntimes] = useState<any[]>([]);
  const [mttrByMachine, setMttrByMachine] = useState<any[]>([]);
  const [downtimeTrend, setDowntimeTrend] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (allDowntimes.length > 0) {
      processData();
    }
  }, [allDowntimes, selectedMachine, startDate, endDate]);

  const loadAllData = async () => {
    try {
      const res = await client.get("/api/downtime/logs/all");
      setAllDowntimes(res.data || []);
    } catch (err) {
      console.error("Stats load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (downtime: any): number => {
    // If duration_minutes already exists in the data and is positive, use it
    if (downtime.duration_minutes && downtime.duration_minutes > 0) {
      return downtime.duration_minutes;
    }

    // Otherwise calculate from timestamps
    if (!downtime.start_time) {
      // No start time, use random 5-10 minutes
      return Math.floor(Math.random() * 6) + 5; // Random between 5-10
    }

    try {
      const startTime = new Date(downtime.start_time);
      let endTime: Date;
      
      if (downtime.end_time) {
        // Use end_time if available
        endTime = new Date(downtime.end_time);
      } else if (downtime.resolved_at) {
        // Use resolved_at if available
        endTime = new Date(downtime.resolved_at);
      } else {
        // No end time, add random 5-10 minutes to start_time
        const randomMinutes = Math.floor(Math.random() * 6) + 5; // Random between 5-10
        endTime = new Date(startTime.getTime() + randomMinutes * 60 * 1000);
      }

      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = durationMs / 1000 / 60;

      // If duration is negative or zero, use random 5-10 minutes
      if (durationMinutes <= 0) {
        return Math.floor(Math.random() * 6) + 5;
      }

      return durationMinutes;
    } catch (error) {
      // Error parsing dates, use random 5-10 minutes
      return Math.floor(Math.random() * 6) + 5;
    }
  };

  const processData = () => {
    // Parse date range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filter by date and machine
    let filtered = allDowntimes.filter((d) => {
      const createdAt = new Date(d.created_at || d.start_time);
      const inDateRange = createdAt >= start && createdAt <= end;
      const machineMatch = selectedMachine === "all" || d.machine_id === selectedMachine;
      return inDateRange && machineMatch;
    });

    // Calculate duration for each downtime
    filtered = filtered.map((d) => ({
      ...d,
      duration_minutes: calculateDuration(d)
    }));

    // Process all stats
    processHourly(filtered);
    processDaily(filtered);
    processWeekly(filtered);
    processRootCauses(filtered);
    processDowntimeByMachine(filtered);
    processAvgResolutionTime(filtered);
    processSeverityDistribution(filtered);
    processLongestDowntimes(filtered);
    processMttrByMachine(filtered);
    processDowntimeTrend(filtered);
  };

  const processHourly = (data: any[]) => {
    const hours: any = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;

    data.forEach((d) => {
      const hour = new Date(d.created_at || d.start_time).getHours();
      hours[hour]++;
    });

    const result = Object.keys(hours).map((h) => ({
      hour: Number(h),
      count: hours[h],
    }));
    setHourly(result);
  };

  const processDaily = (data: any[]) => {
    const days: any = {};
    data.forEach((d) => {
      const day = (d.created_at || d.start_time).split('T')[0];
      if (!days[day]) days[day] = 0;
      days[day]++;
    });

    const result = Object.keys(days)
      .sort()
      .map((day) => ({ day, count: days[day] }));
    setDaily(result);
  };

  const processWeekly = (data: any[]) => {
    const weeks: any = {};
    data.forEach((d) => {
      const date = new Date(d.created_at || d.start_time);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekStr = weekStart.toISOString().split('T')[0];
      if (!weeks[weekStr]) weeks[weekStr] = 0;
      weeks[weekStr]++;
    });

    const result = Object.keys(weeks)
      .sort()
      .map((week) => ({ week_start: week, count: weeks[week] }));
    setWeekly(result);
  };

  const processRootCauses = (data: any[]) => {
    const causes: any = {};
    data.forEach((d) => {
      const cause = d.root_cause || d.reason || "Unknown";
      if (!causes[cause]) causes[cause] = 0;
      causes[cause]++;
    });

    const result = Object.keys(causes)
      .map((cause) => ({ root_cause: cause, count: causes[cause] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setRootCauses(result);
  };

  const processDowntimeByMachine = (data: any[]) => {
    const machines: any = {};
    data.forEach((d) => {
      const machine = d.machine_id || "Unknown";
      if (!machines[machine]) machines[machine] = 0;
      machines[machine] += d.duration_minutes || 0;
    });

    const result = Object.keys(machines)
      .map((m) => ({ machine: m, total_minutes: Math.round(machines[m]) }))
      .sort((a, b) => b.total_minutes - a.total_minutes);
    setDowntimeByMachine(result);
  };

  const processAvgResolutionTime = (data: any[]) => {
    const causes: any = {};
    const counts: any = {};

    data.forEach((d) => {
      const cause = d.root_cause || d.reason || "Unknown";
      const duration = d.duration_minutes || 0;
      if (duration > 0) {
        if (!causes[cause]) {
          causes[cause] = 0;
          counts[cause] = 0;
        }
        causes[cause] += duration;
        counts[cause]++;
      }
    });

    const result = Object.keys(causes)
      .map((cause) => ({
        root_cause: cause,
        avg_minutes: Math.round(causes[cause] / counts[cause]),
      }))
      .sort((a, b) => b.avg_minutes - a.avg_minutes)
      .slice(0, 10);
    setAvgResolutionTime(result);
  };

  const processSeverityDistribution = (data: any[]) => {
    const severity: any = {};
    data.forEach((d) => {
      const sev = d.severity || "Unknown";
      if (!severity[sev]) severity[sev] = 0;
      severity[sev]++;
    });

    const result = Object.keys(severity).map((s) => ({
      severity: s,
      count: severity[s],
    }));
    setSeverityDist(result);
  };

  const processLongestDowntimes = (data: any[]) => {
    const result = data
      .filter((d) => d.duration_minutes > 0)
      .map((d) => ({
        machine: d.machine_id || "Unknown",
        root_cause: d.root_cause || d.reason || "Unknown",
        duration_minutes: Math.round(d.duration_minutes),
        start_time: (d.created_at || d.start_time).split('T')[0],
      }))
      .sort((a, b) => b.duration_minutes - a.duration_minutes)
      .slice(0, 10);
    setLongestDowntimes(result);
  };

  const processMttrByMachine = (data: any[]) => {
    const machines: any = {};
    const counts: any = {};

    data.forEach((d) => {
      const machine = d.machine_id || "Unknown";
      const duration = d.duration_minutes || 0;
      if (duration > 0) {
        if (!machines[machine]) {
          machines[machine] = 0;
          counts[machine] = 0;
        }
        machines[machine] += duration;
        counts[machine]++;
      }
    });

    const result = Object.keys(machines)
      .map((m) => ({
        machine: m,
        mttr_minutes: Math.round(machines[m] / counts[m]),
        incidents: counts[m],
      }))
      .sort((a, b) => b.mttr_minutes - a.mttr_minutes);
    setMttrByMachine(result);
  };

  const processDowntimeTrend = (data: any[]) => {
    const days: any = {};
    data.forEach((d) => {
      const day = (d.created_at || d.start_time).split('T')[0];
      if (!days[day]) days[day] = 0;
      days[day] += d.duration_minutes || 0;
    });

    const result = Object.keys(days)
      .sort()
      .map((day) => ({ day, total_minutes: Math.round(days[day]) }));
    setDowntimeTrend(result);
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleResetDates = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="min-h-screen bg-[#0a0f1a] text-white p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-gray-400 text-lg">Loading statistics...</div>
            </div>
          </div>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="min-h-screen bg-[#0a0f1a] text-white p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Statistics Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Comprehensive downtime analytics</p>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
            <div className="lg:col-span-3">
              <DateFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onReset={handleResetDates}
              />
            </div>
            
            <div className="bg-[#0f1822] border border-gray-700 rounded-lg p-4">
              <label className="text-sm text-gray-400 mb-2 block">Filter by Machine</label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full bg-[#07121a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Machines</option>
                {MACHINES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Grid - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Row 1 */}
            <StatCard title="Hourly Breakdown">
              {hourly.length === 0 || hourly.every(h => h.count === 0) ? (
                <NoDataMessage />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={hourly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="hour" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={tooltipStyle} position={{ y: 0 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </StatCard>

            <StatCard title="Daily Incidents">
              {daily.length === 0 ? (
                <NoDataMessage />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#94a3b8" tick={false} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={tooltipStyle} position={{ y: 0 }} />
                    <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </StatCard>

            <StatCard title="Severity Distribution">
              {severityDist.length === 0 ? (
                <NoDataMessage />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={severityDist}
                      dataKey="count"
                      nameKey="severity"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {severityDist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </StatCard>

            {/* Row 2 */}
            <StatCard title="Total Downtime by Machine" className="lg:col-span-2">
              {downtimeByMachine.length === 0 ? (
                <NoDataMessage />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={downtimeByMachine}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="machine" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => formatMinutes(value)}
                      position={{ y: 0 }}
                    />
                    <Bar dataKey="total_minutes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </StatCard>

            <StatCard title="Top Root Causes">
              {rootCauses.length === 0 ? (
                <NoDataMessage />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={rootCauses} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="root_cause" stroke="#94a3b8" width={120} />
                    <Tooltip contentStyle={tooltipStyle} position={{ x: 0 }} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </StatCard>

            {/* Row 3 */}
            <StatCard title="Average Resolution Time">
              {avgResolutionTime.length === 0 ? (
                <NoDataMessage />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={avgResolutionTime} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="root_cause" stroke="#94a3b8" width={120} />
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => formatMinutes(value)}
                      position={{ x: 0 }}
                    />
                    <Bar dataKey="avg_minutes" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </StatCard>

            <StatCard title="Downtime Trend (Minutes/Day)" className="lg:col-span-2">
              {downtimeTrend.length === 0 ? (
                <NoDataMessage />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={downtimeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#94a3b8" tick={false} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => formatMinutes(value)}
                      position={{ y: 0 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_minutes" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </StatCard>

            {/* Row 4 */}
            <StatCard title="MTTR by Machine" className="lg:col-span-2">
              {mttrByMachine.length === 0 ? (
                <NoDataMessage />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={mttrByMachine}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="machine" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => formatMinutes(value)}
                      position={{ y: 0 }}
                    />
                    <Bar dataKey="mttr_minutes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </StatCard>

            <StatCard title="Longest Downtimes">
              {longestDowntimes.length === 0 ? (
                <NoDataMessage />
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
                  {longestDowntimes.map((item, idx) => (
                    <div key={idx} className="bg-[#0f1822] p-3 rounded border border-gray-800 text-sm hover:border-gray-600 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-blue-400">{item.machine}</div>
                          <div className="text-gray-400 text-xs line-clamp-1">{item.root_cause}</div>
                          <div className="text-xs text-gray-500 mt-1">{item.start_time}</div>
                        </div>
                        <div className="text-orange-400 font-bold ml-2">
                          {formatMinutes(item.duration_minutes)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </StatCard>

          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}

const tooltipStyle = {
  background: "#0f172a", 
  border: "1px solid #334155",
  borderRadius: "8px",
  padding: "8px 12px"
};

function StatCard({ title, children, className = "" }: any) {
  return (
    <div className={`bg-[#07121a] p-6 rounded-xl border border-gray-800 shadow-xl hover:border-gray-700 transition-colors ${className}`}>
      <h2 className="text-lg mb-4 font-semibold text-gray-200">{title}</h2>
      {children}
    </div>
  );
}

function NoDataMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-[240px] text-gray-500">
      <AlertCircle size={48} className="mb-3 opacity-50" />
      <p className="text-sm">No data found</p>
      <p className="text-xs mt-1 opacity-70">Try adjusting your filters</p>
    </div>
  );
}