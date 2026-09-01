import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import { connectToDatabase, getDb, DB_NAME } from './db.js'
import { setSessionCookie, clearSessionCookie, readSession, requireSession } from './auth.js'
import { mintSsoToken } from './ssoToken.js'
import { getToolBaseUrl } from './toolRegistry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8787
const DIST_DIR = path.join(__dirname, '..', 'dist')

app.use(express.json())
app.use(cookieParser())

// ---------------------------------------------------------------------
// Auth - checks the same `employees` collection the inventory app (and
// any future tool) uses, so an employee's one account works everywhere.
// This is the one deliberate exception to "each app owns its own data and
// exposes an API for it": a shared identity/permissions store is what
// every app is meant to trust, by design, not a shortcut around it.
// ---------------------------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body || {}
    if (!employeeId || !password) {
      return res.status(400).json({ message: 'Employee ID and password are required.' })
    }
    const employees = getDb().collection('employees')
    const employee = await employees.findOne({ employeeId })
    if (!employee) {
      return res.status(401).json({ message: 'Invalid Employee ID or password.' })
    }
    const match = await bcrypt.compare(password, employee.password)
    if (!match) {
      return res.status(401).json({ message: 'Invalid Employee ID or password.' })
    }
    const identity = { employeeId: employee.employeeId, name: employee.name }
    setSessionCookie(res, identity)
    res.json(identity)
  } catch (err) {
    res.status(500).json({ message: 'Server error while logging in.', error: err.message })
  }
})

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const employee = readSession(req)
  if (!employee) return res.status(401).json({ message: 'Not logged in.' })
  res.json(employee)
})

// Mints a one-time hand-off token for an SSO-enabled tool and hands back
// the URL to send the browser to. The tool itself verifies the token and
// turns it into its own session - the Hub never touches that app's cookie.
app.get('/api/sso/:toolId', requireSession, (req, res) => {
  const baseUrl = getToolBaseUrl(req.params.toolId)
  if (!baseUrl) {
    return res.status(404).json({ message: `No SSO-enabled tool registered as "${req.params.toolId}".` })
  }
  const token = mintSsoToken(req.employee, req.params.toolId)
  res.json({ redirectUrl: `${baseUrl}/sso?token=${encodeURIComponent(token)}` })
})

// Built React app - everything that isn't an API route above falls through
// to here. SPA fallback (serving index.html for any other GET) is future
// -proofing in case the Hub ever grows real client-side routes.
app.use(express.static(DIST_DIR))
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

connectToDatabase()
  .then(() => {
    console.log(`Connected to MongoDB database "${DB_NAME}"`)
    app.listen(PORT, () => {
      console.log(`AI Hub server running at http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message)
    console.error('Make sure MONGO_URI (and MONGO_DB_NAME) in .env are correct and reachable.')
    process.exit(1)
  })
