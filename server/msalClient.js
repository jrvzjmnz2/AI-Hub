// Confidential-client MSAL setup for "Sign in with Microsoft". The app
// registration itself should be restricted to the itemhound.com tenant only
// (single-tenant, not "any org" or "personal accounts") - the authority URL
// below names that exact tenant rather than the generic /common endpoint,
// so Microsoft itself refuses tokens for any other tenant. The email-domain
// check in index.js is a second, independent layer on top of that (in case
// the tenant ever adds a guest user from another domain).
import { ConfidentialClientApplication } from '@azure/msal-node'

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET

if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
  console.warn(
    'AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET is not set - ' +
      'Microsoft sign-in will not work. See README for the app-registration steps.'
  )
}

export const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: AZURE_CLIENT_ID,
    // Naming the tenant explicitly (not /common or /organizations) means
    // Microsoft itself rejects sign-in attempts from any other tenant,
    // before this app ever sees a token.
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID || 'common'}`,
    clientSecret: AZURE_CLIENT_SECRET,
  },
})

// openid/profile/email are the standard OIDC claims we need (name, email);
// User.Read is Microsoft Graph's own baseline delegated permission and is
// granted by default on every app registration, so asking for it here
// doesn't require any extra admin consent step.
export const MSAL_SCOPES = ['openid', 'profile', 'email', 'User.Read']
