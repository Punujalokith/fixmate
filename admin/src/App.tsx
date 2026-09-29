import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth } from './lib/auth';
import { AiUsagePage } from './pages/AiUsage';
import { AuditPage } from './pages/Audit';
import { BookingsPage } from './pages/Bookings';
import { CategoriesPage } from './pages/Categories';
import { LoginPage } from './pages/Login';
import { OverviewPage } from './pages/Overview';
import { ProvidersPage } from './pages/Providers';
import { ReviewsPage } from './pages/Reviews';
import { UsersPage } from './pages/Users';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="ai" element={<AiUsagePage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
