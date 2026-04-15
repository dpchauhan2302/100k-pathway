// Vercel serverless entry point — wraps the Express app so that all API
// routes defined in api/_lib/server.js are reachable from a single
// serverless function.
//
// Vercel routes files under api/ using their path automatically.
// Specific files (api/submit-form.js, api/contact.js, etc.) handle their
// own routes.  Every other /api/* request is rewritten here via vercel.json:
//
//   { "source": "/api/(.*)", "destination": "/api/app" }
//
// Because Vercel's file-system routing takes priority over rewrites, the
// specific handlers are still invoked for their respective paths.
//
// server.js calls app.listen() only when run directly (require.main === module),
// so importing it here is safe — no port is opened in the serverless context.
module.exports = require('./_lib/server');
