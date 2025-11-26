import { useEffect, useState } from "react";

export default function Toast() {
  const [msg, setMsg] = useState<any>(null);

  useEffect(() => {
    function handler(e: any) {
      setMsg(e.detail);
      setTimeout(() => setMsg(null), 4500);
    }
    window.addEventListener("qd-toast", handler);
    return () => window.removeEventListener("qd-toast", handler);
  }, []);

  if (!msg) return null;

  return (
    <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded shadow-xl animate-pulse">
      <div className="font-bold">{msg.title}</div>
      <div className="text-sm">{msg.body}</div>
    </div>
  );
}
