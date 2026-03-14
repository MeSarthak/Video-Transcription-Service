import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar placeholder */}
      <header className="flex h-16 items-center border-b border-gray-800 px-6">
        <h1 className="text-xl font-bold">VideoTube</h1>
      </header>

      <div className="flex flex-1">
        {/* Sidebar placeholder */}
        <aside className="hidden w-60 border-r border-gray-800 p-4 md:block">
          <nav className="space-y-2 text-sm text-gray-400">
            <p>Home</p>
            <p>Subscriptions</p>
            <p>Library</p>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
