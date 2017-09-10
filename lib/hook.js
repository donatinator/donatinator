// --------------------------------------------------------------------------------------------------------------------

"use strict"

// npm
const pgtrans = require('pgtrans')

// local
const api = require('./api.js')
const db  = require('./db.js')

// --------------------------------------------------------------------------------------------------------------------

function processStripeHook(poolOrClientOrNull, event, callback) {
  console.log('processStripeHook()')

  // create a function to use whichever way we go through this function
  function process(client, done) {
    console.log('process()')

    // firstly, insert it into the db
    api.insEventStripe(client, event, (err) => {
      if (err) return done(err)
      console.log('process() - event inserted')

      // now let's process it (if we choose to)

      if ( event.type === 'customer.created' ) {
        return processCustomerCreated(client, event, done)
      }

      if( event.type === 'customer.updated' ) {
        return processCustomerUpdated(client, event, done)
      }

      // not processing this event type
      done()
    })
  }

  // If we already have a `poolOrClientOrNull`, then we just execute what we need and don't BEGIN or COMMIT a transaction.
  if ( poolOrClientOrNull ) {
    console.log('processStripeHook() - already have a pool or client, therefore just execute the process()')
    // process this event
    process(poolOrClientOrNull, callback)
    return
  }

  // do the `process` inside a transaction (pass `db.pool` so `pgtrans` can get a `client`)
  pgtrans(db.pool, process, callback)
}

// internal functions

function processCustomerCreated(client, event, callback) {
  console.log('processCustomerCreated()')

  api.getAccountUsingEmail(client, event.data.object.email, (err, account) => {
    console.log('processCustomerCreated() - err:', err)
    console.log('processCustomerCreated() - account:', account)

    // if account, then we can skip the rest
    if ( account ) {
      return callback()
    }

    // no account, so let's insert one
    api.insAccount(client, event.data.object.email, '', '', event.data.object.id, callback)
  })
}

function processCustomerUpdated(client, event, callback) {
  console.log('processCustomerUpdated()')

  // ToDo: figure out if anything has changed for this customer, though, to be honest we probably don't store anything
  // that we *do* need to update!
  //
  // Instead, just insert an account if needed.
  api.getAccountUsingEmail(client, event.data.object.email, (err, account) => {
    console.log('processCustomerUpdated() - err:', err)
    console.log('processCustomerUpdated() - account:', account)

    // if account, then we can skip the rest
    if ( account ) {
      return callback()
    }

    // no account, let's insert one
    api.insAccount(client, event.data.object.email, '', '', event.data.object.id, callback)
  })
}

// --------------------------------------------------------------------------------------------------------------------

module.exports = {
  processStripeHook,
}

// --------------------------------------------------------------------------------------------------------------------
