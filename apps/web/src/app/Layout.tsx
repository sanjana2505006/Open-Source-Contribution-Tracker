import { Outlet } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { GlitterTrail } from '../components/GlitterTrail';
import { AccentCursor } from '../components/AccentCursor';

export function Layout() {
  return (
    <div className="layout-full">
      <GlitterTrail />
      <AccentCursor />
      <AppHeader />
      <Outlet />
      <AppFooter />
    </div>
  );
}
