import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { Layout } from './Layout';
import { OverviewPage } from '../pages/OverviewPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
