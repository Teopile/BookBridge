import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import CookieConsent from './components/CookieConsent.jsx';
import { useDocumentTitle } from './hooks/useDocumentTitle.js';

// Eager-loaded — public landing surface, first visit hits one of these.
import Home from './pages/Home.jsx';
import Schools from './pages/Schools.jsx';
import Donate from './pages/Donate.jsx';

// Lazy-loaded — secondary public pages.
const HowItWorks    = lazy(() => import('./pages/HowItWorks.jsx'));
const SchoolDetail  = lazy(() => import('./pages/SchoolDetail.jsx'));
const Dashboard     = lazy(() => import('./pages/Dashboard.jsx'));
const About         = lazy(() => import('./pages/About.jsx'));
const Search        = lazy(() => import('./pages/Search.jsx'));
const Track         = lazy(() => import('./pages/Track.jsx'));

// Lazy-loaded — legal / compliance pages.
const Privacy       = lazy(() => import('./pages/Privacy.jsx'));
const Terms         = lazy(() => import('./pages/Terms.jsx'));
const Cookies       = lazy(() => import('./pages/Cookies.jsx'));

// Lazy-loaded — authed surface.
const Auth            = lazy(() => import('./pages/Auth.jsx'));
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword   = lazy(() => import('./pages/ResetPassword.jsx'));
const Account         = lazy(() => import('./pages/Account.jsx'));
const SchoolManage    = lazy(() => import('./pages/SchoolManage.jsx'));
const VolunteerManage = lazy(() => import('./pages/VolunteerManage.jsx'));
const NotFound        = lazy(() => import('./pages/NotFound.jsx'));

function RouteFallback() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="skeleton skeleton-banner" />
        <div className="skeleton skeleton-line" style={{ width: '60%' }} />
        <div className="skeleton skeleton-line" style={{ width: '80%' }} />
        <div className="skeleton skeleton-line" style={{ width: '40%' }} />
      </div>
    </section>
  );
}

function LangGuard({ children }) {
  const location = useLocation();
  const seg = location.pathname.split('/').filter(Boolean)[0];
  useDocumentTitle();
  useEffect(() => {
    if (seg === 'en' || seg === 'ka') document.documentElement.lang = seg;
  }, [seg]);
  if (seg !== 'en' && seg !== 'ka') {
    return <Navigate to={'/en' + location.pathname + location.search} replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/en" replace />} />
              <Route path="/:lang/*" element={<LangGuard><LocalizedRoutes /></LangGuard>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <CookieConsent />
    </>
  );
}

function LocalizedRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route index element={<Home />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="schools" element={<Schools />} />
        <Route path="schools/:id" element={<SchoolDetail />} />
        <Route path="volunteer-schools" element={<Schools type="volunteer" />} />
        <Route path="donate/*" element={<Donate />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="about" element={<About />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="cookies" element={<Cookies />} />
        <Route path="search" element={<Search />} />
        <Route path="track/:token" element={<Track />} />
        <Route path="auth" element={<Auth />} />
        <Route path="auth/forgot" element={<ForgotPassword />} />
        <Route path="auth/reset-password" element={<ResetPassword />} />
        <Route path="account" element={<Account />} />
        <Route path="school/manage" element={<SchoolManage />} />
        <Route path="volunteer/manage" element={<VolunteerManage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
