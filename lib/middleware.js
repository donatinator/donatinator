// --------------------------------------------------------------------------------------------------------------------
//
//  The Donatinator - A secure way to accept Single/Recurring Donations.
//  Copyright (C) 2017 Andrew Chilton <andychilton@gmail.com> (https://chilts.org)
//
// --------------------------------------------------------------------------------------------------------------------
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU Affero General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// ---------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const zid  = require('zid')
const auth = require('basic-auth')

// local
const api = require('./api.js')
const env = require('./env.js')

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

  // store into locals so we can use it in the views
  res.locals.user = req.session.user

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

// --- config ---

let configIsOkay
function checkConfig(req, res, next) {
  // we are going to check for the following environment variables are set:
  // * stripePublicKey
  // * stripeSecretKey
  // * stripeEndpointSecret
  // * databaseUrl

  // since we're going to cache whether the config is okay, we need to check it first
  if ( typeof configIsOkay !== 'undefined' ) {
    // we've already figured out if the config *is* okay or not
    if ( configIsOkay ) {
      return next()
    }

    // there is something wrong with the config, so just show a small help page
    res.render('setup')
    return
  }

  // check each of these env vars
  const names = [ 'stripePublicKey', 'stripeSecretKey', 'stripeEndpointSecret', 'databaseUrl' ]
  names.forEach(name => {
    // if this env var doesn't exist, then the config is not complete
    if ( !env[name] ) {
      configIsOkay = false
    }
  })

  // finally, check if the config was incorrect
  if ( configIsOkay === false ) {
    res.render('setup')
    return
  }

  // looks like the config is okay
  configIsOkay = true
  next()
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
    if (err) {
      console.warn(err)
      return next(err)
    }

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

// --- gifts ---

let gifts

// we cache the settings locally, so the vast majority of time we just set res.locals.settings here
function loadGifts(req, res, next) {
  console.log('loadGifts()')
  // if we already have the gifts loaded
  if ( gifts ) {
    res.locals.gifts = gifts
    return next()
  }

  // no gifts yet, so (force) reload them
  reloadGifts(req, res, next)
}

function reloadGifts(req, res, next) {
  console.log('reloadGifts()')
  // we don't check if gifts are already loaded here, just reload them from the db
  api.selGiftsAll((err, result) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

    // remember in the cache, and store for this request
    gifts = result
    res.locals.gifts = result

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
  // config
  checkConfig,
  // settings
  loadSettings,
  reloadSettings,
  // gifts
  loadGifts,
  reloadGifts,
}

// ---------------------------------------------------------------------------------------------------------------------
