// --------------------------------------------------------------------------------------------------------------------

"use strict"

// --- General ---
let nodeEnv         = process.env.NODE_ENV
let apex            = process.env.APEX
let port            = process.env.PORT
let sessionKey      = process.env.SESSION_KEY

// --- Database ---
let databaseUrl     = process.env.DATABASE_URL

// --- Stripe ---
let stripePublicKey = process.env.STRIPE_PUBLIC_KEY
let stripeSecretKey = process.env.STRIPE_SECRET_KEY

// --- Admin ---
let username        = process.env.USERNAME
let password        = process.env.PASSWORD

// --- Delete everything but NODE_ENV ---
delete process.env.APEX
delete process.env.PORT
delete process.env.SESSION_KEY
delete process.env.DATABASE_URL
delete process.env.STRIPE_PUBLIC_KEY
delete process.env.STRIPE_SECRET_KEY
delete process.env.USERNAME
delete process.env.PASSWORD

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  // general
  nodeEnv,
  apex,
  port,
  sessionKey,
  // database
  databaseUrl,
  // stripe
  stripePublicKey,
  stripeSecretKey,
  // admin
  username,
  password,
}

// --------------------------------------------------------------------------------------------------------------------
