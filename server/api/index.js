// Vercel serverless function entry: re-exports the Express app from server/index.js.
// Every HTTP request (after server/vercel.json rewrites everything here) is handed
// to the Express app, which routes it through the normal middleware + /api/* routes.
export { default } from '../index.js';
