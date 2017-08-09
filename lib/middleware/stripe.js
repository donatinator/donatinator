// --------------------------------------------------------------------------------------------------------------------

"use strict"

// local
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
    if (err) next(err)

    console.log('stripe.plans.list - result.data:', result.data)

    // cache locally
    plans = result.data.sort((a, b) => a.amount > b.amount)

    // save to res.locals
    res.locals.plans = plans
    next()
  })
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  loadPlans,
  reloadPlans,
}

// --------------------------------------------------------------------------------------------------------------------
