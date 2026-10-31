import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { FarmerProvider } from './context/FarmerContext';
import { LanguageProvider } from './i18n/LanguageContext';
import DashboardPage from './pages/DashboardPage';
import FarmerDetailsPage from './pages/FarmerDetailsPage';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <LanguageProvider>
      <FarmerProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/details" element={<FarmerDetailsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FarmerProvider>
    </LanguageProvider>
  );
}
