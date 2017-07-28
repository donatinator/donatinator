// ---------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const zid  = require('zid')
const auth = require('basic-auth')

// local
const api = require('./api.js')

// ---------------------------------------------------------------------------------------------------------------------
// middleware

function context(req, res, next) {
  req._ = req._ || {}
  next()
}

function rid(req, res, next) {
  req._.rid = Date.now() + '-' + zid(13)
  next()
}

// Now superceded with using username/password using bcrypt, and proper sessions.
function basicAuth(username, pass) {
  return (req, res, next) => {
    const credentials = auth(req)

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

function ensureUser(req, res, next) {
  if ( !req.session.user ) {
    res.redirect(302, '/sign-in')
    return
  }

  next()
}

function ensureNoUser(req, res, next) {
  if ( req.session.user ) {
    return res.redirect(302, '/admin/')
  }

  next()
}

function setTitle(text) {
  return (req, res, next) => {
    res.locals.title = 'Admin'
    next()
  }
}

// --- settings ---

let settings

// we cache the settings locally, so the vast majority of time we just set res.locals.settings here
function loadSettings(req, res, next) {
  // if we already have settings
  if ( settings ) {
    res.locals.settings = settings
    return next()
  }

  // no settings yet, so (force) reload them
  reloadSettings(req, res, next)
}

function reloadSettings(req, res, next) {
  // we don't check if settings are already loaded here, just reload them from the db
  api.selSettings((err, current) => {
    if (err) return next(err)

    // settings loaded fine, so turn them into an obj with name/value pairs
    let newSettings = {}
    for( let name in current ) {
      newSettings[name] = current[name].value
    }

    // remember in the cache, and store for this request
    settings = newSettings
    res.locals.settings = newSettings

    next()
  })
}

// ---------------------------------------------------------------------------------------------------------------------

module.exports = {
  context,
  rid,
  basicAuth,
  redirect,
  ensureUser,
  ensureNoUser,
  setTitle,
  loadSettings,
  reloadSettings,
}

// ---------------------------------------------------------------------------------------------------------------------
