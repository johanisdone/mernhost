import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { register, login, logout, me } from '../controllers/accounts.js';
import { wrap } from '../middleware/responses.js';
import { requireAccount } from '../middleware/sessions.js';

export function accountRoutes() {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 30,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: 'Too many account attempts. Try again in 15 minutes.', data: null }
  });
  router.post('/register', limiter, wrap(register));
  router.post('/login', limiter, wrap(login));
  router.post('/logout', wrap(logout));
  router.get('/me', requireAccount, me);
  return router;
}
