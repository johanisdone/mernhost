import { ArrowUpRight, CheckCircle2, LayoutGrid, LoaderCircle, LogOut, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useJournal } from '../context/JournalContext';

export function Wordmark() {
  return <span className="wordmark"><span className="wordmark-icon"><ArrowUpRight size={23} strokeWidth={2.2} /></span><span>next<span>step</span><i>.</i></span></span>;
}

export default function Frame() {
  const { notice, notify, options, user, signOut } = useJournal();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setLeaving(true); setError('');
    try { await signOut(); } catch (problem) { setError(problem.message); }
    finally { setLeaving(false); }
  }
  return <>
    <a className="skip-to-main" href="#journal-content">Skip to content</a>
    <header className="site-header"><div className="shell-width header-inner">
      <Link to="/" aria-label="NextStep home"><Wordmark /></Link>
      <nav aria-label="Journal navigation"><NavLink end to="/"><LayoutGrid size={16} />Workspace</NavLink><NavLink to="/applications/new"><Plus size={16} />New application</NavLink></nav>
      <div className="account-controls"><span className="account-monogram" aria-hidden="true">{user.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><span className="account-name" title={user.name}>{user.name}</span><button className="signout-button" onClick={logout} disabled={leaving}>{leaving ? <LoaderCircle className="turning" size={15} /> : <LogOut size={15} />}Sign out</button></div>
    </div></header>
    <main id="journal-content" className="shell-width main-area">{error && <div className="problem-banner" role="alert">{error}</div>}<Outlet /></main>
    <footer className="site-footer shell-width"><span>NextStep · A thoughtful place for your next move.</span><span>Dates follow {options.timeZone.replace('_', ' ')}.</span></footer>
    {notice && <div className="saved-notice" role="status"><CheckCircle2 size={19} /><span>{notice}</span><button aria-label="Dismiss message" onClick={() => notify('')}><X size={16} /></button></div>}
  </>;
}
