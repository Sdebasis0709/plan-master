import { Calendar } from "lucide-react";

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onReset?: () => void;
}

export default function DateFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset
}: DateFilterProps) {
  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onStartDateChange(today);
    onEndDateChange(today);
  };

  const setLast7Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(end.toISOString().split('T')[0]);
  };

  const setLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(end.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(end.toISOString().split('T')[0]);
  };

  return (
    <div className="bg-[#0f1822] border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={18} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-200">Date Filter</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full bg-[#07121a] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full bg-[#07121a] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={setToday}
          className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-700/50 transition"
        >
          Today
        </button>
        <button
          onClick={setLast7Days}
          className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-700/50 transition"
        >
          Last 7 Days
        </button>
        <button
          onClick={setLast30Days}
          className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-700/50 transition"
        >
          Last 30 Days
        </button>
        <button
          onClick={setThisMonth}
          className="text-xs px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-700/50 transition"
        >
          This Month
        </button>
        {onReset && (
          <button
            onClick={onReset}
            className="text-xs px-3 py-1.5 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 rounded border border-gray-700/50 transition"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}