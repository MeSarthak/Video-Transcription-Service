import { Link, useLocation } from "react-router-dom";
import { Home, Flame, Clock, PlaySquare, History, ThumbsUp, Folder, X } from "lucide-react";

const mainLinks = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Flame, label: "Trending", path: "/trending" },
  { icon: PlaySquare, label: "Subscriptions", path: "/subscriptions" },
];

const libraryLinks = [
  { icon: Folder, label: "Library", path: "/library" },
  { icon: History, label: "History", path: "/history" },
  { icon: Clock, label: "Watch later", path: "/watch-later" },
  { icon: ThumbsUp, label: "Liked videos", path: "/liked" },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const location = useLocation();

  const isCurrent = (path: string) => location.pathname === path;

  const links = (
    <div className="flex flex-col px-3 gap-2">
      {mainLinks.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          onClick={onClose}
          className={`flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isCurrent(link.path) ? "bg-gray-100 font-medium dark:bg-gray-700" : ""
          }`}
        >
          <link.icon className={`w-5 h-5 ${isCurrent(link.path) ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-300"}`} />
          <span className="text-[15px] text-gray-800 dark:text-gray-200">{link.label}</span>
        </Link>
      ))}

      <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

      <h3 className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Library</h3>

      {libraryLinks.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          onClick={onClose}
          className={`flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isCurrent(link.path) ? "bg-gray-100 font-medium dark:bg-gray-700" : ""
          }`}
        >
          <link.icon className={`w-5 h-5 ${isCurrent(link.path) ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-300"}`} />
          <span className="text-[15px] text-gray-800 dark:text-gray-200">{link.label}</span>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="fixed left-0 top-16 z-40 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 pt-4 overflow-y-auto dark:bg-gray-800 dark:border-gray-700 hidden lg:block">
        {links}
      </aside>

      {/* Mobile drawer — controlled by open prop */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 z-50 w-64 h-full bg-white dark:bg-gray-800 pt-4 overflow-y-auto shadow-xl lg:hidden">
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-800 dark:text-white">Menu</span>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            {links}
          </aside>
        </>
      )}
    </>
  );
}
