export function requirePrivateDatabase(uri) {
  let parsed;
  try { parsed = new URL(uri); } catch { throw new Error('Set a valid private MongoDB Atlas URI in MONGODB_URI.'); }
  if (parsed.protocol !== 'mongodb+srv:' || !parsed.pathname || parsed.pathname === '/') {
    throw new Error('MONGODB_URI must be an Atlas URI including a private database name such as /nextstep_private.');
  }
  const database = decodeURIComponent(parsed.pathname).replace(/\/+$/, '').toLowerCase();
  if (decodeURIComponent(parsed.username).toLowerCase() === 'mernuser' || database === '/mernfinal_exam') {
    throw new Error('The public exam database/account cannot protect private journals. Set MONGODB_URI to a new private database user and database, for example /nextstep_private.');
  }
}
