// Confidential-client MSAL setup for "Sign in with Microsoft".
//
// Everything here is optional and lazy on purpose. MSAL's
// ConfidentialClientApplication constructor THROWS (invalid_client_credential)
// when the client id/secret are missing, so building it at module load meant
// the whole server died on import - and therefore wouldn't boot at all, let
// alone serve anything, until an Azure app registration existed. The app now
// starts fine without one; Microsoft sign-in simply reports itself as
// unavailable and the login screen offers whatever else is switched on.
import { ConfidentialClientApplication } from '@azure/msal-node'

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET
const AZURE_REDIRECT_URI = process.env.AZURE_REDIRECT_URI

// All four are needed for the flow to work at all - the redirect URI just as
// much as the credentials, since MSAL won't build an auth URL without it.
export function isMicrosoftConfigured() {
  return Boolean(AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET && AZURE_REDIRECT_URI)
}

let client = null
let constructionFailed = false

// Returns the MSAL client, or null if Microsoft sign-in isn't usable. Never
// throws: callers treat null as "this sign-in method is unavailable".
export function getMsalClient() {
  if (!isMicrosoftConfigured() || constructionFailed) return null
  if (client) return client
  try {
    client = new ConfidentialClientApplication({
      auth: {
        clientId: AZURE_CLIENT_ID,
        // Naming the tenant explicitly (not /common or /organizations) means
        // Microsoft itself rejects sign-in attempts from any other tenant,
        // before this app ever sees a token.
        authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
        clientSecret: AZURE_CLIENT_SECRET,
      },
    })
    return client
  } catch (err) {
    // Configured but rejected - e.g. a malformed client id. Remember the
    // failure so every later request doesn't retry (and re-log) it.
    constructionFailed = true
    console.error('Microsoft sign-in is configured but MSAL rejected the values:', err.message)
    return null
  }
}

// openid/profile/email are the standard OIDC claims we need (name, email);
// User.Read is Microsoft Graph's own baseline delegated permission and is
// granted by default on every app registration, so asking for it here
// doesn't require any extra admin consent step.
export const MSAL_SCOPES = ['openid', 'profile', 'email', 'User.Read']
