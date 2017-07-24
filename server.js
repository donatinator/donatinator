// --------------------------------------------------------------------------------------------------------------------

"use strict"

// core
const http = require('http')
const path = require('path')

// npm
const bole      = require('bole')
const pg        = require('pg')
const pgpatcher = require('pg-patcher')

// local
const app = require('./lib/app.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

console.log('Starting Donatinator ...')

// logging
bole.output({
  level  : 'info',
  stream : process.stderr,
})

const log = bole('server')

// database
const databasePatchLevel = 3

// check some env vars are set
if ( !process.env.STRIPE_PUBLIC_KEY ) {
  throw new Error("Required: environment variable STRIPE_PUBLIC_KEY (your publishable key) must be set")
}

if ( !process.env.DATABASE_URL ) {
  throw new Error("Required: environment variable DATABASE_URL must be provided")
}

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
  connectionString : process.env.DATABASE_URL,
})
client.connect()

console.log('Checking/patching database to level %d ...', databasePatchLevel)
const opts = {
  dir : path.join(__dirname, 'schema'),
  // prefix : ,
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

  const port = process.env.PORT || '3000'
  server.listen(port, () => {
    console.log('Listening on port %s', port)
  })
})

// --------------------------------------------------------------------------------------------------------------------
