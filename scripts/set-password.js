// Sets (or creates) an employees account that can use the Hub's manual
// employee-ID + password sign-in.
//
//   npm run set-password -- <employeeId> [password] [--name "Full Name"]
//
// Nothing in either app creates a password hash any more - Microsoft sign-in
// is the normal path - so this admin-run script is the only way to make an
// account usable with ALLOW_PASSWORD_LOGIN=true. Run it from the AI-Hub
// folder; it reads MONGO_URI / MONGO_DB_NAME from the same .env the server
// uses, and writes to the shared `employees` collection.
//
// Passing the password as an argument leaves it in your shell history; omit
// it and the script prompts instead.
import 'dotenv/config'
import readline from 'readline'
import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'

const BCRYPT_ROUNDS = 10

function parseArgs(argv) {
  const positional = []
  let name = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--name') {
      name = argv[++i] || null
    } else if (argv[i].startsWith('--name=')) {
      name = argv[i].slice('--name='.length)
    } else {
      positional.push(argv[i])
    }
  }
  return { employeeId: positional[0], password: positional[1], name }
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  const { employeeId, name } = parseArgs(process.argv.slice(2))
  let { password } = parseArgs(process.argv.slice(2))

  if (!employeeId) {
    console.error('Usage: npm run set-password -- <employeeId> [password] [--name "Full Name"]')
    process.exit(1)
  }
  if (!password) {
    password = await prompt(`Password for "${employeeId}": `)
  }
  if (!password || !password.trim()) {
    console.error('No password given - nothing was changed.')
    process.exit(1)
  }

  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set. Run this from the AI-Hub folder, with .env filled in.')
    process.exit(1)
  }

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(process.env.MONGO_DB_NAME || 'inventory')
    const employees = db.collection('employees')

    const existing = await employees.findOne({ employeeId })
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const now = new Date()

    if (existing) {
      await employees.updateOne({ employeeId }, { $set: { password: hash, updatedAt: now } })
      console.log(`Updated the password on existing account "${employeeId}".`)
    } else {
      await employees.insertOne({
        employeeId,
        name: name || employeeId,
        password: hash,
        createdAt: now,
        updatedAt: now,
      })
      console.log(`Created account "${employeeId}" (name: "${name || employeeId}") with that password.`)
    }

    console.log('')
    console.log('This account can sign in at the Hub ONLY while ALLOW_PASSWORD_LOGIN=true.')
    console.log('To remove its password later (and with it, manual access):')
    console.log(`  db.employees.updateOne({ employeeId: "${employeeId}" }, { $unset: { password: "" } })`)
  } finally {
    await client.close()
  }
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
