/* ============================================================================
 * ITEMHOUND AI Hub - LINK CONFIGURATION
 * ----------------------------------------------------------------------------
 * This is the ONLY file you need to edit to add, change or remove a tool.
 * Save the file and the page reloads by itself while `npm run dev` is running.
 *
 * HOW TO ADD A TOOL
 *   1. Copy one of the entries in the TOOLS list below.
 *   2. Give it a unique `id` (lowercase, dashes, no spaces).
 *   3. Set `team` to one of the team ids listed in TEAMS.
 *   4. Paste the real address into `url`.
 *   5. Delete the `placeholder: true` line once it points at a real tool.
 *
 * FIELDS
 *   id           required  unique key, also used to remember favorites
 *   name         required  what the tile shows
 *   url          required  full address, e.g. "https://tools.itemhound.com/x"
 *                          internal file shares work too: "file:///..." or
 *                          "\\\\server\\share\\tool.xlsx"
 *   team         required  team id from TEAMS below
 *   description  optional  one short line - what it does
 *   owner        optional  who maintains it, shown on the tile
 *   status       optional  "live" | "beta" | "planned"   (defaults to "live")
 *   tags         optional  extra words that search should match
 *   placeholder  optional  true = shows a "sample entry" marker, replace it
 * ==========================================================================*/

export const SITE = {
  title: 'AI Hub',
  tagline: 'Every internal tool our teams have built, in one place.',
  footerNote: 'Maintained by ITEMHOUND. To list a tool here, edit src/config/tools.js or contact the hub owner.',
}

/* Team order below is the order they appear in the filter bar and the page. */
export const TEAMS = [
  { id: 'finance',       name: 'Finance',         blurb: 'Budgeting, payments and financial reporting tools.' },
  { id: 'accounting',    name: 'Accounting',      blurb: 'Books, reconciliation and audit support tools.' },
  { id: 'bib-production',name: 'Bib Production',  blurb: 'Bib layout, personalization and print-prep tools.' },
  { id: 'admin',         name: 'Admin',           blurb: 'Office, procurement and general administration tools.' },
  { id: 'hr',            name: 'Human Resources', blurb: 'Hiring, records and people operations tools.' },
  { id: 'kit-claiming',  name: 'Kit Claiming',    blurb: 'Claiming day lists, verification and release tools.' },
  { id: 'timing',        name: 'Timing',          blurb: 'Race timing, splits and results processing tools.' },
  { id: 'entractiv',     name: 'Entractiv',       blurb: 'Tools built by and for the Entractiv team.' },
  { id: 'fulfillment',   name: 'Fulfillment',     blurb: 'Inventory, packing and delivery tracking tools.' },
]

/* --------------------------------------------------------------------------
 * SAMPLE ENTRIES - replace these with your real tools.
 * Every entry below is marked `placeholder: true` so they are easy to spot.
 * ------------------------------------------------------------------------*/
