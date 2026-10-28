import { createHash, randomBytes } from 'node:crypto';
import { Account, LoginSession } from '../models/Account.js';
import { RequestProblem, wrap } from './responses.js';

export const SESSION_COOKIE = 'nextstep_session';
const sessionLifetime = 8 * 60 * 60 * 1000;
export const tokenDigest = token => createHash('sha256').update(token).digest('hex');

export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: sessionLifetime };
}

export async function beginSession(req, res, account) {
  const token = randomBytes(32).toString('hex');
  await LoginSession.create({ _id: tokenDigest(token), account: account._id, expiresAt: new Date(Date.now() + sessionLifetime) });
  // Rotate any existing browser session on a successful login or registration.
  const previous = req.cookies[SESSION_COOKIE];
  if (typeof previous === 'string' && /^[a-f\d]{64}$/.test(previous)) await LoginSession.deleteOne({ _id: tokenDigest(previous) });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export const requireAccount = wrap(async (req, res, next) => {
  const token = req.cookies[SESSION_COOKIE];
  if (typeof token !== 'string' || !/^[a-f\d]{64}$/.test(token)) throw new RequestProblem(401, 'Please sign in to open your journal.');
  const session = await LoginSession.findOne({ _id: tokenDigest(token), expiresAt: { $gt: new Date() } });
  if (!session) throw new RequestProblem(401, 'Your session has ended. Please sign in again.');
  const account = await Account.findById(session.account);
  if (!account) throw new RequestProblem(401, 'Your account session is no longer available.');
  req.account = account;
  next();
});
