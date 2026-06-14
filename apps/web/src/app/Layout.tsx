import { Outlet } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';
import { GlitterTrail } from '../components/GlitterTrail';

export function Layout() {
  return (
    <div className="layout-full">
      <GlitterTrail />
      <AppHeader />
      <Outlet />
      <AppFooter />
    </div>
  );
}
