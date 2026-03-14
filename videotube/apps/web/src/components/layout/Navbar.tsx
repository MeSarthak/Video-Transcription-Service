import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, Upload, Bell, UserCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchInput.trim();
    if (q) navigate(`/?q=${encodeURIComponent(q)}`);
    else navigate("/");
  }

  return (
    <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 h-16 flex items-center justify-between px-3 lg:px-5">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 15l5.19-3L10 9v6zM21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
          </svg>
          <span className="text-xl font-bold tracking-tighter dark:text-white">VideoTube</span>
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-2xl mx-10 hidden sm:flex items-center"
      >
        <div className="flex w-full">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search"
            className="w-full px-4 py-2 border border-gray-300 rounded-l-full focus:outline-none focus:border-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-full hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-700"
          >
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile search */}
        <button className="p-2 sm:hidden hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
          <Search className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Upload */}
        {isAuthenticated && (
          <Link
            to="/upload"
            className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700"
            title="Upload video"
          >
            <Upload className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
        )}

        {/* Notifications */}
        <button className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
          <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>

        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 ml-1">
            <Link to={`/channel/${user.username}`}>
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.fullname} className="w-full h-full object-cover" />
                ) : (
                  user.fullname.charAt(0).toUpperCase()
                )}
              </div>
            </Link>
            <button
              onClick={() => logout()}
              className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 ml-1 px-3 py-1.5 border border-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600"
          >
            <UserCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Sign in</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
