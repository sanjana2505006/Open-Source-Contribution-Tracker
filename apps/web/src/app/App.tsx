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
import { PrivacyPage } from '../pages/PrivacyPage';
import { SecurityPage } from '../pages/SecurityPage';
import { FeedbackPage } from '../pages/FeedbackPage';
import { PortfolioPage } from '../pages/PortfolioPage';
import { RepoPage } from '../pages/RepoPage';
import { DigestPage } from '../pages/DigestPage';
import { DiscoverPage } from '../pages/DiscoverPage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<OverviewPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="discover" element={<DiscoverPage />} />
              <Route path="u/:username" element={<PortfolioPage />} />
              <Route path="repos" element={<RepositoriesPage />} />
              <Route path="repo/:owner/:name" element={<RepoPage />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="digest" element={<DigestPage />} />
              <Route path="journey" element={<JourneyPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="feedback" element={<FeedbackPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
