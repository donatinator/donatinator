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

// local
const env    = require('../env.js')
const stripe = require('../stripe.js')

// --------------------------------------------------------------------------------------------------------------------

let plans

function loadPlans(req, res, next) {
  if ( !plans ) {
    return reloadPlans(req, res, next)
  }

  res.locals.plans = plans
  next()
}

function reloadPlans(req, res, next) {
  stripe.plans.list((err, result) => {
    if (err) {
      console.warn(err)
      return next(err)
    }

    // console.log('stripe.plans.list - result:', result)
    // console.log('stripe.plans.list - result.data:', result && result.data)

    // cache locally
    plans = result.data.sort((a, b) => a.amount > b.amount)

    // save to res.locals
    res.locals.plans = plans
    next()
  })
}

// From : https://stripe.com/docs/webhooks#verify-official-libraries
function webhook(req, res, next) {
  // check that this is a POST
  if ( req.method !== 'POST' ) {
    res.set('Allow', 'POST')
    res.send(405, 'Method Not Allowed')
    return
  }

  // get the signature
  let signature = req.headers["stripe-signature"]
  let event = stripe.webhooks.constructEvent(req.body, signature, env.stripeEndpointSecret)

  req._event = event

  next()
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  loadPlans,
  reloadPlans,
  webhook,
}

// --------------------------------------------------------------------------------------------------------------------
