// --------------------------------------------------------------------------------------------------------------------

"use strict"

// Read our secrets from `process.env` right here, prior to loading up anything from core, npm, or locally and then
// scrub them from `process.env`.
//
// Why?
//
// If we don't, then any file deep within the `node_modules` folder can look for things like
// `process.env.STRIPE_PRIVATE_KEY` and `process.env.STRIPE_PUBLIC_KEY` and perhaps do nefarious things with them.
const env       = require('./lib/env.js')

// core
const http      = require('http')
const path      = require('path')

// npm
const pg        = require('pg')
const pgpatcher = require('pg-patcher')

// local
const app       = require('./lib/app.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

console.log('Starting Donatinator ...')

// database
const databasePatchLevel = 6

// check some env vars are set
if ( !env.stripePublicKey ) {
  throw new Error("Required: environment variable STRIPE_PUBLIC_KEY (your publishable key) must be set")
}

if ( !env.databaseUrl ) {
  throw new Error("Required: environment variable DATABASE_URL must be provided")
}

console.log('Env Vars look okay')

// --------------------------------------------------------------------------------------------------------------------
// main

// Starting up the server requires us to:
//
// 1. check we can connect to a database
// 2. check the current patch level
// 3. patch to the version we require for this release
//
// If any of these steps fail, we can't start the server and someone has manually intervene to fix it.

// just get a client, no need for a pool here
const client = new pg.Client({
  connectionString : env.databaseUrl,
})
client.connect()

console.log('Checking/patching database to level %d ...', databasePatchLevel)
const opts = {
  dir    : path.join(__dirname, 'schema'),
  logger : console.log.bind(console),
}
pgpatcher(client, databasePatchLevel, opts, (err) => {
  if ( err ) {
    console.warn(err)
    return process.exit(2)
  }

  // database patched correctly
  client.end()

  // create and start the server
  console.log('Starting server ...')
  const server = http.createServer()
  server.on('request', app)

  const port = env.port || '3000'
  server.listen(port, () => {
    console.log('Listening on port %s', port)
  })
})

// --------------------------------------------------------------------------------------------------------------------
