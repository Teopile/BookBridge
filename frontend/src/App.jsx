import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Schools from './pages/Schools.jsx';
import SchoolDetail from './pages/SchoolDetail.jsx';
import Donate from './pages/Donate.jsx';
import DonateMoney from './pages/DonateMoney.jsx';
import Dashboard from './pages/Dashboard.jsx';
import About from './pages/About.jsx';
import Search from './pages/Search.jsx';
import Track from './pages/Track.jsx';
import Auth from './pages/Auth.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Account from './pages/Account.jsx';
import SchoolManage from './pages/SchoolManage.jsx';
import VolunteerManage from './pages/VolunteerManage.jsx';
import NotFound from './pages/NotFound.jsx';

function LangGuard({ children }) {
  const location = useLocation();
  const seg = location.pathname.split('/').filter(Boolean)[0];
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
        <Routes>
          <Route path="/" element={<Navigate to="/en" replace />} />
          <Route path="/:lang/*" element={<LangGuard><LocalizedRoutes /></LangGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function LocalizedRoutes() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="how-it-works" element={<HowItWorks />} />
      <Route path="schools" element={<Schools />} />
      <Route path="schools/:id" element={<SchoolDetail />} />
      <Route path="volunteer-schools" element={<Schools type="volunteer" />} />
      <Route path="donate/*" element={<Donate />} />
      <Route path="donate-money" element={<DonateMoney />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="about" element={<About />} />
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
  );
}
