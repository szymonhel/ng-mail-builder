import { auth } from 'express-oauth2-jwt-bearer';

// Validates Auth0-issued access tokens (RS256, checked against the tenant JWKS).
// Requires AUTH0_DOMAIN and AUTH0_AUDIENCE in the environment.
export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256',
});
