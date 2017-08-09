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
