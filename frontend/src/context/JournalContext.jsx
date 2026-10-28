import { createContext, useContext, useEffect, useState } from 'react';
import { journalApi } from '../services/journalApi';

const JournalContext = createContext(null);

export function JournalProvider({ children }) {
  const [options, setOptions] = useState(null);
  const [bootError, setBootError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');
  useEffect(() => {
    const cancellation = new AbortController();
    setBootError('');
    setReady(false);
    const session = journalApi('/auth/me', { signal: cancellation.signal }).catch(error => {
      if (error.status === 401) return null;
      throw error;
    });
    Promise.all([journalApi('/applications/options', { signal: cancellation.signal }), session])
      .then(([settings, account]) => { setOptions(settings); setUser(account); setReady(true); })
      .catch(error => { if (error.name !== 'AbortError') setBootError(error.message); });
    return () => cancellation.abort();
  }, [attempt]);
  useEffect(() => {
    const expired = () => { setUser(null); setNotice(''); setSessionMessage('Your session has ended. Sign in again to continue.'); };
    window.addEventListener('nextstep-session-ended', expired);
    return () => window.removeEventListener('nextstep-session-ended', expired);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const expiry = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(expiry);
  }, [notice]);
  async function openAccount(mode, values) {
    const account = await journalApi(`/auth/${mode}`, { method: 'POST', payload: values });
    setSessionMessage(''); setNotice(''); setUser(account);
  }
  async function signOut() {
    await journalApi('/auth/logout', { method: 'POST' });
    setUser(null); setNotice(''); setSessionMessage('');
  }
  return <JournalContext.Provider value={{ options, bootError, retryBoot: () => setAttempt(v => v + 1), notice, notify: setNotice, user, ready, sessionMessage, openAccount, signOut }}>{children}</JournalContext.Provider>;
}

export const useJournal = () => useContext(JournalContext);
