import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { Layout } from './Layout';
import { OverviewPage } from '../pages/OverviewPage';
import { ExplorePage } from '../pages/ExplorePage';
import { RepositoriesPage } from '../pages/RepositoriesPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="repos" element={<RepositoriesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
