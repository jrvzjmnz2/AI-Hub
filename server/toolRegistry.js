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
