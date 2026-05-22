/**
 * Netlify Function: api
 *
 * Wraps the Express app with serverless-http so every request to /api/*
 * is handled by the same Express routes used on Replit.
 *
 * Netlify redirects /api/* → /.netlify/functions/api (see netlify.toml).
 * serverless-http maps the Netlify event/context to a standard Node.js
 * req/res pair that Express understands.
 */
import serverless from "serverless-http";
import app from "../../artifacts/api-server/src/app";

export const handler = serverless(app);
