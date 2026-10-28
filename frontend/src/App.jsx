import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useJournal } from './context/JournalContext';
import Frame, { Wordmark } from './components/Frame';
import { Trouble, Waiting } from './components/Shared';
import Workspace from './pages/Workspace';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationDetails from './pages/ApplicationDetails';
import AccountPage from './pages/AccountPage';

function PrivateJournal() {
  const { user } = useJournal();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { ready, user, bootError, retryBoot } = useJournal();
  if (!ready) return <div className="opening-screen"><Wordmark />{bootError ? <Trouble message={bootError} retry={retryBoot} /> : <Waiting />}</div>;
  return <Routes><Route path="/login" element={<AccountPage key="login" />} /><Route path="/register" element={<AccountPage key="register" registering />} /><Route element={<PrivateJournal />}><Route element={<Frame key={user?.id} />}><Route index element={<Workspace />} /><Route path="applications/new" element={<ApplicationForm key="create" />} /><Route path="applications/:id" element={<ApplicationDetails />} /><Route path="applications/:id/edit" element={<ApplicationForm key="edit" />} /></Route></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
