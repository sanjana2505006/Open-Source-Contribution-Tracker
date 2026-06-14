import { Outlet } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { AccentCursor } from '../components/AccentCursor';

export function Layout() {
  return (
    <div className="layout-full">
      <AccentCursor />
      <AppHeader />
      <Outlet />
      <AppFooter />
    </div>
  );
}
