import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { Layout } from './Layout';
import { OverviewPage } from '../pages/OverviewPage';
import { ExplorePage } from '../pages/ExplorePage';
import { RepositoriesPage } from '../pages/RepositoriesPage';
import { IssuesPage } from '../pages/IssuesPage';
import { JourneyPage } from '../pages/JourneyPage';
import { AdminPage } from '../pages/AdminPage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<OverviewPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="repos" element={<RepositoriesPage />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="journey" element={<JourneyPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
