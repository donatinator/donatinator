// --------------------------------------------------------------------------------------------------------------------

"use strict"

// core
const http = require('http')

// npm
const bole = require('bole')

// local
const app = require('./lib/app.js')

// --------------------------------------------------------------------------------------------------------------------
// setup

bole.output({
  level  : 'info',
  stream : process.stderr,
})

const log = bole('server')

// check some env vars are set
if ( !process.env.STRIPE_PUBLIC_KEY ) {
  throw new Error("Required: environment variable STRIPE_PUBLIC_KEY (your publishable key) must be set")
}

// --------------------------------------------------------------------------------------------------------------------
// server

const server = http.createServer()
server.on('request', app)

const port = process.env.PORT || '3000'
server.listen(port, () => {
  log.info('Listening on port %s', port)
})

// --------------------------------------------------------------------------------------------------------------------
