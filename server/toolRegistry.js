// Which tools the Hub knows how to talk to, where they live, and what each
// one can do. Base URLs come from env vars (not tools.js) because they
// differ between local dev and the deployed Render URL, and shouldn't be
// baked into the built frontend bundle.
//
// `notifications: true` means that tool implements the contract documented
// in the README: GET /api/notifications and POST /api/notifications/dismiss,
// authenticated with a Hub-minted bearer token whose audience is
// `<toolId>-api`. Adding a tool here is all that's needed for its
// notifications to start appearing in the Hub's bar - there is no
// per-tool code anywhere in the aggregator.
const TOOLS = {
  inventory: {
    name: 'Inventory Manager',
    baseUrl: process.env.INVENTORY_URL,
    notifications: true,
  },
}

export function getToolBaseUrl(toolId) {
  const tool = TOOLS[toolId]
  return (tool && tool.baseUrl) || null
}

// Every configured tool base URL, in a fixed order - used to build the
// logout redirect chain (see /api/auth/logout-chain in index.js). Add a
// tool here and it's automatically included in that chain, as long as it
// implements the same GET /logout?returnTo=... contract Inventory does
// (clear its own cookie, validate returnTo, redirect).
export function getAllToolBaseUrls() {
  return Object.values(TOOLS)
    .map((tool) => tool.baseUrl)
    .filter(Boolean)
}

// Configured tools that publish notifications. Anything missing a base URL
// is skipped rather than reported as broken - an unset INVENTORY_URL means
// "not deployed yet", not "failing".
export function getNotificationTools() {
  return Object.entries(TOOLS)
    .filter(([, tool]) => tool.notifications && tool.baseUrl)
    .map(([id, tool]) => ({ id, name: tool.name || id, baseUrl: tool.baseUrl }))
}

export function isNotificationTool(toolId) {
  return getNotificationTools().some((tool) => tool.id === toolId)
}
