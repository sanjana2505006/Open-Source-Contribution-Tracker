import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';

export function Layout() {
  return (
    <div className="layout-full">
      <AppHeader />
      <Outlet />
    </div>
  );
}
