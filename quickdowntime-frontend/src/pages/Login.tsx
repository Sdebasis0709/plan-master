// src/pages/Login.tsx
import React, { useState } from "react";
import client from "../api/axiosClient";
import { useAuth } from "../store/authStore";
import jwtDecode from "jwt-decode";

export default function Login() {
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    try {
        const r = await client.post("/auth/login", { email, password });
        console.log("✔️ Response:", r.data);

        const token = r.data.access_token;
        setToken(token);
        console.log("✔️ Token saved");

        const payload: any = jwtDecode(token);
        console.log("✔️ Decoded:", payload);

        if (payload.role === "manager") {
          window.location.href = "/manager";
        } else {
          window.location.href = "/operator";
        }

    } catch (e: any) {
        console.log("❌ ERROR:", e);
        setErr(e?.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0a1322] to-[#0f1a2e]">

      {/* ---------------- LEFT PANEL ---------------- */}
      <div className="hidden lg:flex w-2/5 relative overflow-hidden">
        <img
          src="/planmasters-logo.png"
          className="w-full h-full object-cover"
          alt="PlanMasters Logo"
        />
      </div>

      {/* ---------------- RIGHT PANEL ---------------- */}
      <div className="flex w-full lg:w-3/5 items-center justify-center p-6 md:p-12 bg-[#0f1724]">

        <form
          onSubmit={submit}
          className="bg-[#07121a] w-full max-w-xl p-10 md:p-12 rounded-2xl shadow-2xl border border-gray-800/50 backdrop-blur-sm"
        >
          <div className="mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Welcome Back
            </h2>

            <p className="text-gray-400 text-base md:text-lg">
              Login to access your dashboard and manage uptime
            </p>
          </div>

          {err && (
            <div className="bg-red-600/90 backdrop-blur-sm text-white p-4 mb-6 rounded-lg border border-red-500/50 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <span>{err}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="w-full p-4 rounded-xl bg-[#0f1724] text-white border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="w-full p-4 rounded-xl bg-[#0f1724] text-white border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder-gray-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 mb-8">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-700 bg-[#0f1724] text-blue-600 focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                Remember me
              </span>
            </label>

            <button 
              type="button"
              onClick={() => console.log('Forgot password clicked')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all text-white py-4 rounded-xl font-semibold text-lg shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transform hover:-translate-y-0.5"
          >
            Sign In
          </button>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <button 
                type="button"
                onClick={() => console.log('Contact admin clicked')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Contact Administrator
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}