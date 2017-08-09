// --------------------------------------------------------------------------------------------------------------------
//
// The Stripe Client is used as a singleton throughout the app, so instead of having to create it in all modules that
// need it, we put the config and creation here so other modules can just require this and use it straight away.
//
// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const stripe = require("stripe")

// local
const env = require('./env.js')

// --------------------------------------------------------------------------------------------------------------------

module.exports = stripe(env.stripeSecretKey)

// --------------------------------------------------------------------------------------------------------------------
