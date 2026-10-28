import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, FolderLock, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import { Wordmark } from '../components/Frame';
import { FieldGroup } from '../components/Shared';

export default function AccountPage({ registering = false }) {
  const { user, sessionMessage, openAccount } = useJournal();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const change = event => setValues(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const props = name => ({ id: name, name, value: values[name], onChange: change, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined });

  async function submit(event) {
    event.preventDefault(); setProblem('');
    const issues = {};
    if (registering && values.name.trim().length < 2) issues.name = 'Enter your name using at least two characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) issues.email = 'Enter a valid email address.';
    if (values.password.length < (registering ? 10 : 1)) issues.password = registering ? 'Use at least 10 characters.' : 'Enter your password.';
    if (new TextEncoder().encode(values.password).length > 72) issues.password = 'Use at most 72 UTF-8 bytes.';
    setErrors(issues);
    if (Object.keys(issues).length) { document.getElementById(Object.keys(issues)[0])?.focus(); return; }
    setSaving(true);
    try {
      await openAccount(registering ? 'register' : 'login', { email: values.email.trim(), password: values.password, ...(registering ? { name: values.name.trim() } : {}) });
    } catch (error) { setProblem(error.message); setErrors(error.fields || {}); }
    finally { setSaving(false); }
  }

  return <div className="account-page"><header className="account-header shell-width"><Link to="/login" aria-label="NextStep sign in"><Wordmark /></Link><span><LockKeyhole size={14} />A workspace that’s yours.</span></header><main className="account-layout"><section className="account-story"><p className="overline">YOUR NEXT CHAPTER. YOUR OWN SPACE.</p><h1>A job search<br />is personal.<br /><em>Your journal<br />should be too.</em></h1><p>Keep every possibility, conversation, and next step in a space only you can open.</p><ul><li><Check size={16} />Your applications, separate from everyone else’s.</li><li><Check size={16} />One clear timeline for every opportunity.</li><li><Check size={16} />Follow-ups that stay on your radar.</li></ul><div className="privacy-note"><span><FolderLock size={22} /></span><div><strong>Private by design.</strong><p>Signing in opens your journal—not a shared dashboard.</p></div></div></section><section className="account-paper"><div className="account-form-heading"><span className="account-lock"><ShieldCheck size={22} /></span><h2>{registering ? 'Make room for possibility.' : 'Welcome back.'}</h2><p>{registering ? 'Create an account for your own application journal.' : 'Sign in to pick up where you left off.'}</p></div><form noValidate onSubmit={submit}>
    {sessionMessage && <p className="session-message" role="status">{sessionMessage}</p>}
    {problem && <div className="problem-banner" role="alert">{problem}</div>}
    {registering && <FieldGroup name="name" title="Your name" error={errors.name}><input {...props('name')} maxLength={80} autoComplete="name" placeholder="Your full name" /></FieldGroup>}
    <FieldGroup name="email" title="Email address" error={errors.email}><input {...props('email')} type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></FieldGroup>
    <FieldGroup name="password" title="Password" error={errors.password} hint={registering ? 'At least 10 characters. Never reuse your database password.' : undefined}><div className="account-password"><input {...props('password')} type={visible ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} maxLength={72} placeholder={registering ? 'Create your password' : 'Enter your password'} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></FieldGroup>
    <button className="action-button account-submit" disabled={saving}>{saving && <LoaderCircle size={17} className="turning" />}{saving ? 'Please wait…' : registering ? 'Create my journal' : 'Sign in'}<ArrowRight size={17} /></button>
  </form><p className="account-switch">{registering ? 'Already have a journal?' : 'A new chapter?'} <Link to={registering ? '/login' : '/register'}>{registering ? 'Sign in' : 'Create an account'}</Link></p><div className="account-security"><LockKeyhole size={13} />Secure sign-in. Your own applications.</div></section></main><footer className="account-footer">NextStep · A little clarity for your next move.</footer></div>;
}
