import bcrypt from 'bcryptjs';
import { Account, LoginSession, publicAccount } from '../models/Account.js';
import { answer, RequestProblem } from '../middleware/responses.js';
import { checkBody } from '../middleware/applicationInput.js';
import { beginSession, SESSION_COOKIE, sessionCookieOptions, tokenDigest } from '../middleware/sessions.js';

function credentials(body, registering = false) {
  checkBody(body, registering ? ['name', 'email', 'password'] : ['email', 'password']);
  const errors = {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  const password = body.password;
  if (typeof password !== 'string' || password.length < (registering ? 10 : 1) || Buffer.byteLength(password || '', 'utf8') > 72) {
    errors.password = registering ? 'Use at least 10 characters and at most 72 UTF-8 bytes.' : 'Enter a password of at most 72 UTF-8 bytes.';
  }
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (registering && (name.length < 2 || name.length > 80)) errors.name = 'Enter your name using 2–80 characters.';
  if (Object.keys(errors).length) throw new RequestProblem(400, 'Please check your account details.', { errors });
  return { name, email, password };
}

export async function register(req, res) {
  const { name, email, password } = credentials(req.body, true);
  if (await Account.exists({ email })) throw new RequestProblem(409, 'An account with this email already exists. Please sign in.');
  const account = await Account.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  await beginSession(req, res, account);
  answer(res, 201, 'Your private journal is ready.', publicAccount(account));
}

export async function login(req, res) {
  const { email, password } = credentials(req.body);
  const account = await Account.findOne({ email }).select('+passwordHash');
  const hash = account?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
  const matches = await bcrypt.compare(password, hash);
  if (!account || !matches) throw new RequestProblem(401, 'Email or password is incorrect.');
  await beginSession(req, res, account);
  answer(res, 200, 'Welcome back to your journal.', publicAccount(account));
}

export async function logout(req, res) {
  const token = req.cookies[SESSION_COOKIE];
  if (typeof token === 'string' && /^[a-f\d]{64}$/.test(token)) await LoginSession.deleteOne({ _id: tokenDigest(token) });
  const { maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
  answer(res, 200, 'You are signed out.', null);
}

export function me(req, res) {
  answer(res, 200, 'Account session retrieved.', publicAccount(req.account));
}