export const TOOLS = [
  // ---------------------------------------------------------------- Finance
  {
    id: 'finance-budget-tracker',
    name: 'Budget Tracker',
    url: 'https://example.com/replace-me',
    team: 'finance',
    description: 'Sample entry - running budget vs. actuals per event.',
    owner: 'Finance Team',
    status: 'live',
    tags: ['budget', 'spend'],
    placeholder: true,
  },
  {
    id: 'finance-payment-request',
    name: 'Payment Request Form',
    url: 'https://example.com/replace-me',
    team: 'finance',
    description: 'Sample entry - submit and track supplier payment requests.',
    owner: 'Finance Team',
    status: 'live',
    placeholder: true,
  },

  // ------------------------------------------------------------- Accounting
  {
    id: 'accounting-reconciliation',
    name: 'Reconciliation Helper',
    url: 'https://example.com/replace-me',
    team: 'accounting',
    description: 'Sample entry - matches bank lines against recorded entries.',
    owner: 'Accounting Team',
    status: 'live',
    placeholder: true,
  },
  {
    id: 'accounting-or-generator',
    name: 'Official Receipt Generator',
    url: 'https://example.com/replace-me',
    team: 'accounting',
    description: 'Sample entry - generates receipts from a transaction list.',
    owner: 'Accounting Team',
    status: 'beta',
    placeholder: true,
  },

  // --------------------------------------------------------- Bib Production
  {
    id: 'bib-name-checker',
    name: 'Bib Name Checker',
    url: 'https://example.com/replace-me',
    team: 'bib-production',
    description: 'Sample entry - flags encoding and length issues in bib names.',
    owner: 'Bib Production Team',
    status: 'live',
    tags: ['proof', 'print'],
    placeholder: true,
  },
  {
    id: 'bib-number-allocator',
    name: 'Bib Number Allocator',
    url: 'https://example.com/replace-me',
    team: 'bib-production',
    description: 'Sample entry - assigns number ranges per race category.',
    owner: 'Bib Production Team',
    status: 'live',
    placeholder: true,
  },

  // ------------------------------------------------------------------ Admin
  {
    id: 'admin-inventory-manager',
    name: 'Inventory Manager',
    url: 'https://inventory-management-atyc.onrender.com',
    team: 'admin',
    description: 'Borrow, Reserve & Return Company Equipment.',
    owner: 'Admin Team',
    status: 'live',
    // Signs the employee straight in via the Hub's own session instead of
    // showing this app's login screen - see ToolCard.jsx and
    // server/toolRegistry.js. This id ('inventory') must match the key
    // used in both places, and INVENTORY_URL (the Hub's own env var) must
    // point at the url above.
    sso: 'inventory',
  },
  {
    id: 'admin-vehicle-booking',
    name: 'Vehicle Booking',
    url: 'https://example.com/replace-me',
    team: 'admin',
    description: 'Sample entry - reserve company vehicles for event days.',
    owner: 'Admin Team',
    status: 'planned',
    placeholder: true,
  },

  // -------------------------------------------------------- Human Resources
  {
    id: 'hr-leave-tracker',
    name: 'Leave Tracker',
    url: 'https://example.com/replace-me',
    team: 'hr',
    description: 'Sample entry - leave balances and filed requests.',
    owner: 'HR Team',
    status: 'live',
    placeholder: true,
  },
  {
    id: 'hr-applicant-tracker',
    name: 'Applicant Tracker',
    url: 'https://example.com/replace-me',
    team: 'hr',
    description: 'Sample entry - pipeline of candidates per open role.',
    owner: 'HR Team',
    status: 'beta',
    placeholder: true,
  },

  // ----------------------------------------------------------- Kit Claiming
  {
    id: 'kit-claiming-lookup',
    name: 'Claiming Lookup',
    url: 'https://example.com/replace-me',
    team: 'kit-claiming',
    description: 'Sample entry - search a runner and confirm kit release.',
    owner: 'Kit Claiming Team',
    status: 'live',
    tags: ['runner', 'release'],
    placeholder: true,
  },
  {
    id: 'kit-claiming-queue',
    name: 'Queue Monitor',
    url: 'https://example.com/replace-me',
    team: 'kit-claiming',
    description: 'Sample entry - live view of claiming counters and volume.',
    owner: 'Kit Claiming Team',
    status: 'planned',
    placeholder: true,
  },

  // ----------------------------------------------------------------- Timing
  {
    id: 'timing-results-processor',
    name: 'Results Processor',
    url: 'https://example.com/replace-me',
    team: 'timing',
    description: 'Sample entry - cleans raw reads and produces final results.',
    owner: 'Timing Team',
    status: 'live',
    tags: ['splits', 'results'],
    placeholder: true,
  },
  {
    id: 'timing-mat-planner',
    name: 'Mat Placement Planner',
    url: 'https://example.com/replace-me',
    team: 'timing',
    description: 'Sample entry - plots timing mats against the route map.',
    owner: 'Timing Team',
    status: 'beta',
    placeholder: true,
  },

  // -------------------------------------------------------------- Entractiv
  {
    id: 'entractiv-lineup-maker',
    name: 'Marshal Lineup Maker',
    url: 'https://lineup-generator-3sem.onrender.com/index.html',
    team: 'entractiv',
    description: 'Tool for creating marshal lineups.',
    owner: 'Entractiv Team',
    status: 'live',
    placeholder: true,
  },
  {
    id: 'entractiv-asset-prep',
    name: 'Asset Prep Tool',
    url: 'https://example.com/replace-me',
    team: 'entractiv',
    description: 'Sample entry - resizes event artwork for the reg page.',
    owner: 'Entractiv Team',
    status: 'live',
    placeholder: true,
  },

  // ------------------------------------------------------------ Fulfillment
  {
    id: 'fulfillment-inventory',
    name: 'Inventory Count',
    url: 'https://example.com/replace-me',
    team: 'fulfillment',
    description: 'Sample entry - stock on hand per item and warehouse.',
    owner: 'Fulfillment Team',
    status: 'live',
    placeholder: true,
  },
  {
    id: 'fulfillment-shipment-tracker',
    name: 'Shipment Tracker',
    url: 'https://example.com/replace-me',
    team: 'fulfillment',
    description: 'Sample entry - outbound deliveries and their status.',
    owner: 'Fulfillment Team',
    status: 'live',
    placeholder: true,
  },
]
