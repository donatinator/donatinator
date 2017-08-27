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
// --------------------------------------------------------------------------------------------------------------------

"use strict"

// --- General ---
let nodeEnv              = process.env.NODE_ENV
let apex                 = process.env.APEX
let port                 = process.env.PORT
let sessionKey           = process.env.SESSION_KEY

// --- Database ---
let databaseUrl          = process.env.DATABASE_URL

// --- Stripe ---
let stripePublicKey      = process.env.STRIPE_PUBLIC_KEY
let stripeSecretKey      = process.env.STRIPE_SECRET_KEY
let stripeEndpointSecret = process.env.STRIPE_ENDPOINT_SECRET

// --- Admin ---
let username             = process.env.USERNAME
let password             = process.env.PASSWORD

// --- Delete everything but NODE_ENV ---
delete process.env.APEX
delete process.env.PORT
delete process.env.SESSION_KEY
delete process.env.DATABASE_URL
delete process.env.STRIPE_PUBLIC_KEY
delete process.env.STRIPE_SECRET_KEY
delete process.env.STRIPE_ENDPOINT_SECRET
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
  stripeEndpointSecret,
  // admin
  username,
  password,
}

// --------------------------------------------------------------------------------------------------------------------
