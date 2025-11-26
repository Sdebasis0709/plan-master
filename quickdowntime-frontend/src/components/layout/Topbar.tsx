import React from "react";

type Props = {
  onToggleSidebar?: () => void;
};

export default function Topbar({ onToggleSidebar }: Props) {
  const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") || "Manager" : "Manager";

  return (
    <header className="w-full bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
      <div className="max-w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
              aria-label="Toggle sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <div className="text-sm font-semibold">Manager Portal</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">Signed in as</div>
              <div className="text-sm font-medium">{userName}</div>
            </div>

            <button
              title="Notifications"
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.6 14.6V11a6 6 0 10-12 0v3.6c0 .538-.214 1.055-.595 1.445L4 17h11z" />
              </svg>
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

            <div className="flex items-center gap-2">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName || "M")}&background=0D8ABC&color=fff&size=64`}
                alt="avatar"
                className="w-8 h-8 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
