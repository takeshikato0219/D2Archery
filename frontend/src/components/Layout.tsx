import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Target, Users, Trophy, MessageCircle } from 'lucide-react';

export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/scoring', icon: Target, label: t('nav.scoring', '点数入力') },
    { path: '/team', icon: Users, label: 'チーム' },
    { path: '/ranking', icon: Trophy, label: t('nav.ranking') },
    { path: '/coaches/1', icon: MessageCircle, label: 'AIコーチ' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Check if we're on a chat page (needs full height, no padding)
  const isChatPage = location.pathname.startsWith('/coaches/');

  return (
    <div className="min-h-screen flex flex-col">
      <main className={`flex-1 safe-area-top ${isChatPage ? '' : 'pb-20'}`}>
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={`nav-item ${isActive(path) ? 'active' : ''}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
