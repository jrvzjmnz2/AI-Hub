// Which tool ids support single sign-on, and where each one lives. Base
// URLs come from env vars (not tools.js) because they differ between local
// dev and the deployed Render URL, and shouldn't be baked into the built
// frontend bundle.
const TOOL_BASE_URLS = {
  inventory: process.env.INVENTORY_URL,
}

export function getToolBaseUrl(toolId) {
  return TOOL_BASE_URLS[toolId] || null
}

// Every configured tool base URL, in a fixed order - used to build the
// logout redirect chain (see /api/auth/logout-chain in index.js). Add a
// tool here (by adding it above) and it's automatically included in that
// chain, as long as it implements the same GET /logout?returnTo=... contract
// Inventory does (clear its own cookie, then redirect to returnTo - but only
// if returnTo starts with a URL that tool actually trusts).
export function getAllToolBaseUrls() {
  return Object.values(TOOL_BASE_URLS).filter(Boolean)
}
