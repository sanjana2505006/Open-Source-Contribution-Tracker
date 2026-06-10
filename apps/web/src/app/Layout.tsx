import { Outlet } from 'react-router-dom';
import { AppFooter } from '../components/AppFooter';
import { AppHeader } from '../components/AppHeader';

export function Layout() {
  return (
    <div className="layout-full">
      <AppHeader />
      <Outlet />
      <AppFooter />
    </div>
  );
}
