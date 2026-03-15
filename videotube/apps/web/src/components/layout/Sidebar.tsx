import { Link, useLocation } from "react-router-dom";
import { Home, Flame, Clock, PlaySquare, History, ThumbsUp, Folder, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

function NavLink({
  icon: Icon,
  label,
  path,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={path}
      onClick={onClick}
      className="relative flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {/* Sliding active background */}
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-lg bg-gray-100 dark:bg-gray-700"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      <Icon
        className={`relative w-5 h-5 z-10 transition-colors duration-150 ${
          active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-300"
        }`}
      />
      <span
        className={`relative z-10 text-[15px] text-gray-800 dark:text-gray-200 ${
          active ? "font-medium" : ""
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const location = useLocation();
  const isCurrent = (path: string) => location.pathname === path;

  const links = (
    <div className="flex flex-col px-3 gap-1">
      {mainLinks.map((link) => (
        <NavLink
          key={link.path}
          icon={link.icon}
          label={link.label}
          path={link.path}
          active={isCurrent(link.path)}
          onClick={onClose}
        />
      ))}

      <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

      <h3 className="px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
        Library
      </h3>

      {libraryLinks.map((link) => (
        <NavLink
          key={link.path}
          icon={link.icon}
          label={link.label}
          path={link.path}
          active={isCurrent(link.path)}
          onClick={onClose}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="fixed left-0 top-16 z-40 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 pt-4 overflow-y-auto dark:bg-gray-800 dark:border-gray-700 hidden lg:block">
        {links}
      </aside>

      {/* Mobile drawer — animated */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              className="fixed left-0 top-0 z-50 w-64 h-full bg-white dark:bg-gray-800 pt-4 overflow-y-auto shadow-xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
            >
              <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-800 dark:text-white">Menu</span>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 active:scale-90"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              {links}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
