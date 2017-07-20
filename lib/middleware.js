// ---------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const bole   = require('bole')
const pushid = require('pushid')
const auth   = require('basic-auth')

// ---------------------------------------------------------------------------------------------------------------------
// setup

const logger = bole('req')

// ---------------------------------------------------------------------------------------------------------------------
// middleware

function context(req, res, next) {
  req._ = req._ || {}
  next()
}

function rid(req, res, next) {
  req._.rid = pushid()
  next()
}

function log(req, res, next) {
  req._.log = logger(req._.rid)
  next()
}

function basicAuth(username, pass) {
  return (req, res, next) => {
    const credentials = auth(req)

    console.log('Checking credentials ...')

    // check the username and password match
    if ( !credentials || credentials.name !== username || credentials.pass !== pass ) {
      res.statusCode = 401
      res.setHeader('WWW-Authenticate', 'Basic realm="example"')
      res.end('Access denied')
      return
    }

    // all fine, move on to the next middleware
    next()
  }
}

function redirect(urls) {
  return (req, res, next) => {
    const url = req.originalUrl
    if ( urls[url] ) {
      res.redirect(302, urls[url])
      return
    }

    next()
  }
}

// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
  context,
  rid,
  log,
  basicAuth,
  redirect,
}

// ---------------------------------------------------------------------------------------------------------------------
