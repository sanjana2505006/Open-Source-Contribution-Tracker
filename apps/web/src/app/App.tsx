import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { Layout } from './Layout';
import { OverviewPage } from '../pages/OverviewPage';
import { ExplorePage } from '../pages/ExplorePage';
import { RepositoriesPage } from '../pages/RepositoriesPage';
import { JourneyPage } from '../pages/JourneyPage';

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
              <Route path="journey" element={<JourneyPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
